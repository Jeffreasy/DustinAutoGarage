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
import { requireAuth, requireDomainRole } from "./helpers";


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
 * getTotaalStatistieken — garage-brede tellers voor de eigenaar/balie KPI-blokken.
 *
 * Waarom een aparte query?
 *   `getRecenteBeurtenVerrijkt` heeft een limiet van 20 — KPI's op basis
 *   van een partial dataset zijn structureel onjuist. Deze query telt ALLE
 *   records en is geoptimaliseerd voor aggregaties, niet voor weergave.
 *
 * Resultaat:
 *   { totaal, apksDezeMaand, groteBeurten, kleineBeurten, reparaties }
 */
export const getTotaalStatistieken = query({
    args: {},
    handler: async (ctx) => {
        const tokenIdentifier = await requireAuth(ctx);
        const nu = Date.now();
        const startMaand = new Date(nu);
        startMaand.setDate(1);
        startMaand.setHours(0, 0, 0, 0);

        const alle = await ctx.db
            .query("onderhoudshistorie")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
            )
            .collect();

        return {
            totaal: alle.length,
            apksDezeMaand: alle.filter(
                (b) => b.typeWerk === "APK" && b.datumUitgevoerd >= startMaand.getTime()
            ).length,
            groteBeurten: alle.filter((b) => b.typeWerk === "Grote Beurt").length,
            kleineBeurten: alle.filter((b) => b.typeWerk === "Kleine Beurt").length,
            reparaties: alle.filter((b) => b.typeWerk === "Reparatie").length,
        };
    },
});

/**
 * getRecenteOnderhoudsbeurten — Alle onderhoudsbeurten voor de tenant,
 * gesorteerd op datum. Ondersteunt nu ook een datum-range filter.
 *
 * @param limiet   - Maximaal aantal resultaten (default: 20)
 * @param vanafMs  - Optionele startdatum (ms since epoch)
 * @param totMs    - Optionele einddatum (ms since epoch)
 */
export const getRecenteOnderhoudsbeurten = query({
    args: {
        limiet: v.optional(v.number()),
        vanafMs: v.optional(v.number()),
        totMs: v.optional(v.number()),
    },
    handler: async (ctx, args): Promise<Doc<"onderhoudshistorie">[]> => {
        const tokenIdentifier = await requireAuth(ctx);
        const limiet = args.limiet ?? 20;

        let query = ctx.db
            .query("onderhoudshistorie")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
            )
            .order("desc");

        const resultaten = await query.collect();

        // Datum-filter in memory (Convex ondersteunt geen range op by_token_identifier)
        const gefilterd = resultaten.filter((b) => {
            if (args.vanafMs !== undefined && b.datumUitgevoerd < args.vanafMs) return false;
            if (args.totMs !== undefined && b.datumUitgevoerd > args.totMs) return false;
            return true;
        });

        return gefilterd.slice(0, limiet);
    },
});


/**
 * getRecenteBeurtenVerrijkt — Recente beurten met voertuig- én klantcontext.
 *
 * Verrijkt elke beurt met een JOIN op voertuigen EN klanten.
 * Voor de eigenaar/balie activiteitsfeed: direct zichtbaar om welk voertuig
 * én welke klant het gaat, zonder extra round-trips.
 */
export const getRecenteBeurtenVerrijkt = query({
    args: { limiet: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const tokenIdentifier = await requireAuth(ctx);
        const limiet = args.limiet ?? 20;

        const beurten = await ctx.db
            .query("onderhoudshistorie")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
            )
            .order("desc")
            .take(limiet);

        // Dubbele JOIN: voertuig-data + klant-data ophalen per beurt
        const verrijkt = await Promise.all(
            beurten.map(async (beurt) => {
                const voertuig = await ctx.db.get(beurt.voertuigId);
                // klantId is optional in het schema — guard vóór ctx.db.get()
                // anders crasht de hele Promise.all als één voertuig ongebonden is
                const klant = (voertuig && voertuig.klantId)
                    ? await ctx.db.get(voertuig.klantId)
                    : null;
                return {
                    ...beurt,
                    voertuig: voertuig
                        ? {
                            _id: voertuig._id,
                            kenteken: voertuig.kenteken,
                            merk: voertuig.merk,
                            model: voertuig.model,
                            bouwjaar: voertuig.bouwjaar,
                            brandstof: voertuig.brandstof,
                            kilometerstand: voertuig.kilometerstand,
                            apkVervaldatum: voertuig.apkVervaldatum,
                        }
                        : null,
                    klant: klant
                        ? {
                            _id: klant._id,
                            voornaam: klant.voornaam,
                            achternaam: klant.achternaam,
                            telefoonnummer: klant.telefoonnummer,
                        }
                        : null,
                };
            })
        );

        return verrijkt;
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
        // B-13 FIX: Stagiairs zijn read-only — minimaal monteur vereist om beurten te registreren.
        const profiel = await requireDomainRole(ctx, "monteur");
        const tokenIdentifier = profiel.tokenIdentifier;

        const voertuig = await ctx.db.get(args.voertuigId);
        if (!voertuig || voertuig.tokenIdentifier !== tokenIdentifier) {
            throw new Error("FORBIDDEN: Voertuig niet gevonden of geen toegang.");
        }

        // M-4 FIX: datum mag niet meer dan 1 dag in de toekomst liggen
        const maxToekomst = Date.now() + 86400000; // +1 dag
        if (args.datumUitgevoerd > maxToekomst) {
            throw new Error(
                "INVALID: Datum mag maximaal één dag in de toekomst liggen. " +
                "Gebruik de werkelijke uitvoerdatum."
            );
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
        // B-13 FIX: Stagiairs zijn read-only — minimaal monteur vereist om document-URLs te muteren.
        const profiel = await requireDomainRole(ctx, "monteur");
        const tokenIdentifier = profiel.tokenIdentifier;

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
 * Vereiste domeinrol: "eigenaar".
 */
export const verwijder = mutation({
    args: { historieId: v.id("onderhoudshistorie") },
    handler: async (ctx, args): Promise<void> => {
        // Alleen eigenaar mag verwijderen — balie/monteur/stagiair hebben geen delete-rechten
        const profiel = await requireDomainRole(ctx, "eigenaar");
        // profiel.tokenIdentifier is de tenant-anchor — geen tweede requireAuth() nodig
        const tokenIdentifier = profiel.tokenIdentifier;

        const entry = await ctx.db.get(args.historieId);
        if (!entry || entry.tokenIdentifier !== tokenIdentifier) {
            throw new Error("FORBIDDEN: Onderhoudsrecord niet gevonden of geen toegang.");
        }

        await ctx.db.delete(args.historieId);
    },
});
