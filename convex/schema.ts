/**
 * convex/schema.ts
 *
 * Auto Garage — volledig databaseschema (3 tabellen)
 *
 * Multi-Tenant Isolatiestrategie:
 *   Elk record draagt een `tokenIdentifier` afkomstig van
 *   `ctx.auth.getUserIdentity().tokenIdentifier`.
 *   Convex bouwt deze op als "<issuer>|<sub>", waarbij LaventeCare
 *   de tenant-UUID in de `sub` claim embeds (<tenantId>:<userId>).
 *   Dit zorgt voor structurele tenant-isolatie zonder extra RLS.
 *
 * Relaties:
 *   klanten  1 ──< N  voertuigen          (voertuigen.klantId)
 *   voertuigen 1 ──< N  onderhoudshistorie  (onderhoudshistorie.voertuigId)
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Gedeelde validators (DRY)
// ---------------------------------------------------------------------------

/** Klanttype: Particulier of Zakelijk */
const klanttype = v.union(v.literal("Particulier"), v.literal("Zakelijk"));

/** Klantstatus levenscyclus */
const klantstatus = v.union(
    v.literal("Actief"),
    v.literal("Inactief"),
    v.literal("Prospect")
);

/** Brandstoftype */
const brandstof = v.union(
    v.literal("Benzine"),
    v.literal("Diesel"),
    v.literal("Hybride"),
    v.literal("EV"),
    v.literal("LPG")
);

/** Soort uitgevoerd werk bij onderhoudsbeurt */
const typeWerk = v.union(
    v.literal("Grote Beurt"),
    v.literal("Kleine Beurt"),
    v.literal("APK"),
    v.literal("Reparatie"),
    v.literal("Bandenwisseling"),
    v.literal("Schadeherstel"),
    v.literal("Diagnostiek"),
    v.literal("Overig")
);

// ---------------------------------------------------------------------------
// Schema-definitie
// ---------------------------------------------------------------------------

export default defineSchema({
    // ──────────────────────────────────────────────────────────────────────────
    // Tabel 1: klanten
    //   Persoons- en bedrijfsgegevens. Eén rij per klant.
    // ──────────────────────────────────────────────────────────────────────────
    klanten: defineTable({
        /** Particulier of Zakelijk */
        klanttype,

        // ── Persoonsinformatie ─────────────────────────────────────────────────
        voornaam: v.string(),
        achternaam: v.string(),

        /** Alleen voor zakelijke klanten (B2B). */
        bedrijfsnaam: v.optional(v.string()),

        // ── Contactgegevens ───────────────────────────────────────────────────
        /** Straat + huisnummer */
        adres: v.string(),
        postcode: v.string(),
        woonplaats: v.string(),

        /** Internationaal formaat: +31612345678 */
        telefoonnummer: v.string(),

        /** Uniek binnen de tenant (gehandhaafd in de mutation-laag). */
        emailadres: v.string(),

        // ── AVG / Marketing ───────────────────────────────────────────────────
        /** AVG-toestemming voor acties en herinneringen. */
        accepteertMarketing: v.boolean(),

        // ── Status & lifecycle ────────────────────────────────────────────────
        status: klantstatus,

        /** Tijdstip van eerste registratie (ms since epoch). */
        klantSinds: v.number(),

        /** Vrije notitieveld — bijv. "Betaalt altijd contant". */
        klantNotities: v.optional(v.string()),

        // ── Multi-tenant isolatie ─────────────────────────────────────────────
        /**
         * OIDC tokenIdentifier: `getUserIdentity().tokenIdentifier`
         * Formaat: "<issuer>|<tenantId>:<userId>"
         */
        tokenIdentifier: v.string(),
    })
        .index("by_token_identifier", ["tokenIdentifier"])
        .index("by_email_and_token", ["emailadres", "tokenIdentifier"])
        .index("by_status_and_token", ["status", "tokenIdentifier"]),

    // ──────────────────────────────────────────────────────────────────────────
    // Tabel 2: voertuigen
    //   Technische en autogegevens. Gekoppeld aan klanten via klantId.
    // ──────────────────────────────────────────────────────────────────────────
    voertuigen: defineTable({
        /** FK → klanten._id */
        klantId: v.id("klanten"),

        // ── Identificatie ─────────────────────────────────────────────────────
        /** Kentekenplaat zonder streepjes, bijv. "AB123C". Uniek binnen tenant. */
        kenteken: v.string(),

        /** 17-cijferig VIN, cruciaal voor onderdelenbestelling. */
        vin: v.optional(v.string()),

        /**
         * Meldcode: laatste 4 tekens van het VIN.
         * Gebruikt voor APK-afmelding bij de RDW.
         */
        meldcode: v.optional(v.string()),

        // ── Voertuigspecificaties ─────────────────────────────────────────────
        merk: v.string(),

        /** Specifiek model, bijv. "Golf VII". */
        model: v.string(),

        /** Jaar van eerste toelating, bijv. 2018. */
        bouwjaar: v.number(),

        brandstof,

        /** Laatste bekende kilometerstand. */
        kilometerstand: v.optional(v.number()),

        /**
         * APK-vervaldatum als ms since epoch.
         * Gebruik `new Date(apkVervaldatum).toLocaleDateString("nl-NL")` in de UI.
         */
        apkVervaldatum: v.optional(v.number()),

        /** Vrij notitieveld — bijv. "Distributieriem vervangen bij 120k km". */
        voertuigNotities: v.optional(v.string()),

        // ── Multi-tenant isolatie ─────────────────────────────────────────────
        tokenIdentifier: v.string(),

        /** Aanmaaktijdstip (ms since epoch). */
        aangemaaktOp: v.number(),
    })
        .index("by_klant", ["klantId"])
        .index("by_token_identifier", ["tokenIdentifier"])
        .index("by_kenteken_and_token", ["kenteken", "tokenIdentifier"])
        .index("by_apk_and_token", ["apkVervaldatum", "tokenIdentifier"]),

    // ──────────────────────────────────────────────────────────────────────────
    // Tabel 3: onderhoudshistorie
    //   Logboek van alle uitgevoerde werkzaamheden per voertuig.
    //   Gekoppeld aan voertuigen via voertuigId.
    // ──────────────────────────────────────────────────────────────────────────
    onderhoudshistorie: defineTable({
        /** FK → voertuigen._id */
        voertuigId: v.id("voertuigen"),

        /** Datum van uitvoering (ms since epoch). */
        datumUitgevoerd: v.number(),

        typeWerk,

        /** Kilometerstand op het moment van uitvoering. */
        kmStandOnderhoud: v.number(),

        /**
         * URL naar opgeslagen factuur of keuringsrapport.
         * Bijv. een Convex Storage URL of externe CDN-link.
         */
        documentUrl: v.optional(v.string()),

        /** Aanvullende notities over de uitgevoerde werkzaamheden. */
        werkNotities: v.optional(v.string()),

        // ── Multi-tenant isolatie ─────────────────────────────────────────────
        tokenIdentifier: v.string(),

        /** Aanmaaktijdstip (ms since epoch). */
        aangemaaktOp: v.number(),
    })
        .index("by_voertuig", ["voertuigId"])
        .index("by_token_identifier", ["tokenIdentifier"])
        .index("by_datum_and_token", ["datumUitgevoerd", "tokenIdentifier"]),
});
