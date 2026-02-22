/**
 * convex/werkplekken.ts
 *
 * Queries en mutations voor werkplek-beheer (Werkplaatsbord — Kolommen).
 *
 * Werkplekken zijn de fysieke locaties in de garage: "Brug 1", "Brug 2", etc.
 * Ze vormen de kolommen van het Kanban-bord. De impliciete "Buiten/Wachtend"
 * kolom heeft geen werkplek-record.
 *
 * Rol-gating:
 *   Lezen     → alle medewerkers (monteur+)
 *   Aanmaken  → balie+ (receptionist configureert de garage)
 *   Seed      → balie+ (eenmalig bij eerste gebruik)
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { vWerkplekType } from "./validators";
import { requireAuth, requireDomainRole } from "./helpers";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * lijstWerkplekken — alle werkplekken van de tenant, gesorteerd op volgorde.
 * Gebruikt als bron voor de kolommen op het bord.
 */
export const lijstWerkplekken = query({
    args: {},
    handler: async (ctx) => {
        const tokenIdentifier = await requireAuth(ctx);

        return ctx.db
            .query("werkplekken")
            .withIndex("by_token_and_volgorde", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
            )
            .order("asc")
            .collect();
    },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * maakWerkplekAan — voegt een nieuwe fysieke locatie toe aan de garage.
 * Vereist minimaal de rol "balie".
 */
export const maakWerkplekAan = mutation({
    args: {
        naam: v.string(),
        type: vWerkplekType,
        volgorde: v.number(),
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "balie");

        return ctx.db.insert("werkplekken", {
            naam: args.naam,
            type: args.type,
            volgorde: args.volgorde,
            tokenIdentifier: profiel.tokenIdentifier,
        });
    },
});

/**
 * seedDefaultWerkplekken — zaait 3 standaard werkplekken bij eerste gebruik.
 *
 * Idempotent: doet niets als er al werkplekken bestaan voor deze tenant.
 * Vereist minimaal de rol "balie".
 */
export const seedDefaultWerkplekken = mutation({
    args: {},
    handler: async (ctx) => {
        const profiel = await requireDomainRole(ctx, "balie");

        const bestaande = await ctx.db
            .query("werkplekken")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", profiel.tokenIdentifier)
            )
            .first();

        if (bestaande !== null) return { gezaaid: false, reden: "Al geconfigureerd" };

        const defaults = [
            { naam: "Brug 1", type: "Brug" as const, volgorde: 1 },
            { naam: "Brug 2", type: "Brug" as const, volgorde: 2 },
            { naam: "Uitlijnbrug", type: "Uitlijnbrug" as const, volgorde: 3 },
        ];

        for (const plek of defaults) {
            await ctx.db.insert("werkplekken", {
                ...plek,
                tokenIdentifier: profiel.tokenIdentifier,
            });
        }

        return { gezaaid: true, aantalToegevoegd: defaults.length };
    },
});

/**
 * verwijderWerkplek — verwijdert een werkplek.
 * Let op: werkorders die naar deze plek verwijzen krijgen werkplekId = null.
 * Vereist de rol "eigenaar".
 */
export const verwijderWerkplek = mutation({
    args: { werkplekId: v.id("werkplekken") },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "eigenaar");

        const werkplek = await ctx.db.get(args.werkplekId);
        if (!werkplek || werkplek.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Werkplek niet gevonden of geen toegang.");
        }

        // Ontkoppel alle werkorders die naar deze plek verwijzen
        const gekoppeldeOrders = await ctx.db
            .query("werkorders")
            .withIndex("by_werkplek", (q) => q.eq("werkplekId", args.werkplekId))
            .collect();

        for (const order of gekoppeldeOrders) {
            await ctx.db.patch(order._id, { werkplekId: undefined });
        }

        await ctx.db.delete(args.werkplekId);
        return { verwijderd: true, ontkoppeldeOrders: gekoppeldeOrders.length };
    },
});
