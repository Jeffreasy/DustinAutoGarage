/**
 * src/pages/api/rdw/scans.ts
 *
 * BFF proxy: GET /api/rdw/scans → LaventeCare /api/v1/rdw/scans
 * Geeft de scan history terug voor de huidige tenant.
 */

import type { APIRoute } from "astro";

const API_URL = (import.meta.env.API_URL as string)?.trim();
const TENANT_ID = (import.meta.env.TENANT_ID as string)?.trim();

export const GET: APIRoute = async ({ request }) => {
    const targetUrl = `${API_URL}/api/v1/rdw/scans`;

    const forwardHeaders = new Headers();

    const cookie = request.headers.get("cookie");
    if (cookie) forwardHeaders.set("cookie", cookie);

    const csrf = request.headers.get("x-csrf-token");
    if (csrf) forwardHeaders.set("x-csrf-token", csrf);

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
