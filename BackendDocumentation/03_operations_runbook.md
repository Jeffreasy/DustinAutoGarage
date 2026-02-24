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

*(Note: If a process panics, an isolated `safeStart` panic handler traps the crash, extracts execution context via Sentry's SDK `BeforeSend` hooks, reports the stack trace, and keeps the remaining sub-routines running flawlessly).*

---

## Render.com Deployment Workflow
We use Render as our primary cloud provider due to native PostgreSQL extensions and secure private networking.

1.  **Environment Setup**
    - Create a new PostgreSQL Database in Render.
    - Create a Redis instance.
    - Create a Web Service for the API (`docker-compose` build logic is mostly ignored; Render targets the Repo's root `Dockerfile` natively, or set up via standard Build Command `go build -o api ./cmd/api`).
    - Create a Background Worker service tracking `go build -o worker ./cmd/worker`.
    - Render main: https://laventecareauthsystems.onrender.com
    - service id render: srv-d60ud1ali9vc73fj7ihg

2.  **Crucial Environment Variables**
    | Variable | Purpose |
    | :--- | :--- |
    | `DATABASE_URL` | PostgreSQL DSN |
    | `REDIS_URL` | Redis Cloud / Internal cluster — powers Instant Revocation, **Pub/Sub SSE Chat**, and Online Presence Tracking |
    | `JWT_SECRET` | 32+ character RSA Generator Key string |
    | `SENTRY_DSN` | Enterprise Exception logging (Sentry.io) with deep `BeforeSend` Http.Request context tracking |
    | `TENANT_SECRET_KEY` | 64 Hex chars (32-bytes). Master AES-GCM encryption key for Tenant SMTP/API credentials |
    | `TENANT_SECRET_KEY_V2` | (Optional) New key during rotation. `crypto.CurrentKeyVersion()` auto-detects V3 → V2 → default 1 |
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
- **SMTP Config Caching**: Tenant SMTP config is cached in-memory with a **5-minute TTL** per tenant (via `sync.Map` in `workers/email`). Config changes take effect within 5 minutes. Eliminates 60+ redundant DB queries/min per active tenant.
- **`from` Validation**: The `POST /admin/mail-config` endpoint validates the `from` field against RFC 5322 via `mail.ParseAddress()`. Invalid addresses are rejected with HTTP 400.
- **`email_logs` audit trail**: Since migration `20260224000001`, `recipient_email` is stored alongside the SHA-256 `recipient_hash` for dashboard visibility. The NOT NULL constraint is relaxed (DEFAULT `''`) for backwards compatibility.
- **IMAP TLS Mode**: `imap_accounts.imap_tls_mode` column (added migration `20260224000001`) allows per-account configuration of `ssl` or `starttls`. Previously hardcoded to `"ssl"`.
- **IMAP Management**: Tenants configure IMAP credentials via `POST /admin/imap-config` (no direct SQL required).

### Disaster Recovery: Key Rotation (Zero Downtime)
If the `TENANT_SECRET_KEY` is compromised, deploy a zero-downtime rotation.

1. Generate a new key: `go run ./tools/generate_key/`.
2. Export the new key as `TENANT_SECRET_KEY_V2` in Render.
3. `crypto.CurrentKeyVersion()` (called by `UpdateMailConfig`) will automatically tag new configs as version 2.
4. Write a script: query all `tenants.mail_config` where `mail_config_key_version = 1`, re-encrypt using V2, commit.
5. Drop V1 (`TENANT_SECRET_KEY`) from Render Env once all rows are at version 2.

> **Tooling**: Use `tools/encrypt_mail_config` for manual re-encryption during key rotation. Use `tools/generate_key` to generate a cryptographically secure new key.

### Janitor Cleanup & FORCE_RLS
The Janitor worker runs hourly and handles data retention. **Important**: `email_outbox`, `email_logs`, and `email_inbox` all have `FORCE ROW LEVEL SECURITY`. The Janitor uses `storage.WithoutRLS()` to bypass RLS inside a single transaction. Without this, all DELETEs silently match 0 rows.

| Table | Retention Policy |
| :--- | :--- |
| `email_logs` | 180 days |
| `email_outbox` (sent/failed) | 30 days |
| `email_inbox` (archived) | 90 days |
| `refresh_tokens`, `verification_tokens`, `invitations` | Expired immediately |

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
