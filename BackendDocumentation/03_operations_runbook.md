# 03. Operations & Deployment Runbook

## The Unified Worker
To simplify orchestration, avoid multiple failing cron-jobs, and manage concurrency efficiently, LaventeCare Auth runs all background processes via a single compiled Go binary: `cmd/worker`.

### Sub-processes Managed (6 Total):
1.  **Email Gateway**: Polls `email_outbox` to batch-dispatch emails via tenant-specific SMTP configurations.
2.  **IMAP Janitor**: Reaches out to tenant IMAP servers, scraping incoming replies on predefined tickets and dropping them into `email_inbox`.
3.  **Janitor**: Deletes unverified `users` after 24h, flushes expired `refresh_tokens`, `verification_tokens` and temporary records.
4.  **Social Scheduler**: Fetches drafted `social_posts` aligned with active `social_campaigns`. Generates LLM copy based on set personas/archetypes, tracks budget against rate limits, and queues approved drafts for posting on X.
5.  **Analytics Maintenance**: Month-to-month auto-provisioner. Evaluates `analytics_events` timestamps and provisions new inherited partitions for PostgreSQL ahead of time. Detaches records older than 12 months.
6.  **Blog Scheduler** (`internal/workers/blog`): Polls every 5 minutes. Automatically promotes blog posts with `status = 'scheduled'` to `'published'` when their `scheduled_for` timestamp is reached. Operates via a low-level RLS-bypass transaction to act across all tenants simultaneously.

*(Note: If a process panics, an isolated panic-handler traps the crash, sends error details to Sentry, but keeps the remaining sub-routines running flawlessly).*

---

## Render.com Deployment Workflow
We use Render as our primary cloud provider due to native PostgreSQL extensions and secure private networking.

1.  **Environment Setup**
    - Create a new PostgreSQL Database in Render.
    - Create a Redis instance.
    - Create a Web Service for the API (`docker-compose` build logic is mostly ignored; Render targets the Repo's root `Dockerfile` natively, or set up via standard Build Command `go build -o api ./cmd/api`).
    - Create a Background Worker service tracking `go build -o worker ./cmd/worker`.

2.  **Crucial Environment Variables**
    | Variable | Purpose |
    | :--- | :--- |
    | `DATABASE_URL` | PostgreSQL DSN |
    | `REDIS_URL` | Instant Revocation + Online Presence Tracking |
    | `JWT_SECRET` | 32+ character RSA Generator Key string |
    | `SENTRY_DSN` | Exception tracking (Sentry.io) |
    | `TENANT_SECRET_KEY` | 64 Hex chars (32-bytes). Master AES-GCM encryption key for Tenant SMTP/API credentials |
    | `APP_ENV` | `production`, `staging`, `development` |
    | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | System fallback SMTP credentials for platform-level emails |
    | `IMAP_HOST` / `IMAP_PORT` / `IMAP_USER` / `IMAP_PASS` | System-level IMAP credentials for inbox polling |
    | `PORT` | HTTP listen port (auto-injected by Render; defaults to 8080) |
    | `GEMINI_API_KEY` | Google Gemini API key — used by Social Worker for LLM draft generation |
    | `CONVEX_URL` | Convex deployment URL — IoT telemetry proxy target |
    | `CONVEX_DEPLOY_KEY` | Convex deploy key — authenticates IoT telemetry forwarding |

3.  **Database Migrations (Pre-Deploy)**
    - Never let the API handle its own Schema.
    - Migrations run strictly via Render's `Pre-Deploy Command`:
      `curl -sL https://github.com/golang-migrate/migrate/releases/latest/download/migrate.linux-amd64.tar.gz | tar xvz && ./migrate -path ./migrations -database $DATABASE_URL up`

---

## The Email Gateway Engine
LaventeCare provides complete white-labeling capability. Instead of using a single global API (like Resend or Postmark), the engine holds AES-GCM encrypted SMTP strings *per tenant*.

- **AES-GCM Encryption**: An encryption key (`TENANT_SECRET_KEY`) is generated upon infra provisioning. It must be kept physically safe and NEVER committed.
- **Fail-open Logic**: If a tenant has not configured their SMTP settings, the worker defaults back to the System Default injected via `.env` arrays.
- **SSRF Protection**: Before SMTP handshake, the worker evaluates target infrastructure IPs and drops connections to local, loopback, or internal-origin ranges.

### Disaster Recovery: Key Rotation (Zero Downtime)
If the `TENANT_SECRET_KEY` is compromised, deploy a zero-downtime rotation.

1. Export the new key as `TENANT_SECRET_KEY_V2`.
2. The Go-crypto implementation attempts decrypt on V1, falls back to decrypt on V2.
3. Write a small script querying all records in `tenants.mail_config`, read them using the old key, encrypt using the new key, and commit the DB transaction saving `mail_config_key_version: 2`.
4. Drop V1 out of Render Env, rotate V2 to V1 position.

> **Tooling**: Use `tools/encrypt_mail_config` for manual re-encryption during key rotation. Use `tools/generate_key` to generate a cryptographically secure new key.

---

## Telegram Alerting System
LaventeCare includes a native per-tenant Telegram notification system for real-time operational alerts.

- **Configuration**: Stored per tenant in the `telegram_config` table. Managed via `POST /admin/telegram-config`.
- **Triggers**: Automatically fires when new feedback tickets are submitted (`feedback` table). Can be extended to other events.
- **Testing**: Use `POST /admin/telegram-config/test` to send a test message and verify the webhook is working before relying on it in production.
- **Package**: `internal/telegram/notifier.go` — stateless notifier, instantiated per request.

---

## Audit Logs (Append-Only)
`audit_logs` are the core forensic tracking element.
- The service account or application layer holds **no** DELETE/UPDATE privileges over this table via PostgreSQL native permissions.
- Everything from MFA activations, to Login Attempts, Profile mutations, Role Escalations, Email Changes, and GDPR deletions triggers an append.
- Use `tools/query_audit` for manual forensic queries during incidents.
