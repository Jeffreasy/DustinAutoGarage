/**
 * src/pages/api/rdw/scan-foto.ts
 *
 * BFF proxy: multipart foto-upload → LaventeCare /api/v1/rdw/scan-foto (POST)
 * → xAI Grok Vision OCR → RDW Open Data → JSON { detected_kenteken, voertuig }
 *
 * Auth: gebruikt service account sessie (LAVENTECARE_SVC_EMAIL + SVC_PASS)
 * zodat de BFF onafhankelijk is van user cookies in de multipart request.
 */

import type { APIRoute } from "astro";
import { getServiceSession } from "../../../lib/laventecareToken";

const API_URL = (import.meta.env.API_URL as string)?.trim();
const TENANT_ID = (import.meta.env.TENANT_ID as string)?.trim();

export const POST: APIRoute = async ({ request }) => {
    // F-01 FIX: Verifieer dat de inkomende request een session-cookie heeft.
    // Requests zonder cookie (niet-ingelogde partijen, bots) worden afgewezen
    // vóórdat de service account sessie en OCR-kosten worden verbruikt.
    const inkomendeCookie = request.headers.get("cookie") ?? "";
    if (!inkomendeCookie) {
        return new Response(JSON.stringify({ error: "Authenticatie vereist" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    const targetUrl = `${API_URL}/api/v1/rdw/scan-foto`;

    const forwardHeaders = new Headers();

    // Tenant context — verplicht voor LaventeCare RLS
    if (TENANT_ID) forwardHeaders.set("X-Tenant-ID", TENANT_ID);

    // Auth: probeer service account sessie
    const session = await getServiceSession();
    if (session) {
        forwardHeaders.set("cookie", session.cookieHeader);
        if (session.csrfToken) forwardHeaders.set("x-csrf-token", session.csrfToken);
        console.log("[scan-foto] using service session auth");
    } else {
        // Fallback: forward user cookies
        const cookie = request.headers.get("cookie") ?? "";
        if (cookie) forwardHeaders.set("cookie", cookie);
        const csrf = request.headers.get("x-csrf-token") ?? "";
        if (csrf) forwardHeaders.set("x-csrf-token", csrf);
        console.log("[scan-foto] service session unavailable, falling back to user cookies");
    }

    // Forward multipart body onveranderd
    const body = await request.arrayBuffer();
    const contentType = request.headers.get("content-type");
    if (contentType) forwardHeaders.set("content-type", contentType);

    console.log("[scan-foto] TENANT_ID:", !!TENANT_ID, "| body bytes:", body.byteLength);

    let backendResponse: Response;
    try {
        backendResponse = await fetch(targetUrl, {
            method: "POST",
            headers: forwardHeaders,
            body,
        });
    } catch (err) {
        console.error("[scan-foto] fetch failed:", err);
        return new Response(JSON.stringify({ error: "Backend niet bereikbaar" }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
        });
    }

    const responseBody = await backendResponse.text();

    if (!backendResponse.ok) {
        console.error(`[scan-foto] backend ${backendResponse.status}:`, responseBody.slice(0, 500));
    }

    return new Response(responseBody, {
        status: backendResponse.status,
        headers: { "Content-Type": "application/json" },
    });
};
