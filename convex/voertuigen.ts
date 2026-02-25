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
import { requireAuth, requireDomainRole } from "./helpers";


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

/**
 * getVerlopenApk — Voertuigen waarvan de APK al verlopen is (apkVervaldatum < nu).
 * Gescheiden van getBijnaVerlopenApk zodat de frontend onderscheid kan maken
 * tussen "verlopen" (kritiek) en "bijna verlopen" (waarschuwing).
 */
export const getVerlopenApk = query({
    args: {},
    handler: async (ctx): Promise<Doc<"voertuigen">[]> => {
        const tokenIdentifier = await requireAuth(ctx);
        const nu = Date.now();

        return ctx.db
            .query("voertuigen")
            .withIndex("by_apk_and_token", (q) =>
                q
                    .eq("tokenIdentifier", tokenIdentifier)
                    .lt("apkVervaldatum", nu)
            )
            .collect();
    },
});

/**
 * zoekOpKenteken — Zoek voertuigen op (gedeeltelijk) kenteken.
 * Minimaal 2 tekens vereist; client-side filtering op uppercase normalized match.
 * Gebruikt door de onderhoud-modules en voertuig-selectie forms.
 */
export const zoekOpKenteken = query({
    args: { term: v.string() },
    handler: async (ctx, args): Promise<Doc<"voertuigen">[]> => {
        const tokenIdentifier = await requireAuth(ctx);
        const term = args.term.toUpperCase().replace(/[\s-]/g, "");

        if (term.length < 2) return [];

        const alleVoertuigen = await ctx.db
            .query("voertuigen")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
            )
            .collect();

        return alleVoertuigen.filter((v) =>
            v.kenteken.includes(term)
        );
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

        // Normaliseer kenteken: altijd uppercase, geen streepjes (bijv. "GH-446-V" → "GH446V")
        const normalKenteken = args.kenteken.toUpperCase().replace(/[\s-]/g, "");

        // M-6 FIX: verifieer dat het kenteken niet al geregistreerd is voor deze tenant
        const bestaandVoertuig = await ctx.db
            .query("voertuigen")
            .withIndex("by_token_and_kenteken", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier).eq("kenteken", normalKenteken)
            )
            .first();

        if (bestaandVoertuig) {
            throw new Error(
                `CONFLICT: Kenteken "${normalKenteken}" is al geregistreerd in deze garage.`
            );
        }

        return ctx.db.insert("voertuigen", {
            ...args,
            kenteken: normalKenteken,
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

        const { voertuigId, ...fields } = args;

        // Normaliseer kenteken indien meegestuurd
        const patch = fields.kenteken
            ? { ...fields, kenteken: fields.kenteken.toUpperCase().replace(/[\s-]/g, "") }
            : { ...fields };

        const cleanPatch = Object.fromEntries(
            Object.entries(patch).filter(([, val]) => val !== undefined)
        );

        await ctx.db.patch(voertuigId, cleanPatch);
    },
});

/**
 * updateKilometerstand — Snel een nieuwe kilometerstand registreren.
 * Validatie: km moet > 0 zijn en niet meer dan 20% lager dan de huidige stand
 * (bescherming tegen typefouten, bijv. 150000 → 15000).
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

        if (args.nieuweKilometerstand <= 0) {
            throw new Error("INVALID: Kilometerstand moet groter dan 0 zijn.");
        }

        const huidige = voertuig.kilometerstand;
        if (huidige !== undefined && args.nieuweKilometerstand < huidige * 0.8) {
            throw new Error(
                `INVALID: Kilometerstand (${args.nieuweKilometerstand.toLocaleString("nl-NL")}) is meer dan 20% lager dan de huidige stand (${huidige.toLocaleString("nl-NL")}). Controleer de invoer.`
            );
        }

        await ctx.db.patch(args.voertuigId, {
            kilometerstand: args.nieuweKilometerstand,
        });
    },
});

/**
 * verwijder — Verwijder een voertuig en alle bijbehorende data.
 *
 * ⚠️ Cascade verwijdering — onomkeerbaar.
 * H-4 FIX: Vereist minimaal de rol "balie" — monteurs en stagiairs
 * mogen geen voertuigen met cascade-effecten verwijderen.
 *
 * Guard: weigert verwijdering als er nog actieve (niet-gesloten) werkorders bestaan.
 * Actief = alles behalve "Afgerond" en "Geannuleerd".
 */
export const verwijder = mutation({
    args: { voertuigId: v.id("voertuigen") },
    handler: async (ctx, args): Promise<void> => {
        const profiel = await requireDomainRole(ctx, "balie");
        const tokenIdentifier = profiel.tokenIdentifier;

        const voertuig = await ctx.db.get(args.voertuigId);
        if (!voertuig || voertuig.tokenIdentifier !== tokenIdentifier) {
            throw new Error("FORBIDDEN: Voertuig niet gevonden of geen toegang.");
        }

        // Guard: verhinder verwijdering bij nog openstaande werkorders
        const werkorders = await ctx.db
            .query("werkorders")
            .withIndex("by_voertuig", (q) => q.eq("voertuigId", args.voertuigId))
            .collect();

        const actieveOrders = werkorders.filter(
            (o) => o.status !== "Afgerond" && o.status !== "Geannuleerd"
        );

        if (actieveOrders.length > 0) {
            const statussen = actieveOrders.map((o) => o.status).join(", ");
            throw new Error(
                `CONFLICT: Voertuig heeft nog ${actieveOrders.length} open werkorder(s) (${statussen}). ` +
                `Sluit of annuleer alle werkorders voordat het voertuig verwijderd kan worden.`
            );
        }

        // Cascade: verwijder gekoppelde onderhoudshistorie
        const historie = await ctx.db
            .query("onderhoudshistorie")
            .withIndex("by_voertuig", (q) => q.eq("voertuigId", args.voertuigId))
            .collect();

        for (const entry of historie) {
            await ctx.db.delete(entry._id);
        }

        // Cascade: verwijder werkorders + werkorderLogs (gesloten werkorders)
        for (const order of werkorders) {
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

