/**
 * convex/helpers.ts
 *
 * Gedeelde helper-functies voor alle Convex query- en mutatie-handlers.
 *
 * Centraliseert auth + domain-rol helpers zodat ze niet gedupliceerd worden.
 *
 * Gebruik (gelaagd patroon):
 *   1. const tokenIdentifier = await requireAuth(ctx);
 *   2. const profiel = await getDomeinProfiel(ctx);     // optioneel: voor rol-checks
 *   3. await requireDomainRole(ctx, "eigenaar");         // optioneel: voor hard-gate
 */

import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Type exports (DRY — wordt ook in UI-componenten gebruikt via ApiReturnType)
// ---------------------------------------------------------------------------

export type DomeinRol = "eigenaar" | "balie" | "monteur" | "stagiair";

/** Hiërarchische gewichten — hogere waarde = meer rechten */
const DOMEIN_ROL_GEWICHT: Record<DomeinRol, number> = {
    eigenaar: 4,
    balie: 3,
    monteur: 2,
    stagiair: 1,
};

// ---------------------------------------------------------------------------
// Identity helpers
// ---------------------------------------------------------------------------

/**
 * requireAuth — resolveert de tokenIdentifier van de ingelogde gebruiker.
 * Gooit UNAUTHORIZED als de sessie ontbreekt.
 *
 * Gebruik als allereerste aanroep in elke beveiligde handler.
 */
export async function requireAuth(
    ctx: QueryCtx | MutationCtx
): Promise<string> {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
        throw new Error(
            "UNAUTHORIZED: Deze operatie vereist een actieve LaventeCare-sessie. " +
            "Zorg dat de Convex client een geldig RS256 JWT heeft via GET /api/v1/auth/token."
        );
    }

    return identity.tokenIdentifier;
}

/**
 * getIdentity — geeft het volledige identity object terug.
 * Handig wanneer je zowel tokenIdentifier als subject nodig hebt.
 */
export async function getIdentity(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
        throw new Error("UNAUTHORIZED: Geen actieve LaventeCare-sessie gevonden.");
    }
    return identity;
}

// ---------------------------------------------------------------------------
// Domain role helpers
// ---------------------------------------------------------------------------

/**
 * getDomeinProfiel — haalt het medewerkers-record op voor de ingelogde user.
 *
 * Retourneert `null` als:
 *   - De user nog niet gekoppeld is (cold-start / nieuwe medewerker)
 *   - De user gedeactiveerd is (actief=false)
 *
 * @example
 *   const profiel = await getDomeinProfiel(ctx);
 *   if (!profiel) throw new Error("FORBIDDEN: Geen garage-toegang");
 */
export async function getDomeinProfiel(
    ctx: QueryCtx | MutationCtx
): Promise<Doc<"medewerkers"> | null> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // userId is the `sub` claim embedded in the tokenIdentifier after the pipe
    // tokenIdentifier format: "<issuer>|<sub>"  →  sub = "<tenantId>:<userId>"
    // We index by tokenIdentifier for exact match (tenant-isolated).
    const profiel = await ctx.db
        .query("medewerkers")
        .withIndex("by_token_identifier", (q) =>
            q.eq("tokenIdentifier", identity.tokenIdentifier)
        )
        .filter((q) => q.eq(q.field("actief"), true))
        .unique();

    return profiel ?? null;
}

/**
 * requireDomainRole — blokkeert toegang als de user de vereiste domeinrol niet heeft.
 *
 * Ondersteunt hiërarchische checks: als je "balie" vereist, hebben "eigenaar" ook toegang.
 *
 * @param ctx    — Convex query of mutation context
 * @param minRol — minimaal vereiste rol (inclusief hogere rollen)
 *
 * @example
 *   await requireDomainRole(ctx, "balie"); // eigenaar + balie = OK, monteur/stagiair = 403
 */
export async function requireDomainRole(
    ctx: QueryCtx | MutationCtx,
    minRol: DomeinRol
): Promise<Doc<"medewerkers">> {
    const profiel = await getDomeinProfiel(ctx);

    if (!profiel) {
        throw new Error(
            "FORBIDDEN: Je bent niet gekoppeld als medewerker van deze garage. " +
            "Vraag de eigenaar om je toe te voegen via het medewerkers-beheer."
        );
    }

    const gebruikerGewicht = DOMEIN_ROL_GEWICHT[profiel.domeinRol as DomeinRol];
    const vereistGewicht = DOMEIN_ROL_GEWICHT[minRol];

    if (gebruikerGewicht < vereistGewicht) {
        throw new Error(
            `FORBIDDEN: Deze actie vereist minimaal de rol '${minRol}'. ` +
            `Jouw huidige rol is '${profiel.domeinRol}'.`
        );
    }

    return profiel;
}
