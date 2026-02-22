/**
 * src/lib/auth.ts
 *
 * Browser-side auth helpers (Anti-Gravity Protocol).
 *
 * Beveiligingscontract:
 *   ✅  Tokens leven uitsluitend in React state (heap memory).
 *   ✅  Nooit localStorage, sessionStorage, of zichtbare cookies.
 *   ✅  Elke fetch gaat met `credentials: "include"` — HttpOnly cookie
 *       wordt automatisch meegestuurd door de browser.
 *
 * Geëxporteerde API:
 *   fetchConvexToken()  — Haalt het RS256 JWT op voor de Convex client
 *   logout()            — Meldt de sessie af bij de backend
 *   redirectToLogin()   — Stuurt de gebruiker naar /login (met reden)
 */

import { apiFetch, ApiError } from "./api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TokenResponse {
    token: string;
}

// ---------------------------------------------------------------------------
// Token ophalen (satellite token flow)
// ---------------------------------------------------------------------------

/**
 * Haalt het RS256 JWT op via de BFF proxy.
 * Dit token wordt uitsluitend in React-staat bewaard en doorgegeven aan Convex.
 *
 * @returns Het JWT als string
 * @throws ApiError(401) als de sessie verlopen of ongeldig is
 * @throws Error als de response een onverwachte structuur heeft
 */
export async function fetchConvexToken(): Promise<string> {
    const data = await apiFetch<TokenResponse>("/api/auth/token");

    if (!data.token || typeof data.token !== "string") {
        throw new Error(
            "[auth] Malformed token response: verwacht { token: string }. " +
            "Controleer of GET /api/v1/auth/token het juiste JSON-formaat retourneert."
        );
    }

    return data.token;
}

// ---------------------------------------------------------------------------
// Uitloggen
// ---------------------------------------------------------------------------

/**
 * Meldt de huidige sessie af bij de LaventeCare backend.
 * De backend invalideert het session cookie server-side.
 *
 * Na een succesvolle logout wordt automatisch doorgestuurd naar /login.
 * Bij een netwerk- of server-fout wordt alsnog doorgestuurd (fail-open,
 * want de lokale cookie is door de `logout.ts` route al gewist).
 */
export async function logout(): Promise<void> {
    try {
        await apiFetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
        // Log de fout maar stuur altijd door — de BFF route wist de cookie
        if (err instanceof ApiError) {
            console.warn(`[auth] logout: backend retourneerde ${err.status}`, err.body);
        } else {
            console.warn("[auth] logout: netwerk fout tijdens afmelden", err);
        }
    } finally {
        redirectToLogin("uitgelogd");
    }
}

// ---------------------------------------------------------------------------
// Redirect helper
// ---------------------------------------------------------------------------

/**
 * Stuurt de browser door naar de login pagina.
 * Het `reden` argument verschijnt als query parameter voor de UI.
 *
 * @param reden - Optionele reden, bijv. "sessie_verlopen" of "uitgelogd"
 */
export function redirectToLogin(reden?: string): never {
    const url = reden ? `/login?reden=${encodeURIComponent(reden)}` : "/login";
    window.location.href = url;
    // TypeScript `never` — na deze regel wordt niets meer uitgevoerd
    throw new Error("[auth] redirectToLogin: onbereikbaar punt");
}
