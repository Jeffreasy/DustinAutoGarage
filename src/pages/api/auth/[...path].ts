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
 * CORS fix (productie):
 *   De proxy schrijft ZELF de juiste Access-Control-* headers op basis van de
 *   echte request origin. NOOIT upstream CORS headers doorsturen — die bevatten
 *   de LaventeCare origin, niet de Vercel app origin, en blokkeren cookies.
 */

import type { APIRoute } from "astro";

const API_URL = import.meta.env.API_URL as string;
const TENANT_ID = import.meta.env.TENANT_ID as string;
const IS_DEV = import.meta.env.DEV;

// Headers die NOOIT van de upstream doorgestuurd worden naar de browser.
// CORS headers moeten altijd door de BFF zelf worden gezet op basis van de
// echte request origin — nooit van de upstream kopiëren.
const STRIP_RESPONSE_HEADERS = new Set([
    "set-cookie",
    "transfer-encoding",
    "content-encoding",
    "access-control-allow-origin",
    "access-control-allow-credentials",
    "access-control-allow-methods",
    "access-control-allow-headers",
    "access-control-expose-headers",
    "access-control-max-age",
]);

export const ALL: APIRoute = async ({ request, params }) => {
    const path = params.path ?? "";
    const targetUrl = `${API_URL}/api/v1/auth/${path}`;

    // ── Bepaal de correcte CORS origin voor deze response ───────────────────
    // Gebruik de request origin als die er is; val terug op de PUBLIC_SITE_URL.
    const requestOrigin = request.headers.get("origin") ?? "";
    const siteUrl = import.meta.env.SITE ?? (import.meta.env.PUBLIC_SITE_URL as string | undefined) ?? "";

    // Lijst van toegestane origins (dev + productie Vercel URL)
    const allowedOrigins = [
        "http://localhost:4321",
        "http://localhost:3000",
        ...(siteUrl ? [siteUrl.replace(/\/$/, "")] : []),
    ].filter(Boolean);

    const corsOrigin = allowedOrigins.includes(requestOrigin)
        ? requestOrigin
        : (allowedOrigins[0] ?? requestOrigin);

    // ── Preflight OPTIONS afhandelen ─────────────────────────────────────────
    // Astro/Vercel kan preflight requests krijgen; we handelen ze direct af
    // zonder de LaventeCare backend te raken.
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": corsOrigin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Tenant-ID",
                "Access-Control-Max-Age": "86400",
                "Vary": "Origin",
            },
        });
    }

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

    // Kopieer alle headers BEHALVE de gestriplijst.
    // Sla ook content-encoding over: .text() decompreseert volledig,
    // waardoor de browser anders probeert dubbel te decomprimeren.
    for (const [key, value] of backendResponse.headers.entries()) {
        if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
            responseHeaders.set(key, value);
        }
    }

    // Schrijf eigen CORS headers — altijd gebaseerd op de request origin,
    // NOOIT upstream headers doorsturen.
    responseHeaders.set("Access-Control-Allow-Origin", corsOrigin);
    responseHeaders.set("Access-Control-Allow-Credentials", "true");
    responseHeaders.set("Vary", "Origin");

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
