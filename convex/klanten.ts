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

/** list — Alle klanten voor de huidige tenant, nieuwste eerst.
 *  Interne medewerker-profielen (isInternMedewerker=true) worden gefilterd. */
export const list = query({
    args: {},
    handler: async (ctx): Promise<Doc<"klanten">[]> => {
        const tokenIdentifier = await requireAuth(ctx);

        const alle = await ctx.db
            .query("klanten")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
            )
            .order("desc")
            .collect();

        // Filter interne medewerker-records uit het standaard overzicht
        return alle.filter((k) => !k.isInternMedewerker);
    },
});

/**
 * getMijnKlantProfiel — haalt het interne klant-profiel op van de ingelogde medewerker.
 * Retourneert null als nog geen intern profiel bestaat.
 * Toegankelijk voor alle rollen — iedereen mag zijn eigen profiel ophalen.
 */
export const getMijnKlantProfiel = query({
    args: {},
    handler: async (ctx): Promise<Doc<"klanten"> | null> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        const tokenIdentifier = identity.tokenIdentifier;
        const userId = (identity as Record<string, unknown>).userId as string | undefined
            ?? identity.subject;

        return ctx.db
            .query("klanten")
            .withIndex("by_medewerker_and_token", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier).eq("medewerkerId", userId)
            )
            .first();
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
 * lijstKlantenMetOmzet — alle klanten verrijkt met:
 *   - aantalBezoeken: sum van onderhoudshistorie records
 *   - aantalVoertuigen: wagenpark grootte
 *   - omzetTotaal: som van werkorders.totaalKosten (excl. BTW)
 *   - laasteBezoekvDatum: meest recente datum uit onderhoudshistorie OF afgesloten werkorder
 * Gesorteerd op hoogste omzet bovenaan.
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
                let omzetTotaal = 0;
                let aantalWerkorders = 0;

                for (const voertuig of voertuigen) {
                    // Onderhoudshistorie — beurten tellen
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

                    // Werkorders — omzet + laatste datum
                    const werkorders = await ctx.db
                        .query("werkorders")
                        .withIndex("by_voertuig", (q) => q.eq("voertuigId", voertuig._id))
                        .collect();
                    for (const wo of werkorders) {
                        if (wo.totaalKosten !== undefined && wo.totaalKosten > 0) {
                            omzetTotaal += wo.totaalKosten;
                            aantalWerkorders++;
                        }
                        // Gebruik afspraakDatum als proxy voor laatste bezoek via werkorder
                        if (!laasteBezoekvDatum || wo.afspraakDatum > laasteBezoekvDatum) {
                            laasteBezoekvDatum = wo.afspraakDatum;
                        }
                    }
                }

                return {
                    ...klant,
                    aantalBezoeken,
                    aantalVoertuigen: voertuigen.length,
                    laasteBezoekvDatum,
                    omzetTotaal,
                    aantalWerkorders,
                };
            })
        );

        // Sorteren op omzet — klanten zonder omzet zakken naar beneden
        return verrijkt.sort((a, b) => b.omzetTotaal - a.omzetTotaal || b.aantalBezoeken - a.aantalBezoeken);
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
        // B-11 FIX: Stagiairs zijn read-only — minimaal monteur vereist om klanten aan te maken.
        // Was requireAuth: stagiairs hadden schrijftoegang ondanks de bedoeling read-only te zijn.
        const profiel = await requireDomainRole(ctx, "monteur");
        const tokenIdentifier = profiel.tokenIdentifier;

        // Guard: verplichte tekstvelden mogen niet leeg zijn ("" na trim).
        // HTML-required is client-side en omzeild via directe API-calls.
        const leegeVelden: string[] = [];
        if (!args.voornaam.trim()) leegeVelden.push("voornaam");
        if (!args.achternaam.trim()) leegeVelden.push("achternaam");
        if (!args.emailadres.trim()) leegeVelden.push("emailadres");
        if (!args.telefoonnummer.trim()) leegeVelden.push("telefoonnummer");
        if (!args.adres.trim()) leegeVelden.push("adres");
        if (!args.postcode.trim()) leegeVelden.push("postcode");
        if (!args.woonplaats.trim()) leegeVelden.push("woonplaats");
        if (leegeVelden.length > 0) {
            throw new Error(
                `INVALID: De volgende verplichte velden zijn leeg: ${leegeVelden.join(", ")}.`
            );
        }

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
            voornaam: args.voornaam.trim(),
            achternaam: args.achternaam.trim(),
            emailadres: args.emailadres.trim().toLowerCase(),
            telefoonnummer: args.telefoonnummer.trim(),
            adres: args.adres.trim(),
            postcode: args.postcode.trim(),
            woonplaats: args.woonplaats.trim(),
            tokenIdentifier,
            klantSinds: Date.now(),
        });
    },
});

