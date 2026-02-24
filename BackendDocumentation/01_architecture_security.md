# 01. Architecture & Security Model

## The "Anti-Gravity" Security Philosophy
LaventeCare Auth Systems is built on the premise that internal trust is a liability. The fundamental laws are:

1. **Input is Toxic**: No byte is trusted. Strict type-checking, bounds validation, and JSON decoding (disallowing unknown fields) intercept payloads at the perimeter.
2. **Silence is Golden**: The system never leaks internal errors, DB constraints, or stack traces. Generic HTTP status codes are returned to clients; details go to Sentry and internal logs.
3. **The Database is a Fortress**: SQL injection is physically impossible due to strictly typed compiler-generated queries (`sqlc`). Raw string building is banned.
4. **Race Conditions are Fatal**: Mutative state is exclusively managed via ACID-compliant transactional database wrappers.
5. **Dependency Paranoia**: The system favors the standard library. Core crypto (JWT/Bcrypt/AES) is managed via native Go libraries, avoiding supply-chain bloat.

---

## System Components

### 1. The HTTP Layer (Gateway)
- Built on `chi` router for zero-allocation routing.
- **Middlewares** (applied in order): Native `sentryhttp` (with repanic enabled for full context capturing), RequestID, RealIP, custom Slog logger, Panic Recovery, dynamic CORS, global Ratelimit (`x/time/rate`), and Tenant Context extraction.
- CSRF protection is applied **only on mutating authenticated routes** (not public auth endpoints or persistent `GET` SSE streams).

### 2. Domain Logic (Services)
- **Token Generation**: Asymmetric RSA-SHA256 (`RS256`) JWTs for access limits.
- **Stateless Verification**: Revocation checks hit Redis cache for instant invalidation (e.g. forced logouts) bypassing DB round-trips.
- **Real-Time Push Transport**: Utilizes native **Server-Sent Events (SSE)** coupled with **Redis Pub/Sub** to stream bidirectional app states directly to clients.

### 3. The Unified Background Worker
Replaces legacy multi-worker architectures. A single `worker` binary runs **6** sub-routines:
1. **Email Dispatching**: Uses the outbox pattern from `email_outbox` to send via tenant SMTP gateways over batch-polled routines.
2. **IMAP Polling**: Checks for incoming emails and replies.
3. **Janitor**: Purges expired tokens, unverified accounts, and orphans. Cleans `email_logs` (180-day retention), `email_outbox` (30-day sent/failed), and `email_inbox` archived items (90-day). **Critical**: All Janitor cleanup queries MUST run inside `storage.WithoutRLS()` — `email_outbox`, `email_logs`, and `email_inbox` all have `FORCE ROW LEVEL SECURITY`. Without the bypass, every DELETE silently matches 0 rows.
4. **Social Queues**: Executes LLM text generation and schedules posts to X (formerly Twitter).
5. **Analytics Maintenance**: Auto-rotates analytics database partitions to prevent bloat.
6. **Blog Scheduler**: (`internal/workers/blog`) — Polls every 5 minutes. Promotes `status = 'scheduled'` blog posts to `'published'` when their `scheduled_for` timestamp has passed. Operates via an RLS-bypass transaction to act cross-tenant.

---

## Multi-Tenancy & Row Level Security (RLS)
Every piece of data is isolated to a specific Tenant. The application acts strictly context-aware.

- **Request Context**: Context is usually derived from `X-Tenant-ID` header or implicit from the token claims (`tid`).
- **Postgres RLS**: The ultimate defense-in-depth loop. Even if a developer forgets a `tenant_id` WHERE clause, the Database Engine physically blocks access via the `app.current_tenant` context variable.
  - Tables protected: `memberships`, `refresh_tokens`, `blog_posts`, `blog_comments`, `blog_categories`, `analytics_events`, `direct_messages`, `message_read_receipts`, `feedback`, `social_campaigns`, `social_posts`.
- **RBAC**: Handled in-memory via JWT claims array. Eliminates constant permission queries.

### RBAC Hierarchy (4 Levels)
| Role | Weight | Scope |
|:-----|:-------|:------|
| `viewer` | 1 | Read-only access to own profile, mail config, stats, audit logs |
| `user` | 2 | Write access to own self-service: profile, password, sessions, GDPR export/delete, email change |
| `editor` | 3 | Operational: user management, invites, email inbox, analytics dashboard, direct messaging, blog CMS, presence, feedback |
| `admin` | 4 | Governance: tenant settings, SMTP config, **IMAP config**, CORS, Telegram/X config, social campaigns |

---

## Core Database Schema

### Identity & Access
- `tenants`: Roots of isolation containing origin restrictions, keys, and SMTP config.
- `users`: Global identities. Includes `mfa_email_otp` and `mfa_email_otp_expiry` columns for Email OTP flows.
- `memberships`: Linking users to tenants with specific roles.
- `audit_logs`: Append-only, immutable record for all critical actions.
- `telegram_config`: Per-tenant Telegram bot credentials for alerting webhooks.

### Authentication
- **Tenant-Configurable MFA**: MFA enforcement is tenant-scoped via the `require_mfa` JSONB flag in `tenants.settings` (defaults to `false`). When enabled, `editor` and `admin` roles are forced to complete MFA authentication before receiving an active session.
- `refresh_tokens`: Hashes of active opaque tokens with `family_id` rotation tracking.
- `verification_tokens` / `invitations`: SHA256 deterministic hashes for single-use flows.
- `mfa_email_otp`: Time-limited 6 digit codes stored directly on the `users` table (`mfa_email_otp`, `mfa_email_otp_expiry`).

### CMS, Telemetry & Operations
- `blog_posts` & `blog_categories`: Fully featured headless content engine inside the tenant.
- `blog_comments`: Community comments with moderation queue (approve/reject/delete).
- `blog_revisions`: Full document history of every blog post edit.
- `social_campaigns` & `social_posts`: Configs, generated text, and X tokens. Posts support premium content tiers: `content_type` can be `tweet` (≤280), `verhaal` (≤1500), or `artikel` (≤4000).
- `analytics_events`: Partitioned tables holding GDPR-friendly `ip_hash` visits and page flows (12-month rolling window).
- `email_outbox` / `email_logs`: Reliable delivery tracking. `email_logs` stores both `recipient_email` (plain, for dashboard) and `recipient_hash` (SHA-256, GDPR). `imap_accounts` stores per-tenant IMAP credentials with `imap_tls_mode` (`ssl` or `starttls`).
- `direct_messages` + `message_read_receipts`: 1-on-1 push-based chat. Integrates strictly with the Redis SSE router for instant frontend delivery.
- `feedback`: Internal ticket system with Telegram alerting on new submissions.
