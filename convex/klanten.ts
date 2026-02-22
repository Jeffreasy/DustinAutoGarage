/**
 * convex/klanten.ts
 *
 * Beveiligde Convex queries en mutaties voor de `klanten` tabel.
 *
 * Beveiligingscontract (identiek aan voertuigen.ts):
 *   - `requireAuth()` wordt als eerste aangeroepen in elke handler.
 *   - Alle DB-reads zijn gefilterd op `tokenIdentifier` (tenant-isolatie).
 *   - IDOR-bescherming: getById verifieert eigenaarschap vóór teruggave.
 *   - E-mailadres is uniek per tenant (gehandhaafd in create/update).
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { vKlanttype, vKlantstatus } from "./validators";
import { requireAuth } from "./helpers";


// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * list — Alle klanten voor de huidige tenant.
 * Gesorteerd op aanmaakdatum (nieuwste eerst).
 */
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

/**
 * getById — Eén klant op basis van ID.
 * Retourneert null als de klant niet bestaat of niet toebehoort aan de sessie.
 */
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

/**
 * getByStatus — Gefilterde klanten op levenscyclus-status.
 * Handig voor rapporten: "Toon alle Prospect klanten" of "Alle Inactieve accounts".
 */
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

/**
 * zoek — Eenvoudige tekstzoekactie op achternaam of e-mailadres.
 * Haalt alle klanten op en filtert in-memory (acceptabel voor kleinere datasets).
 */
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
// Mutaties
// ---------------------------------------------------------------------------

/**
 * create — Voeg een nieuwe klant toe.
 * Garandeert uniciteit van e-mailadres per tenant.
 */
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

        // E-mail uniciteit afdwingen binnen de tenant
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

/**
 * update — Wijzig klantgegevens.
 * Alleen de opgegeven velden worden bijgewerkt (patch semantiek).
 * E-mail-uniciteit wordt opnieuw gecontroleerd als het adres wijzigt.
 */
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

        // Controleer uniciteit als e-mail wijzigt
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

        // Verwijder undefined waarden voor een schone patch
        const cleanPatch = Object.fromEntries(
            Object.entries(patch).filter(([, v]) => v !== undefined)
        );

        await ctx.db.patch(klantId, cleanPatch);
    },
});

/**
 * deactiveer — Zachte verwijdering: zet status op "Inactief".
 * Gebruik dit in plaats van een harde delete om historische data te bewaren.
 */
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
 * verwijder — Harde verwijdering van een klant en al zijn gekoppelde voertuigen.
 *
 * ⚠️  Gebruik alleen als de klant geen actief dossier meer heeft.
 *     Overweeg `deactiveer()` voor standaard gebruik.
 */
export const verwijder = mutation({
    args: { klantId: v.id("klanten") },
    handler: async (ctx, args): Promise<void> => {
        const tokenIdentifier = await requireAuth(ctx);

        const klant = await ctx.db.get(args.klantId);
        if (!klant || klant.tokenIdentifier !== tokenIdentifier) {
            throw new Error("FORBIDDEN: Klant niet gevonden of geen toegang.");
        }

        // Verwijder gekoppelde voertuigen (cascade)
        const voertuigen = await ctx.db
            .query("voertuigen")
            .withIndex("by_klant", (q) => q.eq("klantId", args.klantId))
            .collect();

        for (const voertuig of voertuigen) {
            // Cascade: onderhoudshistorie
            const historie = await ctx.db
                .query("onderhoudshistorie")
                .withIndex("by_voertuig", (q) => q.eq("voertuigId", voertuig._id))
                .collect();
            for (const entry of historie) {
                await ctx.db.delete(entry._id);
            }

            // 🔴 FIX #2: Cascade werkorders + werkorderLogs per voertuig.
            // Voorkomt ghost records op het Werkplaatsbord na verwijdering van klant.
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
