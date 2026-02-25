/**
 * src/pages/api/rdw/[kenteken].ts
 *
 * BFF-proxy voor de RDW Open Data kenteken-lookup (GET).
 *
 * Auth-strategie:
 *   1. Service account token via getServiceToken() (server-side, gecached 14 min)
 *   2. Fallback: forward user-cookies
 *
 * Vereiste Vercel env vars:
 *   LAVENTECARE_SVC_EMAIL + LAVENTECARE_SVC_PASS
 *   API_URL, TENANT_ID
 */

import type { APIRoute } from "astro";
import { getServiceToken } from "../../../lib/laventecareToken";

const API_URL = import.meta.env.API_URL as string;
const TENANT_ID = import.meta.env.TENANT_ID as string;

export const GET: APIRoute = async ({ request, params }) => {
    const kenteken = params.kenteken ?? "";
    const targetUrl = `${API_URL}/api/v1/rdw/voertuig/${encodeURIComponent(kenteken)}`;

    const forwardHeaders = new Headers();

    const svcToken = await getServiceToken();

    if (svcToken) {
        forwardHeaders.set("Authorization", `Bearer ${svcToken}`);
    } else {
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
