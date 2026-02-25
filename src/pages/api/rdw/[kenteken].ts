/**
 * src/pages/api/rdw/[kenteken].ts
 *
 * BFF-proxy voor de RDW Open Data kenteken-lookup.
 *
 * Browser → /api/rdw/{kenteken}
 *   → (Astro server-side)
 *     → LaventeCare /api/v1/rdw/voertuig/{kenteken} (editor+)
 *
 * Auth-strategie (in volgorde van prioriteit):
 *   1. LAVENTECARE_TOKEN env var → Bearer header (service account, editor+ rol)
 *   2. Fallback: forward user-cookies (werkt alleen als user zelf editor+ is)
 */

import type { APIRoute } from "astro";

const API_URL = import.meta.env.API_URL as string;
const TENANT_ID = import.meta.env.TENANT_ID as string;
// Service account token met editor+ rechten — staat in Vercel env vars
const SVC_TOKEN = import.meta.env.LAVENTECARE_TOKEN as string | undefined;

export const GET: APIRoute = async ({ request, params }) => {
    const kenteken = params.kenteken ?? "";
    const targetUrl = `${API_URL}/api/v1/rdw/voertuig/${encodeURIComponent(kenteken)}`;

    const forwardHeaders = new Headers();

    if (SVC_TOKEN) {
        // Service-account pad: vaste token met editor+ rol
        forwardHeaders.set("Authorization", `Bearer ${SVC_TOKEN}`);
    } else {
        // Fallback: forward user-cookies
        const cookie = request.headers.get("cookie");
        if (cookie) forwardHeaders.set("cookie", cookie);

        const csrf = request.headers.get("x-csrf-token");
        if (csrf) forwardHeaders.set("x-csrf-token", csrf);
    }

    forwardHeaders.set("Accept", "application/json");
    forwardHeaders.set("Accept-Encoding", "identity");

    if (TENANT_ID) forwardHeaders.set("X-Tenant-ID", TENANT_ID);

    const backendResponse = await fetch(targetUrl, {
        method: "GET",
        headers: forwardHeaders,
    });

    const body = await backendResponse.text();

    return new Response(body, {
        status: backendResponse.status,
        headers: { "Content-Type": "application/json" },
    });
};
