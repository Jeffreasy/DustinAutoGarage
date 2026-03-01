/**
 * convex/werkorderBevindingen.ts
 *
 * Queries en mutaties voor gestructureerde reparatie-bevindingen.
 *
 * Elke werkorder kan meerdere bevindingen hebben, ingedeeld in 4 types:
 *   Bevinding  → technische observatie ("Draagarm rechts versleten")
 *   Onderdeel  → gebruikt of besteld onderdeel (met prijs/leverancier)
 *   Uren       → tijdregistratie per werksessie
 *   Taak       → checklist-item (✓ gedaan / ✗ niet gedaan)
 *
 * Gescheiden van werkorderLogs zodat:
 *   - De audit trail clean blijft (alleen status/acties)
 *   - Bevindingen exporteerbaar zijn als werkrapport
 *   - Onderdelen-prijzen optelbaarbaar zijn voor kostenraming
 *
 * Rol-gating:
 *   Lezen          → monteur+
 *   Toevoegen      → monteur+
 *   Bijwerken      → monteur+ (alleen eigen bevindingen) of eigenaar (alles)
 *   Verwijderen    → eigenaar only
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireDomainRole } from "./helpers";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * lijstBevindingen — alle bevindingen voor één werkorder, chronologisch.
 *
 * Verrijkt elke bevinding met de naam van de medewerker die hem aanmaakte.
 * IDOR-bescherming: werkorder-eigenaarschap wordt geverifieerd.
 *
 * Vereist minimaal de rol "monteur".
 */
export const lijstBevindingen = query({
    args: { werkorderId: v.id("werkorders") },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "monteur");

        // IDOR: verifieer dat de werkorder tot deze tenant behoort
        const order = await ctx.db.get(args.werkorderId);
        if (!order || order.tokenIdentifier !== profiel.tokenIdentifier) {
            return [];
        }

        const bevindingen = await ctx.db
            .query("werkorderBevindingen")
            .withIndex("by_werkorder", (q) => q.eq("werkorderId", args.werkorderId))
            .order("asc")
            .collect();

        // P1 FIX: Batch JOIN — verzamel unieke medewerker-IDs en haal ze in één ronde op.
        // Voorheen: N+1 pattern (1 db.get per bevinding). Nu: max 1 call per unieke monteur.
        const uniqueIds = [...new Set(bevindingen.map((b) => b.monteursId))];
        const medewerkers = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));
        const namenMap = new Map(uniqueIds.map((id, i) => [id, medewerkers[i]?.naam ?? "Onbekend"]));

        return bevindingen.map((b) => ({ ...b, medewerkerNaam: namenMap.get(b.monteursId) ?? "Onbekend" }));
    },
});

/**
 * totaalOnderdelenKosten — som van alle onderdeel-prijzen × aantal voor één werkorder.
 *
 * Retourneert null als er geen onderdelen met prijs zijn.
 * Handig voor een kostenraming vóór het invullen van de slotnotitie.
 *
 * Vereist minimaal de rol "balie".
 */
export const totaalOnderdelenKosten = query({
    args: { werkorderId: v.id("werkorders") },
    handler: async (ctx, args) => {
        // B1 FIX: balie → monteur — KPI-queries zijn ook nuttig voor monteurs op hun eigen order.
        const profiel = await requireDomainRole(ctx, "monteur");

        const order = await ctx.db.get(args.werkorderId);
        if (!order || order.tokenIdentifier !== profiel.tokenIdentifier) {
            return null;
        }

        const onderdelen = await ctx.db
            .query("werkorderBevindingen")
            .withIndex("by_werkorder_and_type", (q) =>
                q.eq("werkorderId", args.werkorderId).eq("type", "Onderdeel")
            )
            .collect();

        const metPrijs = onderdelen.filter(
            (o) => o.onderdeel?.prijs !== undefined
        );
        if (metPrijs.length === 0) return null;

        return metPrijs.reduce((sum, o) => {
            const prijs = o.onderdeel?.prijs ?? 0;
            const aantal = o.onderdeel?.aantal ?? 1;
            return sum + prijs * aantal;
        }, 0);
    },
});

/**
 * totaalUren — som van alle uren-registraties voor één werkorder.
 *
 * G1 FIX: Vereist minimaal de rol "monteur" (was: "balie").
 * Monteurs registreren zelf uren — ze moeten het totaal kunnen ophalen
 * voor de KPI-strip in hun eigen rapport-panel.
 */
export const totaalUren = query({
    args: { werkorderId: v.id("werkorders") },
    handler: async (ctx, args) => {
        // G1 FIX: "monteur" i.p.v. "balie" — monteurs zijn de primaire uren-registreerders
        const profiel = await requireDomainRole(ctx, "monteur");

        const order = await ctx.db.get(args.werkorderId);
        if (!order || order.tokenIdentifier !== profiel.tokenIdentifier) {
            return null;
        }

        const uren = await ctx.db
            .query("werkorderBevindingen")
            .withIndex("by_werkorder_and_type", (q) =>
                q.eq("werkorderId", args.werkorderId).eq("type", "Uren")
            )
            .collect();

        const totaal = uren.reduce((sum, u) => sum + (u.aantalUren ?? 0), 0);
        return totaal > 0 ? totaal : null;
    },
});

