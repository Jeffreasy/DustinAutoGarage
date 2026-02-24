# 02. API Reference & Frontend Integration

## Protocol Standards
- **Base URL**: `/api/v1` (canonical). Also available at `/api/` for backward compatibility with frontends that omit the version prefix.
- **Content-Type**: `application/json` is mandatory for all POST/PUT/PATCH bodies.

## Authentication Model (Important for SPA/Frontends)
LaventeCare utilizes **Dual-Tokens** delivered specifically for browser security via **HttpOnly Cookies**.

- LocalStorage / SessionStorage must NEVER hold tokens.
- Ensure your `fetch` or Axios requests always include `credentials: "include"`.
- Since Cross-Origin works due to `SameSite=None; Partitioned; Secure;`, your frontend origin **MUST** be whitelisted in the Tenant's CORS array (configurable via `PUT /admin/cors-origins`).
- Your current allowed origins are readable via `GET /cors-origins` (Editor+).

### Login Response Profile
If successful, HTTP 200 is returned. The body provides profile identity. The actual session persistence happens invisibly in the `Set-Cookie` headers.
```json
{
    "user": {
        "id": "...",
        "email": "...",
        "full_name": "...",
        "role": "editor"
    }
}
```

If `mfa_required` is `true`, **no cookies are set yet**. The backend returns a short-lived `pre_auth_token` instead. The frontend must use this as a `Bearer` token in the `Authorization` header when calling `/auth/mfa/verify` or `/auth/mfa/send-email`.

---

## Global Rate Limits
All endpoints are guarded by `golang.org/x/time/rate`.
- **Allowance**: 25 requests per second (per IP).
- **Burst limit**: 50 requests.
If exceeded, the API responds with `429 Too Many Requests`.

---

## Endpoints

### 1. Discovery & Public
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/.well-known/openid-configuration` | GET | OIDC config for Convex / Auth.js integrations |
| `/.well-known/jwks.json` | GET | Public RS256 RSA keys |
| `/health` | GET | Liveness check (used by Render zero-downtime deploy) |
| `/tenants/{slug}` | GET | Tenant public metadata (branding, links) |
| `/showcase` | GET | Lists publicly featured tenants |
| `/public/contact` | POST | Unauthenticated contact form submission |
| `/analytics` | POST | Privacy-first tracking beacon (sendBeacon/fetch compatible) |
| `/iot/telemetry` | POST | ESP32/IoT device data ingestion → proxied to Convex. Requires `X-ESP32-Secret` header. |
| `/guest/register` | POST | Creates headless 'Ghost' users |
| `/guest/promote` | POST | Upgrades Ghost users to full accounts |

### 2. Public Authentication Flows
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/auth/register` | POST | Account creation |
| `/auth/register-confirmation` | POST | Trigger welcome email after registration (called by frontend post-register) |
| `/auth/login` | POST | Login. Returns `mfa_required: true` + `pre_auth_token` if MFA is active |
| `/auth/refresh` | POST | Extend the session (reads HttpOnly cookie automatically) |
| `/auth/logout` | POST | Revokes local cookie + Redis token-family list |
| `/auth/password/forgot` | POST | Request a password reset email |
| `/auth/password/reset` | POST | Reset password via token from email |
| `/auth/email/resend` | POST | Resend email verification link |
| `/auth/email/verify` | POST | Verify email address via token |
| `/auth/mfa/verify` | POST | Verify TOTP code during login (uses `pre_auth` Bearer token) |
| `/auth/mfa/backup` | POST | Verify a one-time backup code |
| `/auth/mfa/send-email` | POST | Dispatch a 6-digit OTP email for email-based MFA |

**Public Blog Reader API** (resolved by tenant slug, no auth required):
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/blog/{tenantSlug}/posts` | GET | List published posts |
| `/blog/{tenantSlug}/posts/{slug}` | GET | Single post by slug |
| `/blog/{tenantSlug}/posts/{slug}/comments` | GET | Approved comments for a post |
| `/blog/{tenantSlug}/posts/{slug}/comments` | POST | Community comment submission |
| `/blog/{tenantSlug}/categories` | GET | All categories |
| `/blog/{tenantSlug}/categories/{slug}/posts` | GET | Posts by category |
| `/blog/{tenantSlug}/tags/{tag}/posts` | GET | Posts by tag |
| `/blog/{tenantSlug}/feed.xml` | GET | RSS feed |

### 3. MFA Setup (pre_auth or active session)
*These require either a valid access token OR the `pre_auth_token` Bearer token from a pending MFA login.*
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/auth/mfa/setup` | POST | Initialize TOTP setup — returns QR code seed |
| `/auth/mfa/activate` | POST | Confirm TOTP setup by verifying first code — activates MFA permanently |

