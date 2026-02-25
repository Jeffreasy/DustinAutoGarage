/**
 * convex/werkorderLogs.ts
 *
 * Queries en mutations voor het werkorder-logboek (Audit Trail).
 *
 * Elke verplaatsing of statuswijziging van een werkorder schrijft hier een rij.
 * Monteurs kunnen ook vrije notities toevoegen.
 *
 * Dit module wordt intern aangeroepen vanuit werkorders.ts (bij elke mutatie),
 * maar kan ook direct worden aangeroepen voor handmatige notities.
 *
 * Rol-gating:
 *   Lezen          → alle medewerkers (monteur+)
 *   Notitie alles  → monteur+ (monteur mag altijd notities toevoegen)
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireDomainRole } from "./helpers";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * lijstLogsVoorWerkorder — alle logregels voor één werkorder, nieuwste eerst.
 *
 * IDOR-bescherming: werkorder eigenaarschap wordt geverifieerd voordat logs
 * worden teruggegeven. Een geauthenticeerde gebruiker van een andere tenant
 * kan geen logs opvragen met een geraden werkorderId.
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

        return ctx.db
            .query("werkorderLogs")
            .withIndex("by_werkorder", (q) => q.eq("werkorderId", args.werkorderId))
            .order("desc")
            .collect();
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
 * IDOR-bescherming: werkorder eigenaarschap wordt geverifieerd voordat de
 * log-entry wordt aangemaakt.
 *
 * @param werkorderId - de werkorder waaraan de log gekoppeld wordt
 * @param actie       - auto-gegenereerde omschrijving (bijv. "Verplaatst naar Brug 1")
 * @param notitie     - optionele vrije tekst van de monteur
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
