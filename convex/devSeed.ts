/**
 * convex/devSeed.ts
 *
 * DEV ONLY — Seed medewerker record for the logged-in dev account,
 * plus comprehensive garage data (klanten, voertuigen, werkplekken,
 * werkorders, onderhoudshistorie).
 *
 * Triggered by dev-login.html after each login.
 * All operations are idempotent (skip if data already exists).
 */

import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { vDomeinRol } from "./validators";

// ── 1. Seed current user as medewerker ────────────────────────────────────

export const seedDevMedewerker = mutation({
    args: {
        naam: v.string(),
        domeinRol: vDomeinRol,
    },
    handler: async (ctx, { naam, domeinRol }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("UNAUTHENTICATED");

        // Bepaal de correcte tenant tokenIdentifier:
        // - eigenaar: eigen tokenIdentifier
        // - anderen: eigenaar's tokenIdentifier als gedeeld tenant-anchor
        let tenantTokenIdentifier = identity.tokenIdentifier;

        if (domeinRol !== "eigenaar") {
            const eigenaar = await ctx.db
                .query("medewerkers")
                .collect()
                .then(all => all.find(m => m.domeinRol === "eigenaar" && m.actief));

            if (eigenaar) {
                tenantTokenIdentifier = eigenaar.tokenIdentifier;
            }
        }

        // Check of er al een record bestaat voor deze user (via userId)
        const bestaand = await ctx.db
            .query("medewerkers")
            .withIndex("by_userId", (q) =>
                q.eq("userId", identity.subject)
            )
            .first();

        if (bestaand) {
            // Bouw een patch object met alle velden die mogelijk moeten worden gecorrigeerd.
            // Kritiek: als het record een verkeerde tokenIdentifier heeft (aangemaakt vóór eigenaar
            // bestond), dan corrigeren we die nu alsnog.
            const updates: Record<string, unknown> = {};
            if (bestaand.domeinRol !== domeinRol) updates.domeinRol = domeinRol;
            if (bestaand.naam !== naam) updates.naam = naam;
            if (bestaand.tokenIdentifier !== tenantTokenIdentifier) {
                updates.tokenIdentifier = tenantTokenIdentifier;
            }

            if (Object.keys(updates).length > 0) {
                await ctx.db.patch(bestaand._id, updates);
                return { action: "updated", id: bestaand._id, updates };
            }
            return { action: "skipped", id: bestaand._id };
        }

        const id = await ctx.db.insert("medewerkers", {
            userId: identity.subject,
            tokenIdentifier: tenantTokenIdentifier,
            domeinRol,
            naam,
            actief: true,
            aangemaaktOp: Date.now(),
        });

        return { action: "created", id };
    },
});


// ── 2. Seed full garage data (run once as eigenaar) ───────────────────────

