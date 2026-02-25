/**
 * src/lib/laventecareToken.ts
 *
 * Server-side service account token manager voor LaventeCare BFF proxies.
 *
 * Werking:
 *   - Logt in als LAVENTECARE_SVC_EMAIL + LAVENTECARE_SVC_PASS (server-side only)
 *   - Cachet het JWT access token voor 14 minuten (net onder de 15-min expiry)
 *   - Geeft een geldig Bearer token terug voor alle RDW-proxy calls
 *
 * Vereiste Vercel env vars:
 *   LAVENTECARE_SVC_EMAIL  — bijv. admin@dustinautogarage.nl
 *   LAVENTECARE_SVC_PASS   — wachtwoord van het service account
 *   API_URL                — bijv. https://laventecareauthsystems.onrender.com
 *   TENANT_ID              — UUID van de tenant
 */

const API_URL = import.meta.env.API_URL as string;
const TENANT_ID = import.meta.env.TENANT_ID as string;
const SVC_EMAIL = import.meta.env.LAVENTECARE_SVC_EMAIL as string | undefined;
const SVC_PASS = import.meta.env.LAVENTECARE_SVC_PASS as string | undefined;

// Module-level cache (warm instance hergebruik in serverless)
let _cached: { token: string; expiresAt: number } | null = null;

/** Retourneert een geldig Bearer access token voor het service account. */
export async function getServiceToken(): Promise<string | null> {
    if (!SVC_EMAIL || !SVC_PASS) return null;

    // Cache check: nog geldig?
    if (_cached && _cached.expiresAt > Date.now()) {
        return _cached.token;
    }

    // Login server-side
    const loginRes = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...(TENANT_ID ? { "X-Tenant-ID": TENANT_ID } : {}),
        },
        body: JSON.stringify({
            email: SVC_EMAIL,
            password: SVC_PASS,
            tenant_slug: "dustin-auto-garage",
        }),
    });

    if (!loginRes.ok) {
        console.error("[laventecareToken] Login failed:", loginRes.status, await loginRes.text());
        return null;
    }

    // Haal token op via /auth/token (stuurt cookies mee uit Set-Cookie)
    const loginCookies = loginRes.headers.get("set-cookie") ?? "";

    const tokenRes = await fetch(`${API_URL}/api/v1/auth/token`, {
        method: "GET",
        headers: {
            "Accept": "application/json",
            "Cookie": loginCookies,
            ...(TENANT_ID ? { "X-Tenant-ID": TENANT_ID } : {}),
        },
    });

    if (!tokenRes.ok) {
        console.error("[laventecareToken] Token fetch failed:", tokenRes.status);
        return null;
    }

    const body = await tokenRes.json() as { token?: string };
    const token = body.token;

    if (!token) {
        console.error("[laventecareToken] No token in response");
        return null;
    }

    // Cache 14 minuten (access token leeft ~15 min)
    _cached = { token, expiresAt: Date.now() + 14 * 60 * 1000 };

    return token;
}
