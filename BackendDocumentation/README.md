# LaventeCare Auth Systems - The Handbook

> **Anti-Gravity Protocol**: "Silence is Golden, the Database is a Fortress."

LaventeCare Auth Systems is a high-performance, security-first Identity & Access Management (IAM) backend written in Go. It serves as a headless provider allowing distributed satellites (web apps, IoT devices, cron workers) to offload complex Authentication, Authorization (RBAC), and strict Multi-Tenant Isolation.

## The Core 5 Master Documents

Welcome to the consolidated handbook. Everything you need to architect, integrate, and operate the platform is divided into these chapters:

### [01. Architecture & Security Model](./01_architecture_security.md)
The foundation of the platform. Details the "Anti-Gravity" security philosophy, the 5 Laws of Defense, the complete Postgres Database Schema (including feedback, direct messages, telegram config, and blog subsystem tables), the 4-level RBAC hierarchy, Row Level Security (RLS) implementation, and how JWT / MFA tokens are generated and secured. Also documents all 6 Unified Worker sub-processes including the Blog Scheduler.

### [02. API & Frontend Integration](./02_api_integration.md)
The manual for Frontend and Satellite developers. Explains protocol standards, required headers, the complete list of available endpoints organized by RBAC level (Public, Viewer, User, Editor, Admin), MFA flow, and guidelines for integrating the API safely into browsers (Next.js, Astro) with HttpOnly cookies.

### [03. Operations & Deployment Runbook](./03_operations_runbook.md)
The DevOps guide. Instructions for deploying the platform via Docker to Render.com. Covers the complete Environment Variables table (including GEMINI_API_KEY, CONVEX_URL, IMAP), the Unified Background Worker with all 6 sub-processes, the Multi-Tenant Email Gateway (SMTP), Telegram Alerting, and Disaster Recovery procedures (Backups, Key Rotation).

### [04. Development & Testing Workflow](./04_development_testing.md)
The Backend Engineer's onboarding guide. Details how to spin up the local development environment (`docker compose`), the full `sqlc` query directory structure, the `scripts/` directory reference, and the mandatory testing procedures (Unit, Integration, RBAC, and Worker coverage) required for CI/CD checks.

### [05. Tools Reference](./05_tools_reference.md)
The operator's toolbox. Comprehensive reference for all standalone Go tools (`tools/`) and PowerShell/SQL scripts (`scripts/`) used for tenant management, encryption, RLS verification, database operations, and production diagnostics.

---

### Key Capabilities at a Glance:
- **Tenant-Scoped Identity**: Users can belong to multiple tenants safely nested behind DB-level RLS.
- **Next-Gen Authentication**: Short-lived `RS256` JWT access tokens + rotating opaque Refresh Tokens via `HttpOnly` Cookies.
- **Multi-Factor Auth (MFA)**: Built-in TOTP support and Email-based OTP flows.
- **4-Level RBAC**: `viewer` → `user` → `editor` → `admin` with fine-grained route-level enforcement.
- **CMS & Social Engines**: Headless Blog API with scheduled publishing and premium content tiers, and LLM-powered Social Automation (`X Auto Poster`) driven by the background worker.
- **Privacy-First Telemetry**: Cookieless endpoint ingestion for analytics with GDPR-compliant IP hashing and 12-month rolling partitions.
- **IoT Support**: Low-latency endpoints for embedded ESP32/C++ devices proxied to Convex.
- **Direct Messaging**: Real-time 1-on-1 chat between tenant members with read receipts.
- **Feedback Ticket System**: Internal ticketing with Telegram alerting on new submissions.
- **Real-time Presence Tracking**: Redis-backed heartbeat system for online user visibility.
- **Email Change Flow**: GDPR-compliant email address change with token verification.
- **Unified Background Worker**: 6 coordinated sub-processes (Email, IMAP, Janitor, Social, Analytics, Blog Scheduler) in a single binary.
