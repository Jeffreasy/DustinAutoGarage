/**
 * src/pages/api/rdw/scan-foto.ts
 *
 * BFF proxy: multipart foto-upload → LaventeCare /api/v1/rdw/scan-foto (POST)
 * → xAI Grok Vision OCR → RDW Open Data → JSON { detected_kenteken, voertuig }
 *
 * Auth-strategie (in volgorde van prioriteit):
 *   1. LAVENTECARE_TOKEN env var → Bearer header (service account, editor+ rol)
 *   2. Fallback: forward user-cookies (werkt alleen als user zelf editor+ is)
 *
 * Browser stuurt FormData met veld "foto" (JPEG/PNG/WebP, max 5 MB).
 */

import type { APIRoute } from "astro";

const API_URL = import.meta.env.API_URL as string;
const TENANT_ID = import.meta.env.TENANT_ID as string;
// Service account token met editor+ rechten — staat in Vercel env vars
const SVC_TOKEN = import.meta.env.LAVENTECARE_TOKEN as string | undefined;

export const POST: APIRoute = async ({ request }) => {
    const targetUrl = `${API_URL}/api/v1/rdw/scan-foto`;

    const forwardHeaders = new Headers();

    if (SVC_TOKEN) {
        // Service-account pad: vaste token met editor+ rol
        forwardHeaders.set("Authorization", `Bearer ${SVC_TOKEN}`);
    } else {
        // Fallback: forward user-cookies (vereist zelf editor+ rol in LaventeCare)
        const cookie = request.headers.get("cookie");
        if (cookie) forwardHeaders.set("cookie", cookie);

        const authorization = request.headers.get("authorization");
        if (authorization) forwardHeaders.set("authorization", authorization);
    }

    // CSRF forwarden (vereist door LaventeCare op POST-routes)
    const csrf = request.headers.get("x-csrf-token");
    if (csrf) forwardHeaders.set("x-csrf-token", csrf);

    if (TENANT_ID) forwardHeaders.set("X-Tenant-ID", TENANT_ID);

    // Forward de multipart/form-data body direct door — NIET zelf parsen
    const body = await request.arrayBuffer();
    const contentType = request.headers.get("content-type");
    if (contentType) forwardHeaders.set("content-type", contentType);

    const backendResponse = await fetch(targetUrl, {
        method: "POST",
        headers: forwardHeaders,
        body,
    });

    const responseBody = await backendResponse.text();

    return new Response(responseBody, {
        status: backendResponse.status,
        headers: { "Content-Type": "application/json" },
    });
};