export const seedGarageData = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("UNAUTHENTICATED");

        const ti = identity.tokenIdentifier;
        const now = Date.now();

        // ── Guard: alleen uitvoeren als er nog geen klanten zijn ─────────────
        const bestaandeKlant = await ctx.db
            .query("klanten")
            .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", ti))
            .first();

        if (bestaandeKlant) {
            return { skipped: true, reden: "Data bestaat al" };
        }

        // ─────────────────────────────────────────────────────────────────────
        // KLANTEN
        // ─────────────────────────────────────────────────────────────────────
        const klantData = [
            {
                klanttype: "Particulier" as const,
                voornaam: "Jan", achternaam: "de Vries",
                adres: "Hoofdstraat 12", postcode: "1234 AB", woonplaats: "Amsterdam",
                telefoonnummer: "+31612345678", emailadres: "jan.devries@gmail.com",
                accepteertMarketing: true, status: "Actief" as const,
                klantSinds: now - 365 * 86400000,
                klantNotities: "Vaste klant, altijd contant.",
            },
            {
                klanttype: "Particulier" as const,
                voornaam: "Sandra", achternaam: "Bakker",
                adres: "Kerkstraat 44", postcode: "2500 CD", woonplaats: "Den Haag",
                telefoonnummer: "+31687654321", emailadres: "sandra.bakker@hotmail.nl",
                accepteertMarketing: false, status: "Actief" as const,
                klantSinds: now - 180 * 86400000,
            },
            {
                klanttype: "Zakelijk" as const,
                voornaam: "Marco", achternaam: "Prins",
                bedrijfsnaam: "Prins Transport BV",
                adres: "Industrieweg 8", postcode: "3800 EF", woonplaats: "Amersfoort",
                telefoonnummer: "+31623456789", emailadres: "info@prinstransport.nl",
                accepteertMarketing: true, status: "Actief" as const,
                klantSinds: now - 730 * 86400000,
                klantNotities: "Wagenpark van 6 bestelwagens. Elk kwartaal groot onderhoud.",
            },
            {
                klanttype: "Particulier" as const,
                voornaam: "Fatima", achternaam: "El Amrani",
                adres: "Tulpstraat 3", postcode: "5611 GH", woonplaats: "Eindhoven",
                telefoonnummer: "+31698765432", emailadres: "fatima.elamrani@outlook.com",
                accepteertMarketing: true, status: "Actief" as const,
                klantSinds: now - 90 * 86400000,
            },
            {
                klanttype: "Particulier" as const,
                voornaam: "Peter", achternaam: "Smit",
                adres: "Bosweg 21", postcode: "7001 IJ", woonplaats: "Doetinchem",
                telefoonnummer: "+31655544433", emailadres: "p.smit@planet.nl",
                accepteertMarketing: false, status: "Inactief" as const,
                klantSinds: now - 900 * 86400000,
                klantNotities: "Vorig jaar vertrokken naar andere garage.",
            },
            {
                klanttype: "Zakelijk" as const,
                voornaam: "Lisa", achternaam: "van den Berg",
                bedrijfsnaam: "Van den Berg Catering",
                adres: "Handelsweg 55", postcode: "2900 KL", woonplaats: "Capelle a/d IJssel",
                telefoonnummer: "+31611122233", emailadres: "lisa@vandenbergcatering.nl",
                accepteertMarketing: true, status: "Actief" as const,
                klantSinds: now - 45 * 86400000,
            },
        ];

        const klantIds: Record<string, any> = {};
        for (const k of klantData) {
            const id = await ctx.db.insert("klanten", { ...k, tokenIdentifier: ti });
            klantIds[k.emailadres] = id;
        }

        // ─────────────────────────────────────────────────────────────────────
        // VOERTUIGEN — echte Nederlandse kentekens
        // ─────────────────────────────────────────────────────────────────────
        const voertuigData = [
            {
                klantEmail: "jan.devries@gmail.com",
                kenteken: "GH-446-V", merk: "Peugeot", model: "207",
                bouwjaar: 2009, brandstof: "Benzine" as const,
                kilometerstand: 187430,
                apkVervaldatum: new Date("2026-06-01").getTime(),
                voertuigNotities: "Olielekkage remand, controleren.",
            },
            {
                klantEmail: "jan.devries@gmail.com",
                kenteken: "SB-756-T", merk: "Volkswagen", model: "Golf VII",
                bouwjaar: 2015, brandstof: "Diesel" as const,
                kilometerstand: 223100,
                apkVervaldatum: new Date("2025-11-15").getTime(),
            },
            {
                klantEmail: "sandra.bakker@hotmail.nl",
                kenteken: "LT-348-R", merk: "Toyota", model: "Yaris",
                bouwjaar: 2019, brandstof: "Hybride" as const,
                kilometerstand: 67800,
                apkVervaldatum: new Date("2027-03-20").getTime(),
            },
            {
                klantEmail: "info@prinstransport.nl",
                kenteken: "VN-123-B", merk: "Mercedes-Benz", model: "Sprinter 315 CDI",
                bouwjaar: 2020, brandstof: "Diesel" as const,
                kilometerstand: 312000,
                apkVervaldatum: new Date("2025-12-01").getTime(),
                voertuigNotities: "Bedrijfsbus, wekelijks onderhoud contract.",
            },
            {
                klantEmail: "info@prinstransport.nl",
                kenteken: "KZ-456-X", merk: "Ford", model: "Transit Custom",
                bouwjaar: 2021, brandstof: "Diesel" as const,
                kilometerstand: 145000,
                apkVervaldatum: new Date("2026-02-28").getTime(),
            },
            {
                klantEmail: "fatima.elamrani@outlook.com",
                kenteken: "RT-789-N", merk: "Renault", model: "Clio V",
                bouwjaar: 2022, brandstof: "Benzine" as const,
                kilometerstand: 28400,
                apkVervaldatum: new Date("2027-08-10").getTime(),
            },
            {
                klantEmail: "p.smit@planet.nl",
                kenteken: "HF-234-G", merk: "BMW", model: "3 Serie",
                bouwjaar: 2012, brandstof: "Diesel" as const,
                kilometerstand: 298750,
                apkVervaldatum: new Date("2025-09-05").getTime(),
                voertuigNotities: "Roestproblemen onderzijde.",
            },
            {
                klantEmail: "lisa@vandenbergcatering.nl",
                kenteken: "BK-567-P", merk: "Citroën", model: "Berlingo",
                bouwjaar: 2018, brandstof: "Diesel" as const,
                kilometerstand: 178000,
                apkVervaldatum: new Date("2026-04-15").getTime(),
            },
            {
                klantEmail: "lisa@vandenbergcatering.nl",
                kenteken: "ZN-890-W", merk: "Opel", model: "Vivaro",
                bouwjaar: 2019, brandstof: "Diesel" as const,
                kilometerstand: 201000,
                apkVervaldatum: new Date("2025-10-30").getTime(),
                voertuigNotities: "Airco werkt niet — gas bijvullen.",
            },
            {
                klantEmail: "sandra.bakker@hotmail.nl",
                kenteken: "DA-112-M", merk: "Kia", model: "Niro EV",
                bouwjaar: 2023, brandstof: "EV" as const,
                kilometerstand: 18200,
                apkVervaldatum: new Date("2028-01-01").getTime(),
            },
        ];

        const voertuigIds: Record<string, any> = {};
        for (const v of voertuigData) {
            const klantId = klantIds[v.klantEmail];
            const id = await ctx.db.insert("voertuigen", {
                klantId,
                kenteken: v.kenteken.replace(/-/g, "-"),
                merk: v.merk,
                model: v.model,
                bouwjaar: v.bouwjaar,
                brandstof: v.brandstof,
                kilometerstand: v.kilometerstand,
                apkVervaldatum: v.apkVervaldatum,
                voertuigNotities: v.voertuigNotities,
                tokenIdentifier: ti,
                aangemaaktOp: now,
            });
            voertuigIds[v.kenteken] = id;
        }

        // ─────────────────────────────────────────────────────────────────────
        // WERKPLEKKEN
        // ─────────────────────────────────────────────────────────────────────
        const werkplekData = [
            { naam: "Brug 1", type: "Brug" as const, volgorde: 1 },
            { naam: "Brug 2", type: "Brug" as const, volgorde: 2 },
            { naam: "Brug 3", type: "Brug" as const, volgorde: 3 },
            { naam: "Uitlijnbrug", type: "Uitlijnbrug" as const, volgorde: 4 },
            { naam: "Wasplaats", type: "Wasplaats" as const, volgorde: 5 },
        ];

        const werkplekIds: Record<string, any> = {};
        for (const wp of werkplekData) {
            const id = await ctx.db.insert("werkplekken", { ...wp, tokenIdentifier: ti });
            werkplekIds[wp.naam] = id;
        }

        // ─────────────────────────────────────────────────────────────────────
        // WERKORDERS — alle statussen zodat het Kanban bord vol is
        // ─────────────────────────────────────────────────────────────────────
        const today = new Date();
        today.setHours(8, 0, 0, 0);
        const dag = today.getTime();
        const morgen = dag + 86400000;
        const gisteren = dag - 86400000;

        const werkorderData = [
            {
                kenteken: "GH-446-V", klantEmail: "jan.devries@gmail.com",
                klacht: "APK keuring + kleine beurt",
                status: "Bezig" as const,
                werkplek: "Brug 1", afspraakDatum: dag,
            },
            {
                kenteken: "VN-123-B", klantEmail: "info@prinstransport.nl",
                klacht: "Remblokken voor en achter vervangen",
                status: "Wacht op onderdelen" as const,
                werkplek: "Brug 2", afspraakDatum: dag,
            },
            {
                kenteken: "LT-348-R", klantEmail: "sandra.bakker@hotmail.nl",
                klacht: "Bandenwissel zomer → winter",
                status: "Klaar" as const,
                werkplek: "Brug 3", afspraakDatum: dag,
            },
            {
                kenteken: "SB-756-T", klantEmail: "jan.devries@gmail.com",
                klacht: "Diagnose motorstoring (foutcode P0301)",
                status: "Wachtend" as const,
                werkplek: "Brug 1", afspraakDatum: morgen,
            },
            {
                kenteken: "KZ-456-X", klantEmail: "info@prinstransport.nl",
                klacht: "Grote beurt 150.000 km (distributieriem + waterpomp)",
                status: "Wachtend" as const,
                werkplek: undefined, afspraakDatum: morgen,
            },
            {
                kenteken: "HF-234-G", klantEmail: "p.smit@planet.nl",
                klacht: "Airco niet koud — gas bijvullen",
                status: "Klaar" as const,
                werkplek: "Wasplaats", afspraakDatum: gisteren,
            },
            {
                kenteken: "BK-567-P", klantEmail: "lisa@vandenbergcatering.nl",
                klacht: "Periodiek onderhoud + APK",
                status: "Bezig" as const,
                werkplek: "Uitlijnbrug", afspraakDatum: dag,
            },
            {
                kenteken: "RT-789-N", klantEmail: "fatima.elamrani@outlook.com",
                klacht: "Vreemd geluid links achter bij optrekken",
                status: "Wachtend" as const,
                werkplek: undefined, afspraakDatum: morgen,
            },
        ];

        for (const wo of werkorderData) {
            await ctx.db.insert("werkorders", {
                voertuigId: voertuigIds[wo.kenteken],
                klantId: klantIds[wo.klantEmail],
                werkplekId: wo.werkplek ? werkplekIds[wo.werkplek] : undefined,
                klacht: wo.klacht,
                status: wo.status,
                afspraakDatum: wo.afspraakDatum,
                tokenIdentifier: ti,
                aangemaaktOp: now,
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // ONDERHOUDSHISTORIE — voor 3 voertuigen
        // ─────────────────────────────────────────────────────────────────────
        const historieData = [
            {
                kenteken: "GH-446-V", typeWerk: "Kleine Beurt" as const,
                datumUitgevoerd: gisteren - 180 * 86400000,
                kmStand: 170000, notitie: "Olie + filter gewisseld. Remvloeistof ok.",
            },
            {
                kenteken: "GH-446-V", typeWerk: "APK" as const,
                datumUitgevoerd: gisteren - 365 * 86400000,
                kmStand: 148000, notitie: "APK goedgekeurd. Kleine corrosie op knalpot.",
            },
            {
                kenteken: "VN-123-B", typeWerk: "Grote Beurt" as const,
                datumUitgevoerd: gisteren - 90 * 86400000,
                kmStand: 290000, notitie: "Distributieriem + waterpomp vervangen.",
            },
            {
                kenteken: "SB-756-T", typeWerk: "Kleine Beurt" as const,
                datumUitgevoerd: gisteren - 120 * 86400000,
                kmStand: 211000, notitie: "Olie 5W-30, oliefilter, luchtfilter.",
            },
        ];

        for (const h of historieData) {
            await ctx.db.insert("onderhoudshistorie", {
                voertuigId: voertuigIds[h.kenteken],
                datumUitgevoerd: h.datumUitgevoerd,
                typeWerk: h.typeWerk,
                kmStandOnderhoud: h.kmStand,
                werkNotities: h.notitie,
                tokenIdentifier: ti,
                aangemaaktOp: now,
            });
        }

        return {
            seeded: true,
            klanten: klantData.length,
            voertuigen: voertuigData.length,
            werkplekken: werkplekData.length,
            werkorders: werkorderData.length,
            onderhoudshistorie: historieData.length,
        };
    },
});

