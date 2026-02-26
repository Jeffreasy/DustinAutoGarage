/**
 * src/pages/api/rdw/scan-foto.ts
 *
 * BFF proxy: multipart foto-upload → LaventeCare /api/v1/rdw/scan-foto (POST)
 * → xAI Grok Vision OCR → RDW Open Data → JSON { detected_kenteken, voertuig }
 *
 * Browser stuurt FormData met veld "foto" (JPEG/PNG/WebP, max 5 MB).
 */

import type { APIRoute } from "astro";

const API_URL = (import.meta.env.API_URL as string)?.trim();
const TENANT_ID = (import.meta.env.TENANT_ID as string)?.trim();

export const POST: APIRoute = async ({ request }) => {
    // 🔍 DEBUG PROBE — remove after debugging
    console.log("[scan-foto] PROBE HIT — handler is running, method:", request.method);
    return new Response(JSON.stringify({ debug: "probe-ok", ts: Date.now() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });

    const targetUrl = `${API_URL}/api/v1/rdw/scan-foto`;

    const forwardHeaders = new Headers();

    const cookie = request.headers.get("cookie");
    if (cookie) forwardHeaders.set("cookie", cookie);

    const authorization = request.headers.get("authorization");
    if (authorization) forwardHeaders.set("authorization", authorization);

    const csrf = request.headers.get("x-csrf-token");
    if (csrf) forwardHeaders.set("x-csrf-token", csrf);

    if (TENANT_ID) forwardHeaders.set("X-Tenant-ID", TENANT_ID);

    // Forward de multipart/form-data body direct door — NIET zelf parsen
    const body = await request.arrayBuffer();
    const contentType = request.headers.get("content-type");
    if (contentType) forwardHeaders.set("content-type", contentType);

    // Debug: log incoming cookie names (no values) for Vercel log visibility
    const cookieNames = (cookie ?? "").split(";").map(c => c.split("=")[0].trim()).filter(Boolean);
    console.log("[scan-foto] cookie keys:", cookieNames.join(", ") || "(none)");
    console.log("[scan-foto] TENANT_ID present:", !!TENANT_ID, "| body bytes:", body.byteLength);

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

    // Log exact backend error for debugging
    if (!backendResponse.ok) {
        console.error(
            `[scan-foto] backend ${backendResponse.status}:`,
            responseBody.slice(0, 500),
        );
    }

    return new Response(responseBody, {
        status: backendResponse.status,
        headers: { "Content-Type": "application/json" },
    });
};
