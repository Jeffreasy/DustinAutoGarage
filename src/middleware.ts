/**
 * src/middleware.ts
 *
 * Astro Middleware — Session Guard (Anti-Gravity Protocol)
 *
 * Beveiligde routes worden gevalideerd via een server-to-server aanroep naar
 * LaventeCare's /auth/me endpoint. De HttpOnly cookie wordt automatisch
 * meegestuurd via `credentials: "include"` in node-fetch context.
 *
 * Als de sessie geldig is → user wordt opgeslagen in `context.locals.user`.
 * Als de sessie ontbreekt/verlopen is → redirect naar /login.
 *
 * Publieke routes (/, /login, /api/*, assets) worden niet gecheckt.
 */

import { defineMiddleware } from "astro:middleware";

/** Routes die GEEN auth-check vereisen */
const PUBLIC_PATHS = ["/", "/login", "/favicon.svg", "/favicon.ico"];

/** Alle paden die beginnen met deze prefixes zijn ook publiek */
const PUBLIC_PREFIXES = ["/_astro/", "/api/"];

export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname } = context.url;

    // ── Check of route publiek is ──────────────────────────────────────────
    const isPublic =
        PUBLIC_PATHS.includes(pathname) ||
        PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (isPublic) {
        return next();
    }

    // ── Server-to-server validatie ─────────────────────────────────────────
    const apiUrl = import.meta.env.API_URL; // Server-side (niet PUBLIC_)
    const tenantId = import.meta.env.TENANT_ID;

    try {
        const meResponse = await fetch(`${apiUrl}/api/v1/auth/me`, {
            method: "GET",
            headers: {
                // Forward de cookies vanuit de inkomende request naar de Go backend
                Cookie: context.request.headers.get("Cookie") ?? "",
                "Accept": "application/json",
                // Tenant-context: verplicht voor LaventeCare RLS middleware
                ...(tenantId ? { "X-Tenant-ID": tenantId } : {}),
            },
        });

        if (!meResponse.ok) {
            // Sessie ongeldig of verlopen → redirect naar login
            return context.redirect(`/login?reden=sessie_verlopen`);
        }

        // Bewaar het user-object in locals zodat pagina's het kunnen gebruiken
        const userProfile = await meResponse.json();
        context.locals.user = userProfile.user ?? userProfile;
    } catch {
        // Netwerk-/backend-fout → stuur door naar login (fail-safe)
        return context.redirect(`/login?reden=auth_fout`);
    }

    return next();
});
