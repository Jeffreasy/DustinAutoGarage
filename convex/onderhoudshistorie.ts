/**
 * convex/onderhoudshistorie.ts
 *
 * Beveiligde Convex queries en mutaties voor de `onderhoudshistorie` tabel.
 *
 * Gescheiden van voertuigen.ts zodat het dossier zijn eigen, volwaardige
 * module heeft. Eenvoudig uitbreidbaar met bijv. documenten of betalingen.
 *
 * Beveiligingscontract (identiek aan voertuigen.ts):
 *   - `requireAuth()` wordt als eerste aangeroepen.
 *   - Eigenaarschap van het voertuig wordt altijd geverifieerd (IDOR-bescherming).
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { vTypeWerk } from "./validators";
import { requireAuth } from "./helpers";


// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * getHistorie — Volledig dossier van alle werkzaamheden voor één voertuig.
 * Gesorteerd op datum (meest recent eerst).
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

/**
 * getRecenteOnderhoudsbeurten — Alle onderhoudsbeurten voor de tenant,
 * gesorteerd op datum. Handig voor een activiteitenfeed op het dashboard.
 *
 * @param limiet - Maximaal aantal resultaten (default: 20)
 */
export const getRecenteOnderhoudsbeurten = query({
    args: { limiet: v.optional(v.number()) },
    handler: async (ctx, args): Promise<Doc<"onderhoudshistorie">[]> => {
        const tokenIdentifier = await requireAuth(ctx);
        const limiet = args.limiet ?? 20;

        return ctx.db
            .query("onderhoudshistorie")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
            )
            .order("desc")
            .take(limiet);
    },
});

// ---------------------------------------------------------------------------
// Mutaties
// ---------------------------------------------------------------------------

/**
 * registreer — Voeg een nieuwe onderhoudsbeurt toe aan het dossier.
 * Synchroniseert automatisch de kilometerstand op het voertuig als de
 * nieuwe stand hoger is dan de bekende stand.
 */
export const registreer = mutation({
    args: {
        voertuigId: v.id("voertuigen"),
        datumUitgevoerd: v.number(),
        typeWerk: vTypeWerk,
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

        // Kilometerstand automatisch bijwerken als de nieuwe stand hoger is
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

/**
 * updateDocumentUrl — Voeg een factuur- of keuringsrapportlink toe
 * aan een bestaande onderhoudsbeurt.
 */
export const updateDocumentUrl = mutation({
    args: {
        historieId: v.id("onderhoudshistorie"),
        documentUrl: v.string(),
    },
    handler: async (ctx, args): Promise<void> => {
        const tokenIdentifier = await requireAuth(ctx);

        const entry = await ctx.db.get(args.historieId);
        if (!entry || entry.tokenIdentifier !== tokenIdentifier) {
            throw new Error("FORBIDDEN: Onderhoudsrecord niet gevonden of geen toegang.");
        }

        await ctx.db.patch(args.historieId, {
            documentUrl: args.documentUrl,
        });
    },
});

/**
 * verwijder — Verwijder een onderhoudsrecord.
 * Kilometerstand op het voertuig wordt NIET teruggedraaid (dat vereist
 * een herberekening van alle records — te implementeren indien gewenst).
 */
export const verwijder = mutation({
    args: { historieId: v.id("onderhoudshistorie") },
    handler: async (ctx, args): Promise<void> => {
        const tokenIdentifier = await requireAuth(ctx);

        const entry = await ctx.db.get(args.historieId);
        if (!entry || entry.tokenIdentifier !== tokenIdentifier) {
            throw new Error("FORBIDDEN: Onderhoudsrecord niet gevonden of geen toegang.");
        }

        await ctx.db.delete(args.historieId);
    },
});
