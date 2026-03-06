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
 * create — Registreer een nieuw voertuig. klantId is optioneel:
 *   - Met klantId  → voertuig direct gekoppeld aan bestaande klant
 *   - Zonder klantId → voertuig als "ongebonden" opgeslagen (later te koppelen)
 */
export const create = mutation({
    args: {
        klantId: v.optional(v.id("klanten")),
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
        // ── RDW-verrijking ────────────────────────────────────────────────────
        voertuigsoort: v.optional(v.string()),
        kleur: v.optional(v.string()),
        tweedeKleur: v.optional(v.string()),
        massaRijklaar: v.optional(v.number()),
        maxTrekgewichtOngeremd: v.optional(v.number()),
        maxTrekgewichtGeremd: v.optional(v.number()),
        aantalZitplaatsen: v.optional(v.number()),
        eersteTenaamstelling: v.optional(v.string()),
        co2Uitstoot: v.optional(v.number()),
    },
    handler: async (ctx, args): Promise<Id<"voertuigen">> => {
        // B-12 FIX: Stagiairs zijn read-only — minimaal monteur vereist om voertuigen aan te maken.
        const profiel = await requireDomainRole(ctx, "monteur");
        const tokenIdentifier = profiel.tokenIdentifier;

        // Valideer klantId alleen als meegegeven
        if (args.klantId !== undefined) {
            const klant = await ctx.db.get(args.klantId);
            if (!klant || klant.tokenIdentifier !== tokenIdentifier) {
                throw new Error(
                    "FORBIDDEN: Het opgegeven klantId behoort niet tot de huidige sessie."
                );
            }
        }

        // Normaliseer kenteken: altijd uppercase, geen streepjes (bijv. "GH-446-V" → "GH446V")
        const normalKenteken = args.kenteken.toUpperCase().replace(/[\s-]/g, "");

        // Guard: lege kenteken nooit opslaan — vangt mislukte scans op waarbij de
        // frontend toch een submit doet met een leeg of witruimte-only kenteken.
        if (normalKenteken.length === 0) {
            throw new Error(
                "INVALID: Kenteken mag niet leeg zijn. Voer een geldig kenteken in."
            );
        }

        // Normaliseer merk/model: trim en valideer
        const merkTrimmed = args.merk.trim();
        const modelTrimmed = args.model.trim();
        if (!merkTrimmed) throw new Error("INVALID: Merk mag niet leeg zijn.");
        if (!modelTrimmed) throw new Error("INVALID: Model mag niet leeg zijn.");

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
            merk: merkTrimmed,
            model: modelTrimmed,
            tokenIdentifier,
            aangemaaktOp: Date.now(),
        });
    },
});


/**
 * koppelKlant — Koppel een ongebonden voertuig aan een bestaande klant.
 * Vereist minimaal balie-rol (klant-koppeling is een administratieve actie).
 */
