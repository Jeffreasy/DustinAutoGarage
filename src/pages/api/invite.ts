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
 *   - De HttpOnly session cookie wordt automatisch meegestuurd naar LaventeCare.
 *   - LaventeCare verifieert zelf dat de acterende gebruiker minimaal editor is.
 *   - De Astro middleware heeft de sessie al gevalideerd (user is aanwezig in locals).
 *
 * Vereiste: user.role >= "editor" — anders retourneert LaventeCare 403.
 */

import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, locals }) => {
    const user = locals.user;

    // Server-side pre-check: voorkom onnodige backend aanroep voor lagere rollen
    if (!user) {
        return new Response(JSON.stringify({ error: "Niet ingelogd" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Alleen editor en admin mogen uitnodigen (identityRole check)
    const editorRollen = ["editor", "admin"];
    if (!editorRollen.includes(user.role)) {
        return new Response(
            JSON.stringify({ error: "Onvoldoende rechten. Minimaal 'editor'-rol vereist." }),
            { status: 403, headers: { "Content-Type": "application/json" } }
        );
    }

    const apiUrl = import.meta.env.API_URL;
    const tenantId = import.meta.env.TENANT_ID;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: "Ongeldige JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Forward naar LaventeCare — LaventeCare bewaakt zelf het RBAC
    const cookieHeader = request.headers.get("Cookie") ?? "";

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
