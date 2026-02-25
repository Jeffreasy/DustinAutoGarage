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
 * requireAuth — resolveert de TENANT tokenIdentifier voor de ingelogde gebruiker.
 *
 * ⚠️ KRITIEK: altijd de eigenaar's tokenIdentifier retourneren als tenant-anchor.
 *
 * Strategie:
 *   1. Vind het eigen medewerkersdocument via userId (identity.subject)
 *   2. Als eigenaar → return eigen tokenIdentifier (= anchor zelf)
 *   3. Als andere rol → zoek de eigenaar op en return díens tokenIdentifier
 *   4. Fallback: raw JWT tokenIdentifier (cold-start, nog geen medewerkers)
 *
 * Dit is robuust: werkt ongeacht de opgeslagen tokenIdentifier in het medewerkerrecord.
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

    // Stap 1: zoek eigen medewerkersdocument via userId
    const mijnRecord = await ctx.db
        .query("medewerkers")
        .withIndex("by_userId", (q) =>
            q.eq("userId", identity.subject)
        )
        .filter((q) => q.eq(q.field("actief"), true))
        .unique();

    // Stap 2: eigenaar IS de tenant anchor — return eigen tokenIdentifier
    if (mijnRecord?.domeinRol === "eigenaar") {
        return mijnRecord.tokenIdentifier;
    }

    // Stap 3a: niet-eigenaar met een bestaand medewerkerrecord —
    // seedDevMedewerker heeft de juiste eigenaar-tokenIdentifier al opgeslagen.
    // Dit is de snelle, correcte route voor balie/monteur/stagiair.
    if (mijnRecord?.tokenIdentifier) {
        return mijnRecord.tokenIdentifier;
    }

    // Stap 3b: geen medewerkerrecord (cold-start: eerste keer inloggen vóór seeding).
    // ⚠️ B-01 FIX: We zoeken NIET meer via een issuerPrefix-wildcard (kwetsbaar voor cross-tenant
    // lekkage als meerdere tenants dezelfde issuer delen). In plaats daarvan accepteren we de
    // cold-start situatie veilig: return raw JWT als tenant-scope. Queries vinden dan niets
    // (lege dataset), wat correct en veilig is. De eigenaar moet ensureEigenaar aanroepen.

    // Stap 4: totale cold-start — raw JWT als fallback (veilig: isolatie via lege resultatenset)
    return identity.tokenIdentifier;
}

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

    // Strategie 1: zoek op userId (snel, exact)
    const viaUserId = await ctx.db
        .query("medewerkers")
        .withIndex("by_userId", (q) =>
            q.eq("userId", identity.subject)
        )
        .filter((q) => q.eq(q.field("actief"), true))
        .unique();

    if (viaUserId) return viaUserId;

    // Strategie 2: fallback op tokenIdentifier (dekt records zonder userId)
    const viaToken = await ctx.db
        .query("medewerkers")
        .withIndex("by_token_identifier", (q) =>
            q.eq("tokenIdentifier", identity.tokenIdentifier)
        )
        .filter((q) => q.eq(q.field("actief"), true))
        .unique();

    return viaToken ?? null;
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

    // B-06 FIX: onbekende domeinRol geeft undefined → NaN, wat altijd < vereistGewicht is false.
    // Expliciet -1 toewijzen zodat onbekende rollen altijd geblokkeerd worden.
    const gebruikerGewicht = DOMEIN_ROL_GEWICHT[profiel.domeinRol as DomeinRol] ?? -1;
    const vereistGewicht = DOMEIN_ROL_GEWICHT[minRol];

    if (gebruikerGewicht === -1) {
        throw new Error(
            `FORBIDDEN: Onbekende domeinRol '${profiel.domeinRol}' — ` +
            "toegang geweigerd. Neem contact op met de eigenaar."
        );
    }

    if (gebruikerGewicht < vereistGewicht) {
        throw new Error(
            `FORBIDDEN: Deze actie vereist minimaal de rol '${minRol}'. ` +
            `Jouw huidige rol is '${profiel.domeinRol}'.`
        );
    }

    return profiel;
}
