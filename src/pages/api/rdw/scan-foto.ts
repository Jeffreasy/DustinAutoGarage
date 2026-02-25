/**
 * src/pages/api/rdw/scan-foto.ts
 *
 * BFF proxy: multipart foto-upload → LaventeCare /api/v1/rdw/scan-foto (POST)
 * → xAI Grok Vision OCR → RDW Open Data → JSON { detected_kenteken, voertuig }
 *
 * Browser stuurt FormData met veld "foto" (JPEG/PNG/WebP, max 5 MB).
 */

import type { APIRoute } from "astro";

const API_URL = import.meta.env.API_URL as string;
const TENANT_ID = import.meta.env.TENANT_ID as string;

export const POST: APIRoute = async ({ request }) => {
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
