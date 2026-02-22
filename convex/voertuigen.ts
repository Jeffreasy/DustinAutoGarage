/**
 * convex/voertuigen.ts
 *
 * Beveiligde Convex queries en mutaties voor de `voertuigen` tabel.
 *
 * Beveiligingscontract:
 *   - `requireAuth()` wordt als eerste aangeroepen in elke handler.
 *   - Alle DB-reads zijn gefilterd op `tokenIdentifier` (tenant-isolatie).
 *   - IDOR-bescherming: getById verifieert eigenaarschap vóór teruggave.
 *
 * Onderhoudshistorie queries/mutaties → zie onderhoudshistorie.ts
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { vBrandstof } from "./validators";
import { requireAuth } from "./helpers";


// ---------------------------------------------------------------------------
// Queries
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
 * Retourneert null als het voertuig niet bestaat of niet toebehoort aan de sessie.
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
 *
 * Optimalisatie: gebruikt de gecorrigeerde index ["tokenIdentifier", "apkVervaldatum"]
 * zodat eerst tenant-isolatie wordt toegepast via een index-equality check, en
 * vervolgens een efficiënte range-scan op APK-datum. Geen in-memory filter meer.
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

        // Directe index range-scan: tenant-filter + datum-bereik in één query
        return ctx.db
            .query("voertuigen")
            .withIndex("by_apk_and_token", (q) =>
                q
                    .eq("tokenIdentifier", tokenIdentifier)
                    .gt("apkVervaldatum", nu)
                    .lte("apkVervaldatum", grens)
            )
            .collect();
    },
});

// ---------------------------------------------------------------------------
// Mutaties
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
        brandstof: vBrandstof,
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
 * update — Wijzig voertuiggegevens (patch semantiek).
 */
export const update = mutation({
    args: {
        voertuigId: v.id("voertuigen"),
        kenteken: v.optional(v.string()),
        merk: v.optional(v.string()),
        model: v.optional(v.string()),
        bouwjaar: v.optional(v.number()),
        brandstof: v.optional(vBrandstof),
        vin: v.optional(v.string()),
        meldcode: v.optional(v.string()),
        kilometerstand: v.optional(v.number()),
        apkVervaldatum: v.optional(v.number()),
        voertuigNotities: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<void> => {
        const tokenIdentifier = await requireAuth(ctx);

        const voertuig = await ctx.db.get(args.voertuigId);
        if (!voertuig || voertuig.tokenIdentifier !== tokenIdentifier) {
            throw new Error("FORBIDDEN: Voertuig niet gevonden of geen toegang.");
        }

        const { voertuigId, ...patch } = args;

        const cleanPatch = Object.fromEntries(
            Object.entries(patch).filter(([, val]) => val !== undefined)
        );

        await ctx.db.patch(voertuigId, cleanPatch);
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

/**
 * verwijder — Verwijder een voertuig en alle bijbehorende onderhoudshistorie.
 *
 * ⚠️ Cascade verwijdering — onomkeerbaar.
 *    Overweeg eerst het voertuig los te koppelen van de klant in de UI.
 */
export const verwijder = mutation({
    args: { voertuigId: v.id("voertuigen") },
    handler: async (ctx, args): Promise<void> => {
        const tokenIdentifier = await requireAuth(ctx);

        const voertuig = await ctx.db.get(args.voertuigId);
        if (!voertuig || voertuig.tokenIdentifier !== tokenIdentifier) {
            throw new Error("FORBIDDEN: Voertuig niet gevonden of geen toegang.");
        }

        // Cascade: verwijder gekoppelde onderhoudshistorie
        const historie = await ctx.db
            .query("onderhoudshistorie")
            .withIndex("by_voertuig", (q) => q.eq("voertuigId", args.voertuigId))
            .collect();

        for (const entry of historie) {
            await ctx.db.delete(entry._id);
        }

        // 🔴 FIX #2: Cascade werkorders + werkorderLogs verwijderen.
        // Zonder deze fix blijven werkorders met een verwijderd voertuigId staan
        // → kaartje toont "Voertuig onbekend" op het bord (ghost record).
        const werkorders = await ctx.db
            .query("werkorders")
            .withIndex("by_voertuig", (q) => q.eq("voertuigId", args.voertuigId))
            .collect();

        for (const order of werkorders) {
            // Verwijder ook de logs van deze werkorder
            const logs = await ctx.db
                .query("werkorderLogs")
                .withIndex("by_werkorder", (q) => q.eq("werkorderId", order._id))
                .collect();
            for (const log of logs) {
                await ctx.db.delete(log._id);
            }
            await ctx.db.delete(order._id);
        }

        await ctx.db.delete(args.voertuigId);
    },
});
