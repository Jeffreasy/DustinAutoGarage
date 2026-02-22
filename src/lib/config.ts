/**
 * src/lib/config.ts
 *
 * Gecentraliseerde omgevingsconfiguratie.
 *
 * Alle `import.meta.env.*` aanroepen in het project lopen via dit bestand.
 * Voordelen:
 *   1. Runtime-validatie — ontbrekende vars falen snel met een duidelijke fout.
 *   2. Eén plek om te wijzigen als een URL of ID verandert.
 *   3. TypeScript-compatibel met de ambient types in `env.d.ts`.
 */

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Leest een vereiste env var op en gooit een InternalError als deze ontbreekt.
 * `label` is de naam zoals hij in de README/env.example staat.
 */
function required(key: keyof ImportMetaEnv, label: string): string {
    const value = import.meta.env[key] as string | undefined;
    if (!value) {
        throw new Error(
            `[config] Vereiste omgevingsvariabele "${label}" ontbreekt. ` +
            `Controleer uw .env.local bestand.`
        );
    }
    return value;
}

// ---------------------------------------------------------------------------
// Config object
// ---------------------------------------------------------------------------

/**
 * De enige bron van waarheid voor alle omgevingsvariabelen in dit project.
 *
 * Server-side (Astro middleware, API routes):
 *   config.apiUrl     — LaventeCare Go backend basis-URL
 *   config.tenantId   — UUID van de huidige tenant
 *
 * Client-side (React Islands):
 *   config.publicApiUrl  — zelfde URL, maar gebundeld naar de browser
 *   config.convexUrl     — Convex Cloud deployment URL
 */
export const config = {
    // ── Server-side ────────────────────────────────────────────────────────────
    /** LaventeCare Go backend. Alleen beschikbaar in Astro/Node context. */
    get apiUrl(): string {
        return required("API_URL", "API_URL");
    },

    /** UUID van de huidige tenant. Alleen beschikbaar in Astro/Node context. */
    get tenantId(): string {
        return required("TENANT_ID", "TENANT_ID");
    },

    // ── Client-side (PUBLIC_ prefix = gebundeld door Vite) ────────────────────
    /** LaventeCare Go backend URL voor browser-fetch aanroepen. */
    get publicApiUrl(): string {
        return required("PUBLIC_API_URL", "PUBLIC_API_URL");
    },

    /** Convex Cloud deployment URL voor de React Island client. */
    get convexUrl(): string {
        return required("PUBLIC_CONVEX_URL", "PUBLIC_CONVEX_URL");
    },
} as const;
