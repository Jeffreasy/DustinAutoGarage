/**
 * src/pages/api/invite.ts
 *
 * Astro API Route — Proxy naar LaventeCare /users/invite
 *
 * Stroom:
 *   Frontend MedewerkersIsland → POST /api/invite
 *     → LaventeCare POST /api/v1/users/invite (editor+ RBAC)
 *     → { token: string, link: string }
 *
 * Beveiligingsmodel:
 *   - /api/* routes zijn PUBLIEK in de Astro middleware (locals.user is NIET gezet).
 *   - Deze route valideert de sessie zelf via een server-to-server aanroep naar /auth/me.
 *   - De HttpOnly session cookie wordt doorgestuurd vanuit de inkomende request headers.
 *   - LaventeCare verifieert zelf dat de acterende gebruiker minimaal editor is.
 *
 * Vereiste: user.role >= "editor" — anders retourneert LaventeCare 403.
 */

import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
    const apiUrl = import.meta.env.API_URL;
    const tenantId = import.meta.env.TENANT_ID;
    const cookieHeader = request.headers.get("Cookie") ?? "";

    // ── Stap 1: Valideer sessie zelf (middleware slaat /api/* over) ──────────
    // locals.user is NOOIT gezet voor API routes — we moeten /auth/me zelf aanroepen.
    try {
        const meResponse = await fetch(`${apiUrl}/api/v1/auth/me`, {
            method: "GET",
            headers: {
                Cookie: cookieHeader,
                Accept: "application/json",
                ...(tenantId ? { "X-Tenant-ID": tenantId } : {}),
            },
        });

        if (!meResponse.ok) {
            return new Response(
                JSON.stringify({ error: "Niet ingelogd of sessie verlopen" }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const meData = await meResponse.json();
        const user = meData.user ?? meData;

        // Server-side pre-check: voorkom onnodige backend aanroep voor lagere rollen
        const editorRollen = ["editor", "admin"];
        if (!user?.role || !editorRollen.includes(user.role)) {
            return new Response(
                JSON.stringify({ error: "Onvoldoende rechten. Minimaal 'editor'-rol vereist." }),
                { status: 403, headers: { "Content-Type": "application/json" } }
            );
        }
    } catch {
        return new Response(
            JSON.stringify({ error: "Auth-backend niet bereikbaar" }),
            { status: 502, headers: { "Content-Type": "application/json" } }
        );
    }

    // ── Stap 2: Lees invite body ─────────────────────────────────────────────
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return new Response(
            JSON.stringify({ error: "Ongeldige JSON body" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    // ── Stap 3: Forward naar LaventeCare ────────────────────────────────────
    try {
        const backendResponse = await fetch(`${apiUrl}/api/v1/users/invite`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Cookie": cookieHeader,
                ...(tenantId ? { "X-Tenant-ID": tenantId } : {}),
            },
            body: JSON.stringify(body),
        });

        const responseText = await backendResponse.text();

        return new Response(responseText, {
            status: backendResponse.status,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("[invite proxy] LaventeCare aanroep mislukt:", err);
        return new Response(
            JSON.stringify({ error: "Backend niet bereikbaar" }),
            { status: 502, headers: { "Content-Type": "application/json" } }
        );
    }
};
