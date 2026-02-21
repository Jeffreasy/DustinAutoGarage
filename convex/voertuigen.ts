/**
 * convex/voertuigen.ts
 *
 * Beveiligde Convex queries en mutaties voor `voertuigen` en `onderhoudshistorie`.
 *
 * Beveiligingscontract:
 *   - `requireAuth()` wordt als eerste aangeroepen in elke handler.
 *   - Alle DB-reads zijn gefilterd op `tokenIdentifier` (tenant-isolatie).
 *   - IDOR-bescherming: getById verifieert altijd de eigenaar vóór teruggave.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Interne hulpfunctie
// ---------------------------------------------------------------------------

/**
 * Resolveert de tokenIdentifier van de ingelogde gebruiker.
 * Gooit een duidelijke foutmelding als de sessie ontbreekt.
 * Accepteert zowel QueryCtx als MutationCtx (beide hebben .auth).
 */
async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string> {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
        throw new Error(
            "UNAUTHORIZED: Deze operatie vereist een actieve LaventeCare-sessie. " +
            "Zorg dat de Convex client een geldig RS256 JWT heeft ontvangen via GET /api/v1/auth/token."
        );
    }

    return identity.tokenIdentifier;
}

// ---------------------------------------------------------------------------
// Queries — voertuigen
// ---------------------------------------------------------------------------

/**
 * list — Alle voertuigen voor de huidige tenant-sessie.
 * Gesorteerd op aanmaakdatum (nieuwste eerst).
 */
export const list = query({
    args: {},
    handler: async (ctx): Promise<Doc<"voertuigen">[]> => {
        const tokenIdentifier = await requireAuth(ctx);

        return ctx.db
            .query("voertuigen")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
            )
            .order("desc")
            .collect();
    },
});

/**
 * getById — Eén voertuig op basis van ID.
 * Retourneert null als het voertuig niet bestaat of niet toebehoort
 * aan de sessie (IDOR-bescherming).
 */
export const getById = query({
    args: { voertuigId: v.id("voertuigen") },
    handler: async (ctx, args): Promise<Doc<"voertuigen"> | null> => {
        const tokenIdentifier = await requireAuth(ctx);
        const voertuig = await ctx.db.get(args.voertuigId);

        if (!voertuig || voertuig.tokenIdentifier !== tokenIdentifier) {
            return null;
        }

        return voertuig;
    },
});

/**
 * getByKlant — Alle voertuigen van één specifieke klant.
 */
export const getByKlant = query({
    args: { klantId: v.id("klanten") },
    handler: async (ctx, args): Promise<Doc<"voertuigen">[]> => {
        const tokenIdentifier = await requireAuth(ctx);

        const klant = await ctx.db.get(args.klantId);
        if (!klant || klant.tokenIdentifier !== tokenIdentifier) {
            return [];
        }

        return ctx.db
            .query("voertuigen")
            .withIndex("by_klant", (q) => q.eq("klantId", args.klantId))
            .order("desc")
            .collect();
    },
});

/**
 * getBijnaVerlopenApk — Voertuigen waarvan de APK binnen X dagen verloopt.
 */
export const getBijnaVerlopenApk = query({
    args: {
        dagenVooruit: v.optional(v.number()),
    },
    handler: async (ctx, args): Promise<Doc<"voertuigen">[]> => {
        const tokenIdentifier = await requireAuth(ctx);
        const dagen = args.dagenVooruit ?? 30;
        const nu = Date.now();
        const grens = nu + dagen * 24 * 60 * 60 * 1000;

        const alleVoertuigen = await ctx.db
            .query("voertuigen")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
            )
            .collect();

        return alleVoertuigen.filter(
            (voertuig) =>
                voertuig.apkVervaldatum !== undefined &&
                voertuig.apkVervaldatum > nu &&
                voertuig.apkVervaldatum <= grens
        );
    },
});

// ---------------------------------------------------------------------------
// Mutaties — voertuigen
// ---------------------------------------------------------------------------

/**
 * create — Registreer een nieuw voertuig voor een klant.
 */