### 4. Viewer Role (Authenticated, Read-Only)
*Requires active HttpOnly session (any role).*
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/auth/me` | GET | Simple profile lookup |
| `/auth/profile` | GET | Extended profile traits |
| `/auth/token` | GET | Raw JWT echo for satellite integrations |
| `/auth/sessions` | GET | View active browsers/devices |
| `/mail-config` | GET | Current SMTP limits |
| `/email-stats` | GET | Delivery metrics |
| `/audit-logs` | GET | Security event log |

### 5. User Role (Self-Service Write)
*Requires `role >= "user"` (weight 2). Viewers (weight 1) receive `403 Forbidden`.*
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/auth/sessions/{id}` | DELETE | Remotely terminate a specific session |
| `/auth/profile` | PATCH | Update display name, avatar, etc. |
| `/auth/security/password` | PUT | Change password (current password required) |
| `/auth/account/email/change` | POST | Start email change flow (requires password confirmation) — sends verification link |
| `/auth/account/email/confirm` | POST | Confirm email change via token from link |
| `/auth/account` | DELETE | GDPR Art. 17 self-deletion (password confirmation required) |
| `/auth/account/export` | GET | GDPR Art. 20 data export (JSON) |

### 6. Editor Role (Operational & Content)
*Requires `role >= "editor"` (weight 3).*

**User Management:**
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/users` | GET | List users in tenant |
| `/users/invite` | POST | Invite new member to tenant |
| `/users/{userID}` | PATCH | Update member role |
| `/users/{userID}` | DELETE | Remove member from tenant |

**Email Inbox:**
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/email/inbox/{account}` | GET | Read tenant inbox emails |
| `/email/inbox/{account}/stats` | GET | Inbox statistics per account |
| `/email/message/{id}` | GET | View email detail |
| `/email/message/{id}/read` | PATCH | Mark email as read |
| `/email/message/{id}/star` | PATCH | Toggle star on email |
| `/email/message/{id}/reply` | POST | Reply to an inbound email |
| `/email/message/{id}/reply-with-attachment` | POST | Reply with file attachment |
| `/email/message/{id}/archive` | POST | Archive email |
| `/email/send` | POST | Send ad-hoc outbound email |
| `/email/stats` | GET | Email delivery stats (alias) |
| `/email/config` | GET | Mail config (alias) |

> **Compatibility Aliases**: All `/email/` routes are also accessible via `/admin/email/` for frontend compatibility. Both paths require `editor` role.

**Feedback Tickets:**
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/feedback` | POST | Submit a new feedback ticket (triggers Telegram alert if configured) |
| `/feedback` | GET | Read feedback ticket list |

**Real-Time Presence:**
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/presence/heartbeat` | POST | Send active presence heartbeat (Redis TTL-based) |
| `/presence/online` | GET | List active online users within tenant |

**Direct Messaging (1-on-1 Chat):**
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/messages` | POST | Send 1-on-1 direct message |
| `/messages/conversations` | GET | List active chat threads |
| `/messages/unread` | GET | Total unread badge count |
| `/messages/stream` | GET | Subscribe to SSE (Server-Sent Events) for real-time incoming messages |
| `/messages/{userID}` | GET | Conversation history with specific user |
| `/messages/{userID}/read` | PATCH | Mark conversation as read |

**Analytics Dashboard (Privacy-First):**
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/analytics/dashboard` | GET | Core metrics summary (views, users) |
| `/analytics/dashboard-full` | GET | Combined full dashboard snapshot |
| `/analytics/pages` | GET | Top visited paths |
| `/analytics/referrers` | GET | Top traffic sources |
| `/analytics/timeseries` | GET | Historic graph data |
| `/analytics/bounce-rate` | GET | Bounce rate metric |
| `/analytics/session-duration` | GET | Average session duration |
| `/analytics/live` | GET | Real-time active visitors (Redis-backed) |

