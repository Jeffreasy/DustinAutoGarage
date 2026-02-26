/**
 * src/pages/api/rdw/[kenteken].ts
 *
 * BFF-proxy voor de RDW Open Data kenteken-lookup.
 *
 * Browser → /api/rdw/{kenteken}
 *   → (Astro server-side)
 *     → LaventeCare /api/v1/rdw/voertuig/{kenteken}  (auth-beveiligd, editor+)
 *
 * Stuurt cookies en X-Tenant-ID mee zodat de Go backend de gebruiker kan herkennen.
 */

import type { APIRoute } from "astro";

const API_URL = (import.meta.env.API_URL as string)?.trim();
const TENANT_ID = (import.meta.env.TENANT_ID as string)?.trim();

export const GET: APIRoute = async ({ request, params }) => {
    const kenteken = params.kenteken ?? "";
    const targetUrl = `${API_URL}/api/v1/rdw/voertuig/${encodeURIComponent(kenteken)}`;

    const forwardHeaders = new Headers();

    // Forward cookies (access_token, csrf_token) for auth.
    const cookie = request.headers.get("cookie");
    if (cookie) forwardHeaders.set("cookie", cookie);

    // Forward CSRF token if present.
    const csrf = request.headers.get("x-csrf-token");
    if (csrf) forwardHeaders.set("x-csrf-token", csrf);

    forwardHeaders.set("Accept", "application/json");
    forwardHeaders.set("Accept-Encoding", "identity");

    if (TENANT_ID) {
        forwardHeaders.set("X-Tenant-ID", TENANT_ID);
    }

    const backendResponse = await fetch(targetUrl, {
        method: "GET",
        headers: forwardHeaders,
    });

    // Buffer the response body (Anti-Gravity: prevents hanging streams).
    const body = await backendResponse.text();

    return new Response(body, {
        status: backendResponse.status,
        headers: {
            "Content-Type": "application/json",
        },
    });
};
