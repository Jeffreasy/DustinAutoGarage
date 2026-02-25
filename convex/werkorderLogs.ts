/**
 * convex/werkorderLogs.ts
 *
 * Queries en mutations voor het werkorder-logboek (Audit Trail).
 *
 * Elke verplaatsing of statuswijziging van een werkorder schrijft hier een rij.
 * Monteurs kunnen ook vrije notities toevoegen.
 *
 * Rol-gating:
 *   Lezen per werkorder → alle medewerkers (monteur+)
 *   Garage-audit trail  → balie+ (eigenaar/balie)
 *   Notitie toevoegen   → monteur+
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireDomainRole } from "./helpers";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * lijstLogsVoorWerkorder — alle logregels voor één werkorder, nieuwste eerst.
 * Verrijkt elke logregel met de naam van de medewerker (JOIN op medewerkers).
 *
 * IDOR-bescherming: werkorder eigenaarschap wordt geverifieerd vóór teruggave.
 */
export const lijstLogsVoorWerkorder = query({
    args: { werkorderId: v.id("werkorders") },
    handler: async (ctx, args) => {
        const tokenIdentifier = await requireAuth(ctx);

        // IDOR-fix: verifieer dat de werkorder tot de huidige tenant behoort
        const order = await ctx.db.get(args.werkorderId);
        if (!order || order.tokenIdentifier !== tokenIdentifier) {
            return [];
        }

        const logs = await ctx.db
            .query("werkorderLogs")
            .withIndex("by_werkorder", (q) => q.eq("werkorderId", args.werkorderId))
            .order("desc")
            .collect();

        // JOIN: naam van de medewerker ophalen — UI hoeft geen extra round-trip
        return Promise.all(
            logs.map(async (log) => {
                const medewerker = await ctx.db.get(log.monteursId);
                return {
                    ...log,
                    medewerkerNaam: medewerker?.naam ?? "Onbekend",
                };
            })
        );
    },
});

/**
 * lijstGarageActiviteit — chronologisch overzicht van ALLE acties in de garage.
 *
 * Voor de eigenaar/balie: volledig audit trail over alle werkorders heen.
 * Geeft inzicht in "wat heeft mijn team vandaag gedaan?".
 *
 * Verrijkt met:
 *   - medewerkerNaam  (wie heeft de actie uitgevoerd)
 *   - voertuigKenteken (op welke auto)
 *   - voertuigMerk, voertuigModel
 *
 * @param limiet   - Max resultaten (default: 50)
 * @param vanafMs  - Optionele startdatum (ms since epoch)
 * @param totMs    - Optionele einddatum (ms since epoch)
 *
 * Vereist minimaal de rol "balie".
 */
export const lijstGarageActiviteit = query({
    args: {
        limiet: v.optional(v.number()),
        vanafMs: v.optional(v.number()),
        totMs: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "balie");
        const tokenIdentifier = profiel.tokenIdentifier;
        const limiet = args.limiet ?? 50;

        // Gebruik datum-index voor efficiënte tenant + tijdstip range
        const alle = await ctx.db
            .query("werkorderLogs")
            .withIndex("by_datum_and_token", (q) => {
                const base = q.eq("tokenIdentifier", tokenIdentifier);
                if (args.vanafMs !== undefined) {
                    return base.gt("tijdstip", args.vanafMs - 1);
                }
                return base;
            })
            .order("desc")
            .collect();

        // Tot-filter (Convex ondersteunt geen upper-bound compound range hier direct)
        const gefilterd = args.totMs !== undefined
            ? alle.filter((l) => l.tijdstip <= args.totMs!)
            : alle;

        const gesliced = gefilterd.slice(0, limiet);

        // Verrijk met medewerkersnaam + voertuig-context
        return Promise.all(
            gesliced.map(async (log) => {
                const medewerker = await ctx.db.get(log.monteursId);
                const order = await ctx.db.get(log.werkorderId);
                const voertuig = order ? await ctx.db.get(order.voertuigId) : null;
                return {
                    ...log,
                    medewerkerNaam: medewerker?.naam ?? "Onbekend",
                    voertuigKenteken: voertuig?.kenteken ?? null,
                    voertuigMerk: voertuig?.merk ?? null,
                    voertuigModel: voertuig?.model ?? null,
                };
            })
        );
    },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * voegLogToe — schrijft een logregel voor een werkorder.
 *
 * Wordt intern aangeroepen door werkorders.ts, maar ook direct bruikbaar
 * voor handmatige monteurs-notities via de LogboekModal.
 *
 * IDOR-bescherming: werkorder eigenaarschap wordt geverifieerd vóór aanmaak.
 */
export const voegLogToe = mutation({
    args: {
        werkorderId: v.id("werkorders"),
        actie: v.string(),
        notitie: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "monteur");

        // IDOR-fix: verifieer dat de werkorder tot de huidige tenant behoort
        const order = await ctx.db.get(args.werkorderId);
        if (!order || order.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Werkorder niet gevonden of geen toegang.");
        }

        return ctx.db.insert("werkorderLogs", {
            werkorderId: args.werkorderId,
            monteursId: profiel._id,
            actie: args.actie,
            notitie: args.notitie,
            tijdstip: Date.now(),
            tokenIdentifier: profiel.tokenIdentifier,
        });
    },
});