/**
 * urenPerMonteur — uren uitgesplitst per medewerker voor één werkorder.
 *
 * G2 FIX: Per-monteur aggregatie.
 * G3 FIX: Koppelt uurloon aan loonkosten-berekening (eigenaar-only).
 *
 * Retourneert: { monteurNaam, totaalUren, loonkosten? }[]
 * loonkosten is alleen aanwezig als de aanvrager eigenaar is en het uurloon bekend is.
 *
 * Vereist minimaal de rol "monteur".
 */
export const urenPerMonteur = query({
    args: { werkorderId: v.id("werkorders") },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "monteur");

        const order = await ctx.db.get(args.werkorderId);
        if (!order || order.tokenIdentifier !== profiel.tokenIdentifier) return [];

        const uren = await ctx.db
            .query("werkorderBevindingen")
            .withIndex("by_werkorder_and_type", (q) =>
                q.eq("werkorderId", args.werkorderId).eq("type", "Uren")
            )
            .collect();

        if (uren.length === 0) return [];

        // Batch JOIN — unieke monteurs ophalen
        const uniqueIds = [...new Set(uren.map((u) => u.monteursId))];
        const medewerkers = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));
        const medMap = new Map(uniqueIds.map((id, i) => [String(id), medewerkers[i]]));

        const isEigenaar = profiel.domeinRol === "eigenaar";

        // Groepeer per monteur
        const groepen: Record<string, {
            monteursId: string;
            monteurNaam: string;
            totaalUren: number;
            loonkosten: number | undefined;
        }> = {};

        for (const u of uren) {
            const key = String(u.monteursId);
            const med = medMap.get(key);
            if (!groepen[key]) {
                groepen[key] = {
                    monteursId: key,
                    monteurNaam: med?.naam ?? "Onbekend",
                    totaalUren: 0,
                    // G3 FIX: loonkosten alleen voor eigenaar als uurloon bekend is
                    loonkosten: isEigenaar && med?.uurloon !== undefined ? 0 : undefined,
                };
            }
            groepen[key].totaalUren += u.aantalUren ?? 0;
            if (groepen[key].loonkosten !== undefined && med?.uurloon !== undefined) {
                groepen[key].loonkosten = (groepen[key].loonkosten ?? 0) + (u.aantalUren ?? 0) * med.uurloon;
            }
        }

        return Object.values(groepen).sort((a, b) => b.totaalUren - a.totaalUren);
    },
});

// ---------------------------------------------------------------------------
// Mutaties
// ---------------------------------------------------------------------------

/**
 * voegBevindingToe — monteur/eigenaar voegt een gestructureerde bevinding toe.
 *
 * Valideert type-specifieke velden:
 *   Onderdeel → aantal >= 1 vereist
 *   Uren      → aantalUren > 0 vereist
 *   Taak      → gedaan mag ontbreken (= nog niet beoordeeld)
 *
 * Vereist minimaal de rol "monteur".
 */
export const voegBevindingToe = mutation({
    args: {
        werkorderId: v.id("werkorders"),
        type: v.union(
            v.literal("Bevinding"),
            v.literal("Onderdeel"),
            v.literal("Uren"),
            v.literal("Taak"),
        ),
        omschrijving: v.string(),
        onderdeel: v.optional(v.object({
            artikelnummer: v.optional(v.string()),
            leverancier: v.optional(v.string()),
            prijs: v.optional(v.number()),
            aantal: v.number(),
        })),
        aantalUren: v.optional(v.number()),
        // G4 FIX: werkDatum — voor welke dag zijn deze uren? (ms since epoch, default = vandaag)
        werkDatum: v.optional(v.number()),
        gedaan: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "monteur");

        // IDOR: verifieer dat de werkorder tot deze tenant behoort
        const order = await ctx.db.get(args.werkorderId);
        if (!order || order.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Werkorder niet gevonden of geen toegang.");
        }

        // Guard: gesloten orders krijgen geen nieuwe bevindingen
        if (order.status === "Afgerond" || order.status === "Geannuleerd") {
            throw new Error(`CONFLICT: Werkorder is definitief gesloten (${order.status}) — bevindingen zijn niet meer wijzigbaar.`);
        }

        // Type-specifieke validaties
        if (args.type === "Onderdeel") {
            if (!args.onderdeel) {
                throw new Error("INVALID: Onderdeel-velden zijn verplicht bij type Onderdeel.");
            }
            if (args.onderdeel.aantal < 1) {
                throw new Error("INVALID: Aantal moet minimaal 1 zijn.");
            }
            if (args.onderdeel.prijs !== undefined && args.onderdeel.prijs < 0) {
                throw new Error("INVALID: Prijs mag niet negatief zijn.");
            }
        }
        if (args.type === "Uren") {
            if (!args.aantalUren || args.aantalUren <= 0) {
                throw new Error("INVALID: Aantal uren moet groter dan 0 zijn.");
            }
            if (args.aantalUren > 24) {
                throw new Error("INVALID: Meer dan 24 uur per registratie is niet geldig.");
            }
        }

        // Trim omschrijving
        const omschrijving = args.omschrijving.trim();
        if (!omschrijving) {
            throw new Error("INVALID: Omschrijving mag niet leeg zijn.");
        }

        return ctx.db.insert("werkorderBevindingen", {
            werkorderId: args.werkorderId,
            monteursId: profiel._id,
            type: args.type,
            omschrijving,
            onderdeel: args.onderdeel,
            aantalUren: args.aantalUren,
            // G4 FIX: werkDatum — default naar het huidige tijdstip als niet opgegeven
            werkDatum: args.werkDatum ?? Date.now(),
            gedaan: args.gedaan,
            tijdstip: Date.now(),
            tokenIdentifier: profiel.tokenIdentifier,
        });
    },
});

