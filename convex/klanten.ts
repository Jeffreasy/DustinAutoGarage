/**
 * convex/klanten.ts
 *
 * Beveiligde Convex queries en mutaties voor de `klanten` tabel.
 *
 * Beveiligingscontract:
 *   - `requireAuth()` wordt als eerste aangeroepen in elke handler.
 *   - Alle DB-reads zijn gefilterd op `tokenIdentifier` (tenant-isolatie).
 *   - IDOR-bescherming: getById verifieert eigenaarschap vóór teruggave.
 *   - E-mailadres is uniek per tenant (gehandhaafd in create/update).
 *
 * Eigenaar-only endpoints vereisen `requireDomainRole(ctx, "eigenaar")`.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { vKlanttype, vKlantstatus } from "./validators";
import { requireAuth, requireDomainRole } from "./helpers";


// ---------------------------------------------------------------------------
// Queries — beschikbaar voor alle ingelogde medewerkers
// ---------------------------------------------------------------------------

/** list — Alle klanten voor de huidige tenant, nieuwste eerst. */
export const list = query({
    args: {},
    handler: async (ctx): Promise<Doc<"klanten">[]> => {
        const tokenIdentifier = await requireAuth(ctx);

        return ctx.db
            .query("klanten")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
            )
            .order("desc")
            .collect();
    },
});

/** getById — Eén klant op basis van ID. Retourneert null als niet gevonden/eigendom. */
export const getById = query({
    args: { klantId: v.id("klanten") },
    handler: async (ctx, args): Promise<Doc<"klanten"> | null> => {
        const tokenIdentifier = await requireAuth(ctx);
        const klant = await ctx.db.get(args.klantId);

        if (!klant || klant.tokenIdentifier !== tokenIdentifier) {
            return null;
        }

        return klant;
    },
});

/** getByStatus — Klanten gefilterd op levenscyclus-status. */
export const getByStatus = query({
    args: { status: vKlantstatus },
    handler: async (ctx, args): Promise<Doc<"klanten">[]> => {
        const tokenIdentifier = await requireAuth(ctx);

        return ctx.db
            .query("klanten")
            .withIndex("by_status_and_token", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier).eq("status", args.status)
            )
            .order("desc")
            .collect();
    },
});

/** zoek — Tekstzoekactie op naam, bedrijfsnaam of e-mailadres. */
export const zoek = query({
    args: { term: v.string() },
    handler: async (ctx, args): Promise<Doc<"klanten">[]> => {
        const tokenIdentifier = await requireAuth(ctx);
        const term = args.term.toLowerCase().trim();

        if (term.length < 2) return [];

        const alleKlanten = await ctx.db
            .query("klanten")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
            )
            .collect();

        return alleKlanten.filter(
            (k) =>
                k.achternaam.toLowerCase().includes(term) ||
                k.emailadres.toLowerCase().includes(term) ||
                k.voornaam.toLowerCase().includes(term) ||
                (k.bedrijfsnaam?.toLowerCase().includes(term) ?? false)
        );
    },
});

// ---------------------------------------------------------------------------
// Eigenaar-only queries
// ---------------------------------------------------------------------------

/**
 * lijstKlantenMetOmzet — alle klanten verrijkt met bezoekfrequentie.
 * "Omzet" = aantal afgeronde bezoeken via onderhoudshistorie (optie B).
 * Gesorteerd op meeste bezoeken bovenaan.
 * Vereiste domeinrol: "eigenaar".
 */
