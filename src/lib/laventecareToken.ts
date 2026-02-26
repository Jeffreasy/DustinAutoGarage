/**
 * src/lib/laventecareToken.ts
 *
 * Server-side service account sessie-manager voor LaventeCare BFF proxies.
 *
 * Werking:
 *   1. Server-side login als LAVENTECARE_SVC_EMAIL + LAVENTECARE_SVC_PASS
 *   2. Extraheert Set-Cookie → converteert naar Cookie header formaat
 *   3. Cachet de cookies + csrf_token voor 14 minuten
 *   4. Geeft { cookieHeader, csrfToken } terug voor proxy gebruik
 *
 * Vereiste Vercel env vars:
 *   LAVENTECARE_SVC_EMAIL  — bijv. admin@dustinautogarage.nl
 *   LAVENTECARE_SVC_PASS   — wachtwoord
 *   API_URL                — bijv. https://laventecareauthsystems.onrender.com
 *   TENANT_ID              — UUID van de Dustin tenant
 */

const API_URL = (import.meta.env.API_URL as string)?.trim();
const TENANT_ID = (import.meta.env.TENANT_ID as string)?.trim();
const SVC_EMAIL = (import.meta.env.LAVENTECARE_SVC_EMAIL as string | undefined)?.trim();
const SVC_PASS = (import.meta.env.LAVENTECARE_SVC_PASS as string | undefined)?.trim();

interface ServiceSession {
    /** Cookie header string voor forward naar Go backend */
    cookieHeader: string;
    /** CSRF token voor x-csrf-token header op POST requests */
    csrfToken: string;
    expiresAt: number;
}

let _session: ServiceSession | null = null;

/**
 * Retourneert een geldige service-sessie (cookies + csrf).
 * Logt automatisch opnieuw in als de cache verlopen is.
 */
export async function getServiceSession(): Promise<ServiceSession | null> {
    if (!SVC_EMAIL || !SVC_PASS) return null;

    // Cache check
    if (_session && _session.expiresAt > Date.now()) {
        return _session;
    }

    // Server-side login
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
            // tenant_slug removed: backend uses X-Tenant-ID header (DisallowUnknownFields rejects extras)
        }),
    });

    if (!loginRes.ok) {
        console.error("[laventecareToken] Login mislukt:", loginRes.status, await loginRes.text().catch(() => ""));
        return null;
    }

    // Meerdere Set-Cookie headers correct verwerken
    // Node 18+ fetch implementatie: gebruik getSetCookie() indien beschikbaar
    let setCookieValues: string[] = [];

    if (typeof (loginRes.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === "function") {
        // WHATWG standaard (Node 18.14+)
        setCookieValues = (loginRes.headers as Headers & { getSetCookie: () => string[] }).getSetCookie();
    } else {
        // Fallback: parse raw header (komma-gescheiden in sommige implementaties)
        const raw = loginRes.headers.get("set-cookie") ?? "";
        setCookieValues = raw ? [raw] : [];
    }

    // Converteer Set-Cookie "name=value; Path=/; ..." naar "name=value; name2=value2"
    const cookieHeader = setCookieValues
        .map((h) => h.split(";")[0].trim())   // Alleen name=value
        .filter(Boolean)
        .join("; ");

    // Extraheer csrf_token voor POST-requests
    const csrfMatch = cookieHeader.match(/csrf_token=([^;]+)/);
    const csrfToken = csrfMatch?.[1] ?? "";

    if (!cookieHeader) {
        console.error("[laventecareToken] Geen cookies ontvangen na login");
        return null;
    }

    _session = {
        cookieHeader,
        csrfToken,
        expiresAt: Date.now() + 14 * 60 * 1000, // 14 minuten cache
    };

    return _session;
}
