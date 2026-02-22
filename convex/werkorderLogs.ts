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
 */
export const lijstLogsVoorWerkorder = query({
    args: { werkorderId: v.id("werkorders") },
    handler: async (ctx, args) => {
        await requireAuth(ctx);

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