// ── 3. Debug: inspect tokens (DEV ONLY) ────────────────────────────────────

import { query as convexQuery } from "./_generated/server";

export const debugTokens = convexQuery({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        const medewerkers = await ctx.db.query("medewerkers").collect();
        const voertuigen = await ctx.db.query("voertuigen").collect();
        const voertuigTokens = [...new Set(voertuigen.map((v) => v.tokenIdentifier))];

        return {
            mySubject: identity?.subject ?? null,
            myTokenIdentifier: identity?.tokenIdentifier ?? null,
            medewerkers: medewerkers.map((m) => ({
                naam: m.naam,
                domeinRol: m.domeinRol,
                userId: m.userId,
                tokenIdentifier: m.tokenIdentifier,
                actief: m.actief,
            })),
            voertuigenCount: voertuigen.length,
            voertuigenTokens: voertuigTokens,
        };
    },
});

/**
 * fixTenantTokens — DEV ONLY
 *
 * Probleem: meerdere eigenaar-records in DB, de verkeerde eigenaar wordt als
 * tenant-anchor gepakt door requireAuth. Dit repareert de data:
 *
 *   1. Zoek de eigenaar wiens tokenIdentifier overeenkomt met de voertuigen data
 *   2. Patch alle balie/monteur/stagiair records naar die tokenIdentifier
 *   3. Verwijder "ghost" eigenaar-records die geen data hebben
 */