/** update — Wijzig klantgegevens (patch semantiek).
 * M-7 FIX: Vereist minimaal de rol "balie" — consistentie met deactiveer.
 * Stagiairs mogen geen contactgegevens of klanttype wijzigen.
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
        const profiel = await requireDomainRole(ctx, "balie");
        const tokenIdentifier = profiel.tokenIdentifier;

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
            ...(emailadres ? { emailadres: emailadres.trim().toLowerCase() } : {}),
        };

        // Filter undefined AND lege strings om te voorkomen dat een patch
        // verplichte velden leeg maakt (bijv. voornaam: "").
        const VERPLICHT = new Set(["voornaam", "achternaam", "emailadres", "telefoonnummer", "adres", "postcode", "woonplaats"]);
        const cleanPatch = Object.fromEntries(
            Object.entries(patch).filter(([key, val]) => {
                if (val === undefined) return false;
                if (typeof val === "string" && val.trim() === "" && VERPLICHT.has(key)) return false;
                return true;
            })
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

/**
 * deactiveer — Zachte verwijdering: zet status op "Inactief".
 * Vereist minimaal de rol "balie" — monteurs/stagiairs mogen geen klanten deactiveren.
 */
export const deactiveer = mutation({
    args: { klantId: v.id("klanten") },
    handler: async (ctx, args): Promise<void> => {
        const profiel = await requireDomainRole(ctx, "balie");

        const klant = await ctx.db.get(args.klantId);
        if (!klant || klant.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Klant niet gevonden of geen toegang.");
        }

        await ctx.db.patch(args.klantId, { status: "Inactief" });
    },
});

/**
 * verwijder — Harde verwijdering van een klant en al zijn gekoppelde data.
 * ⚠️  Cascade: voertuigen → onderhoudshistorie → werkorders → werkorderLogs
 * Vereist de rol "eigenaar" — cascade-delete is een onomkeerbare destructieve actie.
 */
export const verwijder = mutation({
    args: { klantId: v.id("klanten") },
    handler: async (ctx, args): Promise<void> => {
        const profiel = await requireDomainRole(ctx, "eigenaar");
        const tokenIdentifier = profiel.tokenIdentifier;

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

/**
 * registreerMedewerkerAlsKlant — maakt een intern klant-profiel voor een medewerker.
 *
 * Idempotent: retourneert bestaand profiel-ID als medewerker al geregistreerd is.
 * Security:
 *   - Balie+: mag voor elke medewerker een profiel aanmaken
 *   - Elke rol: mag eigen profiel aanmaken (userId wordt gevalideerd)
 *
 * Voertuig koppeling: gebruik daarna voertuigen.create({ klantId: returnwaarde })
 */
export const registreerMedewerkerAlsKlant = mutation({
    args: {
        voornaam: v.string(),
        achternaam: v.string(),
        telefoonnummer: v.optional(v.string()),
        emailadres: v.optional(v.string()),
        /** userId van de te registreren medewerker — indien leeg: huidige gebruiker */
        medewerkerId: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<{ klantId: string; isNieuw: boolean }> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("UNAUTHORIZED: Niet ingelogd.");
        const tokenIdentifier = identity.tokenIdentifier;
        const huidigUserId = (identity as Record<string, unknown>).userId as string | undefined
            ?? identity.subject;

        // Medewerker registreert zichzelf, of balie/eigenaar registreert iemand anders
        const doelMedewerkerId = args.medewerkerId ?? huidigUserId;

        // IDOR check: als je iemand anders registreert moet je balie+ zijn
        if (doelMedewerkerId !== huidigUserId) {
            await requireDomainRole(ctx, "balie");
        }

        // Idempotentie: al een profiel?
        const bestaand = await ctx.db
            .query("klanten")
            .withIndex("by_medewerker_and_token", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier).eq("medewerkerId", doelMedewerkerId)
            )
            .first();

        if (bestaand) {
            return { klantId: bestaand._id, isNieuw: false };
        }

        // Nieuw intern klant-record aanmaken
        const klantId = await ctx.db.insert("klanten", {
            klanttype: "Particulier",
            voornaam: args.voornaam.trim(),
            achternaam: args.achternaam.trim(),
            bedrijfsnaam: undefined,
            adres: "—",
            postcode: "—",
            woonplaats: "—",
            telefoonnummer: args.telefoonnummer?.trim() ?? "—",
            emailadres: args.emailadres?.trim().toLowerCase() ?? `intern.${doelMedewerkerId}@garage`,
            accepteertMarketing: false,
            status: "Actief",
            klantSinds: Date.now(),
            isInternMedewerker: true,
            medewerkerId: doelMedewerkerId,
            tokenIdentifier,
        });

        return { klantId, isNieuw: true };
    },
});
