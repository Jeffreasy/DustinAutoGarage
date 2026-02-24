# 04. Development & Testing Workflow

## Setting Up Your Local Environment

1. **Clone the repository**
2. **Duplicate `.env.example` to `.env.docker`**
   - No need to change keys; defaults are configured for local development.
3. **Boot the stack**
   ```bash
   docker compose up -d
   ```
   *This single command spins up PostgreSQL (port **5488**), Redis (6379), the API Service (8080), and the Unified Worker.*

4. **Run Migrations (Locally)**
   If you have the `migrate` CLI installed locally:
   ```bash
   migrate -path ./migrations -database "postgres://user:password@localhost:5488/laventecaredb?sslmode=disable" up
   ```
   Or use the included runner:
   ```powershell
   .\run-migrations.ps1
   ```

---

## The `sqlc` Paradigm
LaventeCare prohibits writing raw native SQL statements in Go to eliminate SQL Injection entirely.

**How to extend the database:**
1. Create a migration file in `./migrations/` (use `migrate create -ext sql -dir migrations -seq name_of_migration`).
2. Write the DDL operations in the `.up.sql` and the rollback in `.down.sql`.
3. Add execution queries in the corresponding file under `./internal/storage/queries/`:
   ```
   internal/storage/queries/
   ├── analytics.sql
   ├── auth.sql
   ├── blog.sql
   ├── direct_messages.sql
   ├── email.sql
   ├── feedback.sql
   ├── social.sql
   └── users.sql
   ```
   Example query in `queries/users.sql`:
   ```sql
   -- name: GetUserByEmail :one
   SELECT * FROM users WHERE email = $1 AND tenant_id = $2 LIMIT 1;
   ```
4. Run code-generation via `sqlc`:
   ```bash
   sqlc generate
   ```
5. Your query is now available via strict types in `db.New(pool).GetUserByEmail(ctx, params)`.

> **⚠️ sqlc Type Drift Warning**: If you manually edit a `db/*.sql.go` file AND the referenced column is later made nullable (e.g., via `ALTER COLUMN x DROP NOT NULL`), Docker's clean build will regenerate the `.sql.go` from the updated schema. The generated type changes from `string` to `pgtype.Text`, breaking callers that pass a plain `string`. **Rule**: For columns that may become nullable, use raw `tx.Exec()` in workers instead of sqlc params structs, or regenerate sqlc locally before committing.

---

## Testing Expectations

### 1. The Test Runner
Unit Testing and logic validations live in identical subpackages but carry the `_test.go` suffix. All code submitted must at least cover RBAC assertions.

```bash
# Execute unit testing suite completely
go test ./...

# See code coverage mapping
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

**Existing test files:**
- `internal/api/handlers/auth_test.go` — RBAC and token flow tests
- `internal/api/handlers/public_contact_test.go` — Contact form submission tests

### 2. Core Scopes for Testing
- **Role Validations (RBAC)**: Valid roles should pass the `customMiddleware.RBACMiddleware`, invalid/underprivileged requests MUST be bounced.
- **Tenant Isolation**: Any integration test firing against mock DB data MUST assure that the user from `Tenant A` receives `HTTP 404/403` or empty arrays if attempting to index records from `Tenant B`.
- **Worker Timeouts**: Ensure unit tests validate that `context.WithTimeout` does not leak hanging goroutines if the SMTP target server is non-responsive.
- **Email Integration**: Verify SMTP contract with mock SMTP servers to assert correct outbox pattern behavior. Confirm `email_logs` rows are written post-send (recipient_email + recipient_hash both populated).
- **Janitor RLS**: Confirm cleanup queries inside `storage.WithoutRLS()` delete rows on FORCE_RLS tables. A query outside this wrapper should match 0 rows.
- **Analytics RLS**: Confirm IP hash is correctly anonymized and partitions route correctly.
- **Blog Worker**: Verify that scheduled posts are promoted correctly and RLS bypass is properly scoped.

---

## Verification Scripts
The `scripts/` directory contains PowerShell and Go scripts for common development tasks:

| Script | Purpose |
|:-------|:--------|
| `scripts/generate-secrets.ps1` | Generate all required environment secrets |
| `scripts/system-check.ps1` | Full system health check (DB, Redis, API) |
| `scripts/test-auth-flow.ps1` | End-to-end auth flow test (register → login → refresh → logout) |
| `scripts/verify-all-endpoints.ps1` | Comprehensive endpoint verification |
| `scripts/verify-new-features.ps1` | Feature-specific verification (social, blog, analytics) |
| `scripts/quick-verify.ps1` | Fast sanity check after changes |
| `scripts/register-user.ps1` | Register a user via API |
| `scripts/setup_production.go` | Interactive production setup wizard |

---

## Pre-Flight Checklist (`checklist.py`)
LaventeCare provides a Python master-checklist to audit code before any deployment. Never merge PRs that fail the local audit.

```bash
python .agent/scripts/checklist.py .
```
This single script triggers:
1. `security_scan.py`: GoSec analysis against injection/vulnerabilities.
2. `lint_runner.py`: GolangCI-Lint checking shadowing, misallocated vars and stylistic format.
3. `schema_validator.py`: Asserts standard syntax matches throughout the DB schemas.
4. `test_runner.py`: Bootstraps test container and asserts successful build + logic tests.
