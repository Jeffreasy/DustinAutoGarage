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
 *   Aanmaken  → eigenaar only
 *   Hernoemen / Verplaatsen / Verwijderen → eigenaar only
 *   Seed      → eigenaar only (eenmalig bij eerste gebruik)
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { vWerkplekType, vWerkplekStatus } from "./validators";
import { requireAuth, requireDomainRole } from "./helpers";


// ---------------------------------------------------------------------------
// Constanten
// ---------------------------------------------------------------------------

const MAX_NAAM_LENGTE = 50;

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
 * voegWerkplekToe — voegt een werkplek toe met automatische volgorde.
 * Controleert op dubbele namen en valideert de naam server-side.
 * Vereist de rol "eigenaar".
 */
export const voegWerkplekToe = mutation({
    args: {
        naam: v.string(),
        type: vWerkplekType,
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "eigenaar");

        const naamTrimmed = args.naam.trim();
        if (naamTrimmed.length === 0) {
            throw new Error("VALIDATIE: Naam mag niet leeg zijn.");
        }
        if (naamTrimmed.length > MAX_NAAM_LENGTE) {
            throw new Error(`VALIDATIE: Naam mag maximaal ${MAX_NAAM_LENGTE} tekens zijn.`);
        }

        // Duplicaatcheck: geen twee werkplekken met dezelfde naam (case-insensitief)
        const bestaande = await ctx.db
            .query("werkplekken")
            .withIndex("by_token_and_volgorde", (q) =>
                q.eq("tokenIdentifier", profiel.tokenIdentifier)
            )
            .collect();

        const duplicaat = bestaande.find(
            (w) => w.naam.toLowerCase() === naamTrimmed.toLowerCase()
        );
        if (duplicaat) {
            throw new Error(`VALIDATIE: Er bestaat al een werkplek met de naam "${duplicaat.naam}".`);
        }

        const maxVolgorde = bestaande.length > 0
            ? Math.max(...bestaande.map((w) => w.volgorde))
            : 0;
        const volgorde = maxVolgorde + 1;

        return ctx.db.insert("werkplekken", {
            naam: naamTrimmed,
            type: args.type,
            volgorde,
            tokenIdentifier: profiel.tokenIdentifier,
        });
    },
});

/**
 * hernoemWerkplek — wijzig naam en/of type van een bestaande werkplek.
 * Controleert op dubbele namen.
 * Vereist de rol "eigenaar".
 */
export const hernoemWerkplek = mutation({
    args: {
        werkplekId: v.id("werkplekken"),
        naam: v.string(),
        type: vWerkplekType,
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "eigenaar");

        const werkplek = await ctx.db.get(args.werkplekId);
        if (!werkplek || werkplek.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Werkplek niet gevonden of geen toegang.");
        }

        const naamTrimmed = args.naam.trim();
        if (naamTrimmed.length === 0) {
            throw new Error("VALIDATIE: Naam mag niet leeg zijn.");
        }
        if (naamTrimmed.length > MAX_NAAM_LENGTE) {
            throw new Error(`VALIDATIE: Naam mag maximaal ${MAX_NAAM_LENGTE} tekens zijn.`);
        }

        // Duplicaatcheck (excl. zichzelf)
        const alleWerkplekken = await ctx.db
            .query("werkplekken")
            .withIndex("by_token_and_volgorde", (q) =>
                q.eq("tokenIdentifier", profiel.tokenIdentifier)
            )
            .collect();

        const duplicaat = alleWerkplekken.find(
            (w) => w._id !== args.werkplekId && w.naam.toLowerCase() === naamTrimmed.toLowerCase()
        );
        if (duplicaat) {
            throw new Error(`VALIDATIE: Er bestaat al een werkplek met de naam "${duplicaat.naam}".`);
        }

        await ctx.db.patch(args.werkplekId, { naam: naamTrimmed, type: args.type });
        return { succes: true };
    },
});