import { mutation as convexMutation } from "./_generated/server";

export const fixTenantTokens = convexMutation({
    args: {},
    handler: async (ctx) => {
        const medewerkers = await ctx.db.query("medewerkers").collect();
        const voertuigen = await ctx.db.query("voertuigen").collect();

        if (voertuigen.length === 0) {
            return { error: "Geen voertuigen in DB — run seedGarageData eerst als eigenaar" };
        }

        // Welke tokenIdentifier hebben de voertuigen?
        const dataToken = voertuigen[0].tokenIdentifier;

        // Vind de eigenaar die DEZE tokenIdentifier heeft (de correcte anchor)
        const correcteEigenaar = medewerkers.find(
            (m) => m.domeinRol === "eigenaar" && m.tokenIdentifier === dataToken
        );

        if (!correcteEigenaar) {
            return {
                error: "Geen eigenaar gevonden wiens tokenIdentifier overeenkomt met de voertuigen",
                dataToken,
                eigenaars: medewerkers.filter((m) => m.domeinRol === "eigenaar").map((m) => ({
                    naam: m.naam, tokenIdentifier: m.tokenIdentifier
                })),
            };
        }

        const patches: string[] = [];
        const deletions: string[] = [];

        for (const m of medewerkers) {
            if (m._id === correcteEigenaar._id) continue; // correcte eigenaar overslaan

            if (m.domeinRol === "eigenaar") {
                // Ghost eigenaar-record: verwijder het
                await ctx.db.delete(m._id);
                deletions.push(`${m.naam} (${m.userId})`);
            } else if (m.tokenIdentifier !== dataToken) {
                // Balie/monteur/stagiair met verkeerde tokenIdentifier: repareer
                await ctx.db.patch(m._id, { tokenIdentifier: dataToken });
                patches.push(`${m.naam} (${m.domeinRol})`);
            }
        }

        return {
            fixed: true,
            correcteEigenaar: correcteEigenaar.naam,
            dataToken,
            gepatch: patches,
            verwijderd: deletions,
        };
    },
});
