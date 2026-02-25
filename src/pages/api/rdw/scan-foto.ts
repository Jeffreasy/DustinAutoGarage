/**
 * src/pages/api/rdw/scan-foto.ts
 *
 * BFF proxy: multipart foto-upload → LaventeCare /api/v1/rdw/scan-foto (POST)
 * → xAI Grok Vision OCR → RDW Open Data → JSON { detected_kenteken, voertuig }
 *
 * Auth-strategie:
 *   1. Service account token via getServiceToken() (server-side, gecached 14 min)
 *   2. Fallback: forward user-cookies (werkt alleen als user weight ≥ 2 heeft)
 *
 * Vereiste Vercel env vars:
 *   LAVENTECARE_SVC_EMAIL + LAVENTECARE_SVC_PASS (voor service account auth)
 *   API_URL, TENANT_ID
 */

import type { APIRoute } from "astro";
import { getServiceToken } from "../../../lib/laventecareToken";

const API_URL = import.meta.env.API_URL as string;
const TENANT_ID = import.meta.env.TENANT_ID as string;

export const POST: APIRoute = async ({ request }) => {
    const targetUrl = `${API_URL}/api/v1/rdw/scan-foto`;

    const forwardHeaders = new Headers();

    // Service account token (preferred) of user-cookies (fallback)
    const svcToken = await getServiceToken();

    if (svcToken) {
        forwardHeaders.set("Authorization", `Bearer ${svcToken}`);
    } else {
        const cookie = request.headers.get("cookie");
        if (cookie) forwardHeaders.set("cookie", cookie);

        const authorization = request.headers.get("authorization");
        if (authorization) forwardHeaders.set("authorization", authorization);

        const csrf = request.headers.get("x-csrf-token");
        if (csrf) forwardHeaders.set("x-csrf-token", csrf);
    }

    if (TENANT_ID) forwardHeaders.set("X-Tenant-ID", TENANT_ID);

    // Forward multipart/form-data body direct door — NIET zelf parsen
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