/**
 * verplaatsWerkplek — wissel de volgorde van een werkplek met de buur.
 * Richting: "omhoog" (volgorde -1) of "omlaag" (volgorde +1).
 * Vereist de rol "eigenaar".
 */
export const verplaatsWerkplek = mutation({
    args: {
        werkplekId: v.id("werkplekken"),
        richting: v.union(v.literal("omhoog"), v.literal("omlaag")),
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "eigenaar");

        const werkplek = await ctx.db.get(args.werkplekId);
        if (!werkplek || werkplek.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Werkplek niet gevonden of geen toegang.");
        }

        const alleWerkplekken = await ctx.db
            .query("werkplekken")
            .withIndex("by_token_and_volgorde", (q) =>
                q.eq("tokenIdentifier", profiel.tokenIdentifier)
            )
            .order("asc")
            .collect();

        const huidigIndex = alleWerkplekken.findIndex((w) => w._id === args.werkplekId);
        const burenIndex = args.richting === "omhoog" ? huidigIndex - 1 : huidigIndex + 1;

        if (burenIndex < 0 || burenIndex >= alleWerkplekken.length) {
            return { succes: false, reden: "Al op het uiterste" };
        }

        const buur = alleWerkplekken[burenIndex];

        await ctx.db.patch(args.werkplekId, { volgorde: buur.volgorde });
        await ctx.db.patch(buur._id, { volgorde: werkplek.volgorde });

        return { succes: true };
    },
});

/**
 * seedDefaultWerkplekken — zaait 3 standaard werkplekken bij eerste gebruik.
 *
 * Idempotent: doet niets als er al werkplekken bestaan voor deze tenant.
 * Vereist de rol "eigenaar".
 */
export const seedDefaultWerkplekken = mutation({
    args: {},
    handler: async (ctx) => {
        const profiel = await requireDomainRole(ctx, "eigenaar");

        const bestaande = await ctx.db
            .query("werkplekken")
            .withIndex("by_token_and_volgorde", (q) =>
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
 *
 * Geblokkeerd als er actieve (niet-gearchiveerde) werkorders aan de plek
 * gekoppeld zijn — verwijdering zou kaartjes van het bord laten verdwijnen.
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

        // Veiligheidscheck: blokkeer bij actieve werkorders
        const actieveOrders = await ctx.db
            .query("werkorders")
            .withIndex("by_werkplek", (q) => q.eq("werkplekId", args.werkplekId))
            .filter((q) => q.neq(q.field("gearchiveerd"), true))
            .collect();

        if (actieveOrders.length > 0) {
            throw new Error(
                `GEBLOKKEERD: Er ${actieveOrders.length === 1 ? "staat" : "staan"} nog ${actieveOrders.length} actieve werkorder${actieveOrders.length === 1 ? "" : "s"} op deze plek. ` +
                `Verplaats of archiveer ze eerst.`
            );
        }

        await ctx.db.delete(args.werkplekId);
        return { verwijderd: true };
    },
});

/**
 * zetWerkplekStatus — wijzig de operationele status van een werkplek.
 *
 * Beschikbaar  → normaal in gebruik
 * In onderhoud → tijdelijk blokkeren (brug defect, service)
 * Buiten gebruik → langdurig of permanent blokkeren
 *
 * Effect op het bord:
 *   - Werkorders die al op de plek staan worden NIET verplaatst.
 *   - Nieuwe verplaatsingen naar een geblokkeerde plek worden geblokkeerd
 *     in de frontend (filter in beschikbarePlekken).
 * Vereist de rol "eigenaar".
 */
export const zetWerkplekStatus = mutation({
    args: {
        werkplekId: v.id("werkplekken"),
        status: vWerkplekStatus,
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "eigenaar");

        const werkplek = await ctx.db.get(args.werkplekId);
        if (!werkplek || werkplek.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Werkplek niet gevonden of geen toegang.");
        }

        await ctx.db.patch(args.werkplekId, { status: args.status });
        return { succes: true, nieuweStatus: args.status };
    },
});