export const create = mutation({
    args: {
        klantId: v.id("klanten"),
        kenteken: v.string(),
        merk: v.string(),
        model: v.string(),
        bouwjaar: v.number(),
        brandstof: v.union(
            v.literal("Benzine"),
            v.literal("Diesel"),
            v.literal("Hybride"),
            v.literal("EV"),
            v.literal("LPG")
        ),
        vin: v.optional(v.string()),
        meldcode: v.optional(v.string()),
        kilometerstand: v.optional(v.number()),
        apkVervaldatum: v.optional(v.number()),
        voertuigNotities: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<Id<"voertuigen">> => {
        const tokenIdentifier = await requireAuth(ctx);

        const klant = await ctx.db.get(args.klantId);
        if (!klant || klant.tokenIdentifier !== tokenIdentifier) {
            throw new Error(
                "FORBIDDEN: Het opgegeven klantId behoort niet tot de huidige sessie."
            );
        }

        return ctx.db.insert("voertuigen", {
            ...args,
            tokenIdentifier,
            aangemaaktOp: Date.now(),
        });
    },
});

/**
 * updateKilometerstand — Snel een nieuwe kilometerstand registreren.
 */
export const updateKilometerstand = mutation({
    args: {
        voertuigId: v.id("voertuigen"),
        nieuweKilometerstand: v.number(),
    },
    handler: async (ctx, args): Promise<void> => {
        const tokenIdentifier = await requireAuth(ctx);

        const voertuig = await ctx.db.get(args.voertuigId);
        if (!voertuig || voertuig.tokenIdentifier !== tokenIdentifier) {
            throw new Error("FORBIDDEN: Voertuig niet gevonden of geen toegang.");
        }

        await ctx.db.patch(args.voertuigId, {
            kilometerstand: args.nieuweKilometerstand,
        });
    },
});

// ---------------------------------------------------------------------------
// Queries — onderhoudshistorie
// ---------------------------------------------------------------------------

/**
 * getHistorie — Volledig dossier van alle werkzaamheden voor één voertuig.
 */
export const getHistorie = query({
    args: { voertuigId: v.id("voertuigen") },
    handler: async (ctx, args): Promise<Doc<"onderhoudshistorie">[]> => {
        const tokenIdentifier = await requireAuth(ctx);

        const voertuig = await ctx.db.get(args.voertuigId);
        if (!voertuig || voertuig.tokenIdentifier !== tokenIdentifier) {
            return [];
        }

        return ctx.db
            .query("onderhoudshistorie")
            .withIndex("by_voertuig", (q) => q.eq("voertuigId", args.voertuigId))
            .order("desc")
            .collect();
    },
});

// ---------------------------------------------------------------------------
// Mutaties — onderhoudshistorie
// ---------------------------------------------------------------------------

/**
 * registreerOnderhoud — Voeg een nieuwe onderhoudsbeurt toe aan het dossier.
 * Synchroniseert automatisch de kilometerstand op het voertuig.
 */
export const registreerOnderhoud = mutation({
    args: {
        voertuigId: v.id("voertuigen"),
        datumUitgevoerd: v.number(),
        typeWerk: v.union(
            v.literal("Grote Beurt"),
            v.literal("Kleine Beurt"),
            v.literal("APK"),
            v.literal("Reparatie"),
            v.literal("Bandenwisseling"),
            v.literal("Schadeherstel"),
            v.literal("Diagnostiek"),
            v.literal("Overig")
        ),
        kmStandOnderhoud: v.number(),
        documentUrl: v.optional(v.string()),
        werkNotities: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<Id<"onderhoudshistorie">> => {
        const tokenIdentifier = await requireAuth(ctx);

        const voertuig = await ctx.db.get(args.voertuigId);
        if (!voertuig || voertuig.tokenIdentifier !== tokenIdentifier) {
            throw new Error("FORBIDDEN: Voertuig niet gevonden of geen toegang.");
        }

        // Houd kilometerstand altijd actueel op het voertuig zelf
        if (
            voertuig.kilometerstand === undefined ||
            args.kmStandOnderhoud > voertuig.kilometerstand
        ) {
            await ctx.db.patch(args.voertuigId, {
                kilometerstand: args.kmStandOnderhoud,
            });
        }

        return ctx.db.insert("onderhoudshistorie", {
            ...args,
            tokenIdentifier,
            aangemaaktOp: Date.now(),
        });
    },
});