export const lijstKlantenMetOmzet = query({
    args: {},
    handler: async (ctx) => {
        const profiel = await requireDomainRole(ctx, "eigenaar");
        const tokenIdentifier = profiel.tokenIdentifier;

        const klanten = await ctx.db
            .query("klanten")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
            )
            .collect();

        const verrijkt = await Promise.all(
            klanten.map(async (klant) => {
                const voertuigen = await ctx.db
                    .query("voertuigen")
                    .withIndex("by_klant", (q) => q.eq("klantId", klant._id))
                    .collect();

                let aantalBezoeken = 0;
                let laasteBezoekvDatum: number | null = null;

                for (const voertuig of voertuigen) {
                    const historie = await ctx.db
                        .query("onderhoudshistorie")
                        .withIndex("by_voertuig", (q) => q.eq("voertuigId", voertuig._id))
                        .collect();
                    aantalBezoeken += historie.length;
                    for (const h of historie) {
                        if (!laasteBezoekvDatum || h.datumUitgevoerd > laasteBezoekvDatum) {
                            laasteBezoekvDatum = h.datumUitgevoerd;
                        }
                    }
                }

                return {
                    ...klant,
                    aantalBezoeken,
                    laasteBezoekvDatum,
                    aantalVoertuigen: voertuigen.length,
                };
            })
        );

        return verrijkt.sort((a, b) => b.aantalBezoeken - a.aantalBezoeken);
    },
});

/**
 * exportKlanten — CSV-ready export van alle klanten.
 * Retourneert platte objecten; de client converteert naar CSV-download.
 * Vereiste domeinrol: "eigenaar".
 */
export const exportKlanten = query({
    args: {},
    handler: async (ctx) => {
        const profiel = await requireDomainRole(ctx, "eigenaar");
        const tokenIdentifier = profiel.tokenIdentifier;

        const klanten = await ctx.db
            .query("klanten")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
            )
            .collect();

        return klanten.map((k) => ({
            voornaam: k.voornaam,
            achternaam: k.achternaam,
            bedrijfsnaam: k.bedrijfsnaam ?? "",
            klanttype: k.klanttype,
            emailadres: k.emailadres,
            telefoonnummer: k.telefoonnummer,
            adres: k.adres,
            postcode: k.postcode,
            woonplaats: k.woonplaats,
            status: k.status,
            accepteertMarketing: k.accepteertMarketing ? "Ja" : "Nee",
            klantSinds: new Date(k.klantSinds).toLocaleDateString("nl-NL"),
        }));
    },
});

// ---------------------------------------------------------------------------
// Mutaties
// ---------------------------------------------------------------------------

