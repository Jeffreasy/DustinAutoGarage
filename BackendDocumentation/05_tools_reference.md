# 05. Tools & Scripts Reference

> This document covers all standalone operator tools (`tools/`) and helper scripts (`scripts/`). These are used for tenant management, database operations, encryption, verification, and production diagnostics.

---

## `tools/` — Standalone Go Operator Tools

Each tool is a self-contained Go binary. Build and run with:
```bash
go run ./tools/<tool_name>/
```
Or build for production:
```bash
go build -o bin/<tool_name> ./tools/<tool_name>/
```

### Tenant Management

#### `tools/create_tenants`
Provisions a new tenant in the database. Sets up the tenant record with default settings, allowed CORS origins, and initial admin user.

**When to use**: Onboarding a new client project into the platform.

#### `tools/check_tenants`
Reads and displays all configured tenants with their origin restrictions, mail configuration status, and member counts.

**When to use**: Verify the current state of tenant registrations before a deployment or after a config change.

#### `tools/delete_user`
Safely removes a user record and all associated tenant memberships. Cascades deletion through `refresh_tokens`, `verification_tokens`, and leaves `audit_logs` intact (append-only).

**When to use**: Manual user removal for GDPR deletion requests that cannot be completed via the API.

#### `tools/get_tenant_ids`
Outputs a quick map of tenant `slug → uuid` for use in scripts that require the internal tenant UUID.

---

### Email & SMTP

#### `tools/encrypt_mail_config`
Encrypts raw SMTP credentials using the `TENANT_SECRET_KEY` and writes the AES-GCM ciphertext to the `tenants.mail_config` column in the database.

**When to use**: Initial SMTP setup for a tenant, or during `TENANT_SECRET_KEY` rotation.

```bash
# Example: Encrypt and write SMTP config for a tenant
go run ./tools/encrypt_mail_config/ --tenant-id <uuid> --host smtp.example.com --port 587 --user user@example.com --pass secret
```

#### `tools/setup_imap_accounts`
Configures IMAP credentials for a tenant's inbox polling. Writes to the `imap_accounts` table.

**When to use**: Initial IMAP setup for a tenant when the API is not yet accessible, or for bulk configuration during onboarding. For runtime management, prefer the API endpoint: `POST /admin/imap-config` (supports `account_type`, `host`, `port`, `user`, `password`, `tls_mode`).

> **`imap_tls_mode`**: Since migration `20260224000001`, each IMAP account has a configurable `imap_tls_mode` field (`ssl` or `starttls`). Default: `ssl`. This replaces the previous hardcoded `"ssl"` behavior.

#### `tools/email_queue`
Inspects the current state of the `email_outbox` table. Shows pending, failed, and retry-scheduled messages.

**When to use**: Diagnosing email delivery issues — check if messages are stuck in the queue.

---

### Security & Verification

#### `tools/generate_key`
Generates a cryptographically secure 64-character hex string (32 bytes) suitable for use as `TENANT_SECRET_KEY`.

```bash
go run ./tools/generate_key/
# Output: a1b2c3d4...  (64 hex chars)
```

#### `tools/verify_rls`
Connects to the database and runs test queries to confirm that PostgreSQL RLS policies are correctly enforced. Simulates cross-tenant access attempts and asserts they are blocked.

**When to use**: After any migration that alters RLS policies. Run before every production deployment.

> **⚠️ FORCE_RLS Tables**: `email_outbox`, `email_logs`, and `email_inbox` have `FORCE ROW LEVEL SECURITY`. Even the table owner must set `app.bypass_rls = 'true'` (via `storage.WithoutRLS()`) or `app.current_tenant` to access these tables. Verify this tool also tests these tables specifically.

#### `tools/test_decrypt`
Tests decryption of stored `mail_config` using the current `TENANT_SECRET_KEY`. Useful to verify the key is correct before running the API.

---

### Database & Migrations

#### `tools/migration_status`
Reports the current migration version applied to the database and lists any pending migrations.

**When to use**: Before deploying to production to confirm the database is at the correct schema version.

#### `tools/fix_render_db`
Applies emergency fixes for known Render.com PostgreSQL quirks (e.g., extension availability, default search paths).

**When to use**: Only when `migrate up` fails on Render for extension-related reasons.

#### `tools/skip_migration_017`
Marks migration `017` as completed in the `schema_migrations` table without executing it. This migration involved table partitioning that was already applied manually on some environments.

**When to use**: One-time use only on databases that had the partitioning applied manually before migration orchestration.

---

### Diagnostics

#### `tools/query_audit`
Runs structured queries against the `audit_logs` table. Supports filtering by user, tenant, action type, and date range.

**When to use**: Incident forensics — trace what a specific user did, or find all failed login attempts for a tenant.

---

## `scripts/` — PowerShell & Go Helper Scripts

### Setup & Secrets

#### `scripts/generate-secrets.ps1`
Generates all required environment variables for a fresh deployment:
- `JWT_SECRET`
- `TENANT_SECRET_KEY`
- System SMTP credentials template

```powershell
.\scripts\generate-secrets.ps1
```

#### `scripts/setup_production.go`
Interactive Go wizard that walks through initial production configuration: database ping, migration status, tenant creation, and admin user setup.

---

### Verification

#### `scripts/system-check.ps1`
Full system health check. Verifies:
- PostgreSQL connection
- Redis connection
- API liveness (`/health`)
- Migration status
- RLS policy enforcement

```powershell
.\scripts\system-check.ps1 -ApiUrl https://your-api.render.com
```

#### `scripts/quick-verify.ps1`
Fast sanity check after code changes. Tests basic auth flow and health endpoint only.

#### `scripts/verify-all-endpoints.ps1`
Comprehensive verification of all documented API endpoints. Requires a valid admin JWT. Tests all RBAC levels.

```powershell
.\scripts\verify-all-endpoints.ps1 -ApiUrl https://your-api.render.com -AdminToken <jwt>
```

#### `scripts/verify-new-features.ps1`
Feature-specific verification for Social Posting, Blog API, Analytics, and Direct Messaging endpoints.

---

### Auth Testing

#### `scripts/test-auth-flow.ps1`
Full end-to-end authentication test:
1. Register a user
2. Login and capture cookies
3. Refresh the session
4. Verify `/auth/me`
5. Logout and confirm token revocation

```powershell
.\scripts\test-auth-flow.ps1 -ApiUrl http://localhost:8080 -TenantSlug laventecare
```

#### `scripts/register-user.ps1`
Registers a test user via the API with configurable email, password, and tenant slug.

---

### CORS & Database Fixes

#### `scripts/fix-cors-localhost.ps1`
Adds `http://localhost:*` to a tenant's allowed CORS origins. Useful for local frontend development.

#### `scripts/add-localhost-cors.sql` / `scripts/fix-dkl-cors-origins.sql`
SQL equivalents for direct database CORS origin fixes when the API is unavailable.

#### `scripts/fix-render-migrations.sh`
Shell script to force-run or repair stuck migrations on Render's managed PostgreSQL.

---

### Diagnostic

#### `tools/render_diagnostic.sh`
Bash script that collects environment state, database connectivity, and Redis reachability on Render.com for remote debugging sessions.

---

> For all scripts requiring database access, ensure `DATABASE_URL` is set in your environment or `.env` file before running.