**RDW Open Data Proxy (Editor+):**
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/rdw/voertuig/{kenteken}` | GET | Secure, authenticated proxy to the RDW Open Data API (Voertuigen & Brandstof datasets) for automatic license plate lookups. |

**CMS — Blog Engine (Editor+):**
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/blog/posts` | GET, POST | List or create new draft/post |
| `/blog/posts/{id}` | GET | Get single post by ID |
| `/blog/posts/{id}` | PUT | Update post content |
| `/blog/posts/{id}` | DELETE | Delete post |
| `/blog/posts/{id}/publish` | POST | Publish immediately |
| `/blog/posts/{id}/schedule` | POST | Schedule post for automatic Blog Worker activation |
| `/blog/posts/{id}/archive` | POST | Archive a published/draft post |
| `/blog/posts/{id}/revisions` | GET | View full document history |
| `/blog/categories` | GET, POST | List or create categories |
| `/blog/categories/{id}` | PUT, DELETE | Update or remove category |
| `/blog/comments` | GET | Comment moderation queue |
| `/blog/comments/{id}/approve` | PATCH | Approve a community comment |
| `/blog/comments/{id}/reject` | PATCH | Reject a community comment |
| `/blog/comments/{id}` | DELETE | Permanently delete a community comment |
| `/blog/config` | GET, POST | Blog mechanics settings (posts per page, comments on/off) |

**CORS (Read):**
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/cors-origins` | GET | View current allowed CORS origins for the tenant |

### 7. Admin Role (Governance & Structural)
*Requires `role = "admin"` (weight 4).*

**Tenant & Core Settings:**
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/admin/tenants` | POST | Spin up new tenant boundaries |
| `/admin/tenants` | DELETE | ⚠️ **Not implemented** — returns `405 Method Not Allowed` |
| `/admin/mail-config` | GET | Read current SMTP config |
| `/admin/mail-config` | POST | Write / update AES-GCM encrypted SMTP credentials. `from` field is validated against RFC 5322 via `mail.ParseAddress`. Key version stored dynamically via `crypto.CurrentKeyVersion()`. |
| `/admin/mail-config` | DELETE | Remove custom SMTP config (fallback to system SMTP) |
| `/admin/imap-config` | GET | List configured IMAP accounts (passwords excluded) |
| `/admin/imap-config` | POST | Create or update IMAP account. Body: `{account_type, host, port, user, password, tls_mode}`. Same SSRF validation as SMTP. `tls_mode`: `ssl` or `starttls`. |
| `/admin/imap-config` | DELETE | Deactivate IMAP account. Query param: `?account_type=info` |
| `/admin/cors-origins` | PUT | Add/update allowed frontend domains |

**Telegram Alerting:**
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/admin/telegram-config` | GET | Read current Telegram webhook config |
| `/admin/telegram-config` | POST | Set or update Telegram bot token + chat ID |
| `/admin/telegram-config` | DELETE | Remove Telegram config |
| `/admin/telegram-config/test` | POST | Send test message to verify webhook is working |

**X (Twitter) Configuration:**
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/admin/x-config` | GET | Read current X Developer API keys |
| `/admin/x-config` | POST | Set X API credentials (AES-GCM encrypted) |
| `/admin/x-config` | DELETE | Remove X API config |
| `/admin/x-config/test` | POST | Test X API credentials |

**Social Media Automation (X Auto Poster):**
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/admin/social/campaigns` | GET | List all campaigns |
| `/admin/social/campaigns` | POST | Create new campaign |
| `/admin/social/campaigns/{id}` | GET | Get specific campaign |
| `/admin/social/campaigns/{id}` | PUT | Update campaign settings |
| `/admin/social/campaigns/{id}` | DELETE | Delete campaign |
| `/admin/social/posts` | GET | List all social posts |
| `/admin/social/posts` | POST | Manually create a social post |
| `/admin/social/posts/generate` | POST | LLM worker (Gemini) writes a draft based on campaign archetype |
| `/admin/social/posts/{id}/approve` | POST | Human-in-the-loop approval of LLM draft |
| `/admin/social/posts/{id}/queue` | POST | Put approved text into worker outbound queue |
| `/admin/social/posts/{id}` | PUT | Edit post content before queuing |
| `/admin/social/posts/{id}` | DELETE | Remove a post |
| `/admin/social/budget` | GET | View daily token/API quota expenditure |

**Feedback Management (Admin):**
| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/admin/feedback/{id}` | PATCH | Update feedback ticket status (open/closed/in-progress) |

---

*For detailed payload shapes, consult the frontend React/Zod interfaces or inspect JSON responses via a generic `GET` request.*
