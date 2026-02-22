/**
 * src/pages/api/auth/[...path].ts
 *
 * Universele BFF Proxy voor LaventeCare auth endpoints.
 *
 * Browser → /api/auth/*  →  (Astro server-side)  →  LaventeCare /api/v1/auth/*
 *
 * Waarom nodig:
 *   1. CORS: browser mag geen cross-origin requests doen naar auth.laventecare.nl
 *   2. Cookies: HttpOnly cookies met SameSite=None;Secure werken niet op HTTP
 *      localhost. De proxy sanitizeert de Set-Cookie headers voor dev.
 *
 * Wat de proxy doet:
 *   - Stuurt het request volledig door (method, headers, body)
 *   - Pakt de Set-Cookie response headers
 *   - Sanitizeert voor localhost: verwijdert Secure, Domain; zet SameSite=Lax
 *   - Buffeert de response volledig voor betrouwbare streaming (Anti-Gravity pattern)
 */

import type { APIRoute } from "astro";

const API_URL = import.meta.env.API_URL as string;
const TENANT_ID = import.meta.env.TENANT_ID as string;
const IS_DEV = import.meta.env.DEV;

export const ALL: APIRoute = async ({ request, params }) => {
    const path = params.path ?? "";
    const targetUrl = `${API_URL}/api/v1/auth/${path}`;

    // ── Request headers doorgeven ───────────────────────────────────────────
    const forwardHeaders = new Headers();

    // Stuur relevante headers door, sla hop-by-hop headers over
    const skipHeaders = new Set(["host", "connection", "transfer-encoding"]);
    for (const [key, value] of request.headers.entries()) {
        if (!skipHeaders.has(key.toLowerCase())) {
            forwardHeaders.set(key, value);
        }
    }

    // Zorg dat de backend weet dat dit een proxied request is
    forwardHeaders.set("X-Forwarded-For", request.headers.get("x-real-ip") ?? "127.0.0.1");

    // Forceer ongecomprimeerde response van de backend: .text() decompreseert weliswaar,
    // maar sommige Node-versies lekken Content-Encoding headers (br/gzip) door naar de browser
    // waarna de browser probeert dubbel te decomprimeren → ERR_CONTENT_DECODING_FAILED.
    // Door 'identity' te vragen sturen we nooit gecomprimeerd.
    forwardHeaders.set("Accept-Encoding", "identity");

    // Tenant-context: verplicht voor LaventeCare RLS middleware
    if (TENANT_ID) {
        forwardHeaders.set("X-Tenant-ID", TENANT_ID);
    }

    // ── Body doorsturen (Anti-Gravity: gebruik .text() voor betrouwbaarheid) ─
    let body: string | undefined;
    if (!["GET", "HEAD"].includes(request.method)) {
        body = await request.clone().text();
    }

    // ── Backend aanroepen ────────────────────────────────────────────────────
    const backendResponse = await fetch(targetUrl, {
        method: request.method,
        headers: forwardHeaders,
        body: body ?? undefined,
    });

    // ── Response headers verwerken ───────────────────────────────────────────
    const responseHeaders = new Headers();

    // Kopieer alle headers behalve Set-Cookie en transfer-encoding
    for (const [key, value] of backendResponse.headers.entries()) {
        const lkey = key.toLowerCase();
        // Sla ook content-encoding over: .text() decompreseert volledig,
        // waardoor de browser anders probeert dubbel te decomprimeren (ERR_CONTENT_DECODING_FAILED)
        if (lkey !== "set-cookie" && lkey !== "transfer-encoding" && lkey !== "content-encoding") {
            responseHeaders.set(key, value);
        }
    }

    // Set-Cookie apart verwerken via getSetCookie() — headers.entries() collapst
    // meerdere cookies tot één kommagescheiden string (Node fetch bug), wat de
    // cookie-attributen (bijv. Expires=Thu, 01 Jan...) kapot maakt.
    const setCookies = backendResponse.headers.getSetCookie?.() ?? [];
    for (const cookie of setCookies) {
        const sanitized = sanitizeCookieForDev(cookie);
        responseHeaders.append("Set-Cookie", sanitized);
    }

    // ── Response body bufferen (Anti-Gravity: voorkomt hangende streams) ─────
    const responseBody = await backendResponse.text();

    return new Response(responseBody, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: responseHeaders,
    });
};

/**
 * Sanitizeert een Set-Cookie header voor gebruik op localhost (HTTP).
 *
 * Wijzigingen:
 *   - Verwijdert `Secure` flag (localhost is HTTP)
 *   - Verwijdert `Domain=*` attribuut (browsers op localhost weigeren domain cookies)
 *   - Vervangt `SameSite=None` → `SameSite=Lax` (None vereist Secure)
 *   - Zet `Path=/` voor global scope
 *
 * In productie worden de originele cookie headers ongewijzigd doorgestuurd.
 */
function sanitizeCookieForDev(cookie: string): string {
    if (!IS_DEV) return cookie;

    return cookie
        .replace(/;\s*Secure/gi, "")
        .replace(/;\s*Domain=[^;]*/gi, "")
        .replace(/;\s*SameSite=None/gi, "; SameSite=Lax")
        .replace(/;\s*Partitioned/gi, "")
        // Zorg dat Path=/ aanwezig is
        .concat(cookie.toLowerCase().includes("path=") ? "" : "; Path=/");
}
