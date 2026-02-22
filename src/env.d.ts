/// <reference types="astro/client" />

/**
 * src/env.d.ts
 *
 * Ambient TypeScript types voor dit project.
 *
 * - `App.Locals`    — wat er in `Astro.locals` / `context.locals` zit.
 *                     Gevuld door src/middleware.ts via LaventeCare /auth/me.
 * - `ImportMetaEnv` — alle `import.meta.env.*` variabelen met correcte types.
 *                     TypeScript geeft een compile-time fout bij een onbekende var.
 */

// ---------------------------------------------------------------------------
// Locals type (server-side: middleware → Astro pages)
// ---------------------------------------------------------------------------

interface LaventeUser {
    id: string;
    email: string;
    full_name: string;
    role: "admin" | "editor" | "user" | "viewer";
    tenant_id: string;
}

declare namespace App {
    interface Locals {
        /** Ingelogde gebruiker — gezet door src/middleware.ts. Null als niet ingelogd. */
        user: LaventeUser | null;

        /**
         * Garage domeinrol — gezet door src/middleware.ts na Convex profiel lookup.
         * Null = geen medewerkers-record (cold-start of nieuwe invite).
         * Gebruikt voor server-side grove bewaking van pagina-toegang.
         *
         * Fijne role-gating (knop-niveau) = client-side via useRol() hook.
         */
        domeinRol: "eigenaar" | "balie" | "monteur" | "stagiair" | null;
    }
}


// ---------------------------------------------------------------------------
// Env var types (client + server)
// ---------------------------------------------------------------------------

interface ImportMetaEnv {
    // ── Server-side (geen PUBLIC_ prefix — NOOIT naar de browser gebundeld) ──
    /** LaventeCare Go backend basis-URL. Bijv. https://laventecareauthsystems.onrender.com */
    readonly API_URL: string;

    /** UUID van de huidige tenant. */
    readonly TENANT_ID: string;

    // ── Client-side (PUBLIC_ prefix — gebundeld door Vite naar de browser) ───
    /** LaventeCare Go backend URL voor browser-fetch aanroepen (identiek aan API_URL). */
    readonly PUBLIC_API_URL: string;

    /** Convex Cloud deployment URL. Bijv. https://rosy-seahorse-403.eu-west-1.convex.cloud */
    readonly PUBLIC_CONVEX_URL: string;

    /** Tenant UUID voor optionele directe browser API-aanroepen. */
    readonly PUBLIC_TENANT_ID?: string;

    // ── Convex intern (gezet door npx convex dev) ─────────────────────────────
    /** Convex deployment naam. Bijv. dev:rosy-seahorse-403 */
    readonly CONVEX_DEPLOYMENT?: string;

    /** Convex site URL voor webhooks en HTTP actions. */
    readonly CONVEX_SITE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