/**
 * updateBevinding — wijzig omschrijving, taakstatus of onderdeel-details.
 *
 * Monteurs mogen alleen hun eigen bevindingen wijzigen.
 * Eigenaar mag alle bevindingen binnen de tenant wijzigen.
 *
 * Vereist minimaal de rol "monteur".
 */
export const updateBevinding = mutation({
    args: {
        bevindingId: v.id("werkorderBevindingen"),
        omschrijving: v.optional(v.string()),
        gedaan: v.optional(v.boolean()),
        aantalUren: v.optional(v.number()),
        onderdeel: v.optional(v.object({
            artikelnummer: v.optional(v.string()),
            leverancier: v.optional(v.string()),
            prijs: v.optional(v.number()),
            aantal: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "monteur");

        const bevinding = await ctx.db.get(args.bevindingId);
        if (!bevinding || bevinding.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Bevinding niet gevonden of geen toegang.");
        }

        // Monteurs mogen alleen eigen bevindingen aanpassen; eigenaar mag alles
        const isEigenaar = profiel.domeinRol === "eigenaar";
        const isEigenBevinding = bevinding.monteursId === profiel._id;
        if (!isEigenaar && !isEigenBevinding) {
            throw new Error("FORBIDDEN: Je kunt alleen je eigen bevindingen wijzigen.");
        }

        // Gesloten werkorder check
        const order = await ctx.db.get(bevinding.werkorderId);
        if (order?.status === "Afgerond" || order?.status === "Geannuleerd") {
            throw new Error("CONFLICT: Werkorder is definitief gesloten — bevindingen zijn niet meer wijzigbaar.");
        }

        // B2 FIX: Vroeg uitstappen als er niets gewijzigd wordt (voorkomt no-op DB write).
        if (
            args.omschrijving === undefined &&
            args.gedaan === undefined &&
            args.aantalUren === undefined &&
            args.onderdeel === undefined
        ) {
            return { succes: true };
        }

        const patch: Partial<{
            omschrijving: string;
            gedaan: boolean;
            aantalUren: number;
            onderdeel: typeof args.onderdeel;
        }> = {};

        if (args.omschrijving !== undefined) {
            const trimmed = args.omschrijving.trim();
            if (!trimmed) throw new Error("INVALID: Omschrijving mag niet leeg zijn.");
            patch.omschrijving = trimmed;
        }
        if (args.gedaan !== undefined) patch.gedaan = args.gedaan;
        if (args.aantalUren !== undefined) {
            // S1 FIX: Zelfde validatieregels als voegBevindingToe — ook bij update afdwingen.
            if (args.aantalUren <= 0) throw new Error("INVALID: Aantal uren moet groter dan 0 zijn.");
            if (args.aantalUren > 24) throw new Error("INVALID: Meer dan 24 uur per registratie is niet geldig.");
            patch.aantalUren = args.aantalUren;
        }
        if (args.onderdeel !== undefined) patch.onderdeel = args.onderdeel;

        await ctx.db.patch(args.bevindingId, patch);
        return { succes: true };
    },
});

/**
 * verwijderBevinding — verwijdert een bevinding.
 *
 * Alleen eigenaar mag bevindingen permanent verwijderen.
 * Dit is bewust restrictief — audit-integriteit van het rapport.
 *
 * Vereist minimaal de rol "eigenaar".
 */
export const verwijderBevinding = mutation({
    args: { bevindingId: v.id("werkorderBevindingen") },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "eigenaar");

        const bevinding = await ctx.db.get(args.bevindingId);
        if (!bevinding || bevinding.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Bevinding niet gevonden of geen toegang.");
        }

        // B3 FIX: Bevindingen van definitief gesloten orders mogen niet verwijderd worden.
        // Dit borgt de integriteit van het werkrapport achteraf.
        const order = await ctx.db.get(bevinding.werkorderId);
        if (order?.status === "Afgerond" || order?.status === "Geannuleerd") {
            throw new Error("CONFLICT: Bevindingen van een definitief gesloten werkorder kunnen niet worden verwijderd.");
        }

        await ctx.db.delete(args.bevindingId);
        return { succes: true };
    },
});
