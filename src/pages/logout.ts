/**
 * src/pages/logout.ts
 *
 * Astro API Route — Sessie afmelden (Anti-Gravity Protocol)
 *
 * Stroom:
 *   1. Browser stuurt GET /logout (via de "Uitloggen" link in het dashboard)
 *   2. Deze route stuurt server-side een POST naar LaventeCare /auth/logout
 *      (met de session cookie — cookie wordt backend-side geïnvalideerd)
 *   3. De client-side cookies worden lokaal gewist via Set-Cookie: Max-Age=0
 *   4. Redirect naar /login?reden=uitgelogd
 *
 * GET ipv POST zodat de eenvoudige <a href="/logout"> link in het dashboard werkt.
 * Een CSRF-aanval via GET is hier niet van toepassing omdat logout geen
 * destructieve data-operatie is.
 */

import type { APIRoute } from "astro";

const API_URL = import.meta.env.API_URL as string;
const TENANT_ID = import.meta.env.TENANT_ID as string;

/** Cookie namen die de backend zet — moeten aan de client-kant ook gewist worden. */
const SESSION_COOKIES = ["access_token", "refresh_token"] as const;

export const GET: APIRoute = async ({ request }) => {
    // ── Stap 1: Backend sessie invalideren ────────────────────────────────────
    try {
        await fetch(`${API_URL}/api/v1/auth/logout`, {
            method: "POST",
            headers: {
                Cookie: request.headers.get("Cookie") ?? "",
                "X-Tenant-ID": TENANT_ID ?? "",
                Accept: "application/json",
            },
        });
    } catch {
        // Netwerk- of backend-fout: ga toch door met uitloggen.
        // De client-side cookies worden sowieso gewist (fail-open).
        console.warn("[logout] Backend /auth/logout aanroep mislukt — cookies worden lokaal gewist.");
    }

    // ── Stap 2: Client-side cookies wissen ────────────────────────────────────
    // Zet cookies op Max-Age=0 zodat de browser ze onmiddellijk verwijdert.
    const headers = new Headers();

    for (const name of SESSION_COOKIES) {
        headers.append(
            "Set-Cookie",
            // SameSite=Lax is veilig voor een gewone navigatie-redirect
            `${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`
        );
    }

    // ── Stap 3: Redirect naar login ───────────────────────────────────────────
    const loginUrl = "/login?reden=uitgelogd";
    headers.set("Location", loginUrl);

    return new Response(null, {
        status: 302,
        headers,
    });
};