export const koppelKlant = mutation({
    args: {
        voertuigId: v.id("voertuigen"),
        klantId: v.id("klanten"),
    },
    handler: async (ctx, args): Promise<void> => {
        const profiel = await requireDomainRole(ctx, "balie");
        const tokenIdentifier = profiel.tokenIdentifier;

        const voertuig = await ctx.db.get(args.voertuigId);
        if (!voertuig || voertuig.tokenIdentifier !== tokenIdentifier) {
            throw new Error("FORBIDDEN: Voertuig niet gevonden of geen toegang.");
        }

        const klant = await ctx.db.get(args.klantId);
        if (!klant || klant.tokenIdentifier !== tokenIdentifier) {
            throw new Error("FORBIDDEN: Klant niet gevonden of geen toegang.");
        }

        await ctx.db.patch(args.voertuigId, { klantId: args.klantId });
    },
});


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
        // ── RDW-verrijking ────────────────────────────────────────────────────
        voertuigsoort: v.optional(v.string()),
        kleur: v.optional(v.string()),
        tweedeKleur: v.optional(v.string()),
        massaRijklaar: v.optional(v.number()),
        maxTrekgewichtOngeremd: v.optional(v.number()),
        maxTrekgewichtGeremd: v.optional(v.number()),
        aantalZitplaatsen: v.optional(v.number()),
        eersteTenaamstelling: v.optional(v.string()),
        co2Uitstoot: v.optional(v.number()),
    },
    handler: async (ctx, args): Promise<void> => {
        // B-12 FIX: Stagiairs zijn read-only — minimaal monteur vereist.
        const profiel = await requireDomainRole(ctx, "monteur");
        const tokenIdentifier = profiel.tokenIdentifier;

        const voertuig = await ctx.db.get(args.voertuigId);
        if (!voertuig || voertuig.tokenIdentifier !== tokenIdentifier) {
            throw new Error("FORBIDDEN: Voertuig niet gevonden of geen toegang.");
        }

        const { voertuigId, kenteken, ...rest } = args;

        // Normaliseer en valideer nieuw kenteken indien meegestuurd
        let normalKenteken: string | undefined;
        if (kenteken !== undefined) {
            normalKenteken = kenteken.toUpperCase().replace(/[\s-]/g, "");
            if (normalKenteken.length === 0) {
                throw new Error("INVALID: Kenteken mag niet leeg zijn.");
            }
            // Duplicate-check alleen als het kenteken daadwerkelijk wijzigt
            if (normalKenteken !== voertuig.kenteken) {
                const conflict = await ctx.db
                    .query("voertuigen")
                    .withIndex("by_token_and_kenteken", (q) =>
                        q.eq("tokenIdentifier", tokenIdentifier).eq("kenteken", normalKenteken!)
                    )
                    .first();
                if (conflict) {
                    throw new Error(`CONFLICT: Kenteken "${normalKenteken}" is al geregistreerd in deze garage.`);
                }
            }
        }

        const patch = {
            ...rest,
            ...(normalKenteken !== undefined ? { kenteken: normalKenteken } : {}),
        };

        // Filter undefined AND lege strings voor verplichte velden
        const VERPLICHT_VOERTUIG = new Set(["kenteken", "merk", "model"]);
        const cleanPatch = Object.fromEntries(
            Object.entries(patch).filter(([key, val]) => {
                if (val === undefined) return false;
                if (typeof val === "string" && val.trim() === "" && VERPLICHT_VOERTUIG.has(key)) return false;
                return true;
            })
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
        // B-12 FIX: Stagiairs zijn read-only — minimaal monteur vereist.
        const profiel = await requireDomainRole(ctx, "monteur");
        const tokenIdentifier = profiel.tokenIdentifier;

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

/**
 * verwijderLegeKentekens — Eigenaar-only cleanup mutatie.
 *
 * Verwijdert alle voertuigen voor de huidige tenant waarbij het kenteken
 * leeg is ("") — wees-records aangemaakt vóór de lege-kenteken guard (bugfix).
 *
 * Cascade: verwijdert ook onderhoudshistorie van elk leeg-kenteken voertuig.
 * Werkorders worden NIET gecascade (die hebben een verplicht kenteken in de UI).
 *
 * Gebruik: eenmalig uitvoeren via Convex dashboard of een tijdelijke admin-knop.
 */
export const verwijderLegeKentekens = mutation({
    args: {},
    handler: async (ctx): Promise<number> => {
        const profiel = await requireDomainRole(ctx, "eigenaar");
        const tokenIdentifier = profiel.tokenIdentifier;

        const alleVoertuigen = await ctx.db
            .query("voertuigen")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
            )
            .collect();

        const legeVoertuigen = alleVoertuigen.filter((v) => !v.kenteken || v.kenteken.trim() === "");

        for (const voertuig of legeVoertuigen) {
            // Cascade: verwijder onderhoudshistorie
            const historie = await ctx.db
                .query("onderhoudshistorie")
                .withIndex("by_voertuig", (q) => q.eq("voertuigId", voertuig._id))
                .collect();
            for (const entry of historie) {
                await ctx.db.delete(entry._id);
            }

            await ctx.db.delete(voertuig._id);
        }

        return legeVoertuigen.length;
    },
});