/** create — Voeg een nieuwe klant toe. Garandeert e-mailuniciteit per tenant. */
export const create = mutation({
    args: {
        klanttype: vKlanttype,
        voornaam: v.string(),
        achternaam: v.string(),
        bedrijfsnaam: v.optional(v.string()),
        adres: v.string(),
        postcode: v.string(),
        woonplaats: v.string(),
        telefoonnummer: v.string(),
        emailadres: v.string(),
        accepteertMarketing: v.boolean(),
        status: vKlantstatus,
        klantNotities: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<Id<"klanten">> => {
        const tokenIdentifier = await requireAuth(ctx);

        const bestaand = await ctx.db
            .query("klanten")
            .withIndex("by_email_and_token", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
                    .eq("emailadres", args.emailadres.toLowerCase())
            )
            .first();

        if (bestaand) {
            throw new Error(
                `CONFLICT: Het e-mailadres "${args.emailadres}" is al in gebruik bij een andere klant.`
            );
        }

        return ctx.db.insert("klanten", {
            ...args,
            emailadres: args.emailadres.toLowerCase(),
            tokenIdentifier,
            klantSinds: Date.now(),
        });
    },
});

/** update — Wijzig klantgegevens (patch semantiek). */
export const update = mutation({
    args: {
        klantId: v.id("klanten"),
        klanttype: v.optional(vKlanttype),
        voornaam: v.optional(v.string()),
        achternaam: v.optional(v.string()),
        bedrijfsnaam: v.optional(v.string()),
        adres: v.optional(v.string()),
        postcode: v.optional(v.string()),
        woonplaats: v.optional(v.string()),
        telefoonnummer: v.optional(v.string()),
        emailadres: v.optional(v.string()),
        accepteertMarketing: v.optional(v.boolean()),
        status: v.optional(vKlantstatus),
        klantNotities: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<void> => {
        const tokenIdentifier = await requireAuth(ctx);

        const klant = await ctx.db.get(args.klantId);
        if (!klant || klant.tokenIdentifier !== tokenIdentifier) {
            throw new Error("FORBIDDEN: Klant niet gevonden of geen toegang.");
        }

        const { klantId, emailadres, ...rest } = args;

        if (emailadres && emailadres.toLowerCase() !== klant.emailadres) {
            const conflictKlant = await ctx.db
                .query("klanten")
                .withIndex("by_email_and_token", (q) =>
                    q.eq("tokenIdentifier", tokenIdentifier)
                        .eq("emailadres", emailadres.toLowerCase())
                )
                .first();

            if (conflictKlant) {
                throw new Error(
                    `CONFLICT: Het e-mailadres "${emailadres}" is al in gebruik.`
                );
            }
        }

        const patch = {
            ...rest,
            ...(emailadres ? { emailadres: emailadres.toLowerCase() } : {}),
        };

        const cleanPatch = Object.fromEntries(
            Object.entries(patch).filter(([, val]) => val !== undefined)
        );

        await ctx.db.patch(klantId, cleanPatch);
    },
});

/**
 * updateKlantBalieVelden — balie+ kan klantNotities + accepteertMarketing updaten.
 * Losstaand van `update` voor een duidelijkere audit trail.
 */
export const updateKlantBalieVelden = mutation({
    args: {
        klantId: v.id("klanten"),
        klantNotities: v.optional(v.string()),
        accepteertMarketing: v.optional(v.boolean()),
    },
    handler: async (ctx, args): Promise<{ succes: boolean }> => {
        const profiel = await requireDomainRole(ctx, "balie");

        const klant = await ctx.db.get(args.klantId);
        if (!klant || klant.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Klant niet gevonden of geen toegang.");
        }

        const patch: Record<string, unknown> = {};
        if (args.klantNotities !== undefined) patch.klantNotities = args.klantNotities;
        if (args.accepteertMarketing !== undefined) patch.accepteertMarketing = args.accepteertMarketing;

        await ctx.db.patch(args.klantId, patch);
        return { succes: true };
    },
});

/** deactiveer — Zachte verwijdering: zet status op "Inactief". */
export const deactiveer = mutation({
    args: { klantId: v.id("klanten") },
    handler: async (ctx, args): Promise<void> => {
        const tokenIdentifier = await requireAuth(ctx);

        const klant = await ctx.db.get(args.klantId);
        if (!klant || klant.tokenIdentifier !== tokenIdentifier) {
            throw new Error("FORBIDDEN: Klant niet gevonden of geen toegang.");
        }

        await ctx.db.patch(args.klantId, { status: "Inactief" });
    },
});

/**
 * verwijder — Harde verwijdering van een klant en al zijn gekoppelde data.
 * ⚠️  Cascade: voertuigen → onderhoudshistorie → werkorders → werkorderLogs
 */
export const verwijder = mutation({
    args: { klantId: v.id("klanten") },
    handler: async (ctx, args): Promise<void> => {
        const tokenIdentifier = await requireAuth(ctx);

        const klant = await ctx.db.get(args.klantId);
        if (!klant || klant.tokenIdentifier !== tokenIdentifier) {
            throw new Error("FORBIDDEN: Klant niet gevonden of geen toegang.");
        }

        const voertuigen = await ctx.db
            .query("voertuigen")
            .withIndex("by_klant", (q) => q.eq("klantId", args.klantId))
            .collect();

        for (const voertuig of voertuigen) {
            const historie = await ctx.db
                .query("onderhoudshistorie")
                .withIndex("by_voertuig", (q) => q.eq("voertuigId", voertuig._id))
                .collect();
            for (const entry of historie) {
                await ctx.db.delete(entry._id);
            }

            const werkorders = await ctx.db
                .query("werkorders")
                .withIndex("by_voertuig", (q) => q.eq("voertuigId", voertuig._id))
                .collect();
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

            await ctx.db.delete(voertuig._id);
        }

        await ctx.db.delete(args.klantId);
    },
});
