/**
 * convex/schema.ts
 *
 * Auto Garage — volledig databaseschema (4 tabellen)
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
 *
 * Split-Role strategie:
 *   medewerkers  koppelt LaventeCare userId aan een garage-specifieke domeinRol.
 *   Identity (wie mag inloggen) = LaventeCare. Domein (wat mag je) = medewerkers-tabel.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
// Enum-validators worden gecentraliseerd beheerd in validators.ts
import { vKlanttype, vKlantstatus, vBrandstof, vTypeWerk, vDomeinRol, vWerkplekType, vWerkplekStatus, vWerkorderStatus, vAfsluitingReden, vContractType, vDagKeuze, vRijbewijsCategorie } from "./validators";

// ---------------------------------------------------------------------------
// Schema-definitie
// ---------------------------------------------------------------------------

export default defineSchema({
    // ──────────────────────────────────────────────────────────────────────────
    // Tabel 0: medewerkers  (Split-Role — Domain Layer)
    //   Koppelt een LaventeCare userId aan een garage-specifieke domeinRol.
    //   Identity (wie mag inloggen) = LaventeCare.
    //   Domein (wat mag je in de app) = dit record.
    //   Profiel (wie ben je professioneel) = optionele profielvelden hieronder.
    // ──────────────────────────────────────────────────────────────────────────
    medewerkers: defineTable({
        /**
         * LaventeCare userId: de `sub` claim uit het JWT.
         * Wordt gezet door `registreerMedewerker` na een succesvolle invite.
         */
        userId: v.string(),

        /**
         * OIDC tokenIdentifier: `getUserIdentity().tokenIdentifier`
         * Formaat: "<issuer>|<tenantId>:<userId>"
         * Gebruikt voor multi-tenant isolatie bij queries.
         */
        tokenIdentifier: v.string(),

        /** Garage-specifieke functie — zie validators.ts voor hiërarchie. */
        domeinRol: vDomeinRol,

        /** Weergavenaam — vult over van LaventeCare full_name bij invite. */
        naam: v.string(),

        /**
         * Voornaam — apart opgeslagen voor aanhef, sortering en filters.
         * Optioneel voor backward-compatibiliteit met bestaande records.
         */
        voornaam: v.optional(v.string()),

        /**
         * Achternaam — apart opgeslagen voor aanhef, sortering en filters.
         * Optioneel voor backward-compatibiliteit met bestaande records.
         */
        achternaam: v.optional(v.string()),

        /**
         * Zachte deactivatie: actief=false verbergt de medewerker in de UI
         * en blokkeert domain-rol access, maar behoudt de audit trail.
         */
        actief: v.boolean(),

        /** Aanmaaktijdstip (ms since epoch). */
        aangemaaktOp: v.number(),

        // ── Persoonlijke contactgegevens (optioneel) ─────────────────────────

        /** Zakelijk of privé e-mailadres. */
        email: v.optional(v.string()),

        /** Mobiel telefoonnummer (internationaal formaat: +31612345678). */
        telefoonnummer: v.optional(v.string()),

        /** Geboortedatum (ms since epoch) — voor leeftijdsberekening. */
        geboortedatum: v.optional(v.number()),

        /** Woonadres: straat + huisnummer. */
        adres: v.optional(v.string()),
        postcode: v.optional(v.string()),
        woonplaats: v.optional(v.string()),

        /** Nationaliteit, bijv. "Nederlands". */
        nationaliteit: v.optional(v.string()),

        // ── Gevoelig (eigenaar-only) ──────────────────────────────────────────

        /**
         * BSN-nummer — uitsluitend zichtbaar voor de eigenaar.
         * Wordt in query-laag gefilterd voor andere rollen.
         * ⚠️  Sla dit alleen op als het operationeel noodzakelijk is.
         */
        bsn: v.optional(v.string()),

        // ── Noodcontact ───────────────────────────────────────────────────────

        noodContactNaam: v.optional(v.string()),
        noodContactTelefoon: v.optional(v.string()),
        noodContactRelatie: v.optional(v.string()), // bijv. "Partner", "Ouder"

        // ── Dienstverband (eigenaar-only velden: uurloon) ─────────────────────

        /** Startdatum dienstverband (ms since epoch). */
        inDienstSinds: v.optional(v.number()),

        /** Datum uitdiensttreding (ms since epoch) — optioneel. */
        uitDienstOp: v.optional(v.number()),

        /** Type contract. */
        contractType: v.optional(vContractType),

        /**
         * Bruto uurloon in euro's — uitsluitend zichtbaar voor de eigenaar.
         * Wordt in query-laag gefilterd voor andere rollen.
         */
        uurloon: v.optional(v.number()),

        /** Aantal contracturen per week (bijv. 40). */
        contractUrenPerWeek: v.optional(v.number()),

        // ── Profiel & bio ─────────────────────────────────────────────────────

        /**
         * Korte omschrijving of motivatietekst, max. 500 tekens.
         * Zichtbaar voor alle collega's (eigenaar + balie).
         */
        bio: v.optional(v.string()),

        // ── Rijbewijs ─────────────────────────────────────────────────────────

        /**
         * rijbewijsCategorien die de medewerker bezit.
         * Bijv. ["B", "BE", "C"] — relevant voor transport-taken.
         */
        rijbewijsCategorien: v.optional(v.array(vRijbewijsCategorie)),

        // ── Certificaten ──────────────────────────────────────────────────────

        /**
         * Vakdiploma's en certificaten.
         * Elk item: { naam, uitgever, behaaldOp (ms), verlooptOp? (ms) }
         */
        certificaten: v.optional(v.array(v.object({
            naam: v.string(),          // bijv. "Airco-certificaat F-gassen"
            uitgever: v.optional(v.string()), // bijv. "STEK"
            behaaldOp: v.number(),     // ms since epoch
            verlooptOp: v.optional(v.number()), // ms since epoch
        }))),

        // ── Werkervaring (CV) ─────────────────────────────────────────────────

        /**
         * Werkgeschiedenis vóór de huidige functie.
         * Chronologisch — nieuwste bovenaan weergeven via sort in UI.
         */
        werkervaring: v.optional(v.array(v.object({
            bedrijf: v.string(),
            functie: v.string(),
            vanafMs: v.number(),           // startdatum (ms since epoch)
            totMs: v.optional(v.number()), // einddatum (null = huidig)
            beschrijving: v.optional(v.string()),
        }))),

        // ── Opleiding ─────────────────────────────────────────────────────────

        /**
         * Gevolgde opleidingen en studies.
         */
        opleiding: v.optional(v.array(v.object({
            instelling: v.string(),    // bijv. "ROC Midden Nederland"
            richting: v.string(),      // bijv. "Autotechniek MBO niveau 4"
            niveau: v.optional(v.string()), // bijv. "MBO", "HBO", "WO"
            behaaldOp: v.optional(v.number()), // ms since epoch
            diploma: v.optional(v.boolean()), // true = diploma behaald
        }))),

        // ── Beschikbaarheid ───────────────────────────────────────────────────

        /**
         * Werkdagen waarop de medewerker beschikbaar is.
         * Bijv. ["MA", "DI", "WO", "DO", "VR"]
         */
        beschikbareDagen: v.optional(v.array(vDagKeuze)),
    })
        // Snelle lookup per gebruiker (identity bridge in useRol hook)
        .index("by_userId", ["userId"])
        // Tenant-geïsoleerde lijst van alle medewerkers
        .index("by_token_identifier", ["tokenIdentifier"]),

    // ──────────────────────────────────────────────────────────────────────────
    // Tabel 1: klanten
    //   Persoons- en bedrijfsgegevens. Eén rij per klant.
    // ──────────────────────────────────────────────────────────────────────────
    klanten: defineTable({
        /** Particulier of Zakelijk */
        klanttype: vKlanttype,

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
        status: vKlantstatus,

        /** Tijdstip van eerste registratie (ms since epoch). */
        klantSinds: v.number(),

        /** Vrije notitieveld — bijv. "Betaalt altijd contant". */
        klantNotities: v.optional(v.string()),

        // ── Medewerker-profiel (intern) ───────────────────────────────────────
        /**
         * Wanneer true behandelt het systeem dit klant-record als een intern
         * medewerker-profiel. Verborgen in klantenoverzicht; alleen zichtbaar
         * via medewerker-portaal en voertuig-koppeling.
         */
        isInternMedewerker: v.optional(v.boolean()),

        /**
         * LaventeCare userId — koppelt dit record aan een medewerker.
         * Formaat: zelfde userId als medewerkers.userId.
         * Gebruikt voor IDOR-check: medewerker mag alleen eigen record lezen.
         */
        medewerkerId: v.optional(v.string()),

        // ── Multi-tenant isolatie ─────────────────────────────────────────────
        /**
         * OIDC tokenIdentifier: `getUserIdentity().tokenIdentifier`
         * Formaat: "<issuer>|<tenantId>:<userId>"
         */
        tokenIdentifier: v.string(),
    })
        .index("by_token_identifier", ["tokenIdentifier"])
        // Index: eerst tenant-filter, dan email-lookup — zelfde redenering als by_apk_and_token.
        .index("by_email_and_token", ["tokenIdentifier", "emailadres"])
        // Index: eerst tenant-filter, dan status-filter.
        .index("by_status_and_token", ["tokenIdentifier", "status"])
        // Index: medewerker-profiel snel ophalen via userId
        .index("by_medewerker_and_token", ["tokenIdentifier", "medewerkerId"]),

    // ──────────────────────────────────────────────────────────────────────────
    // Tabel 2: voertuigen
    //   Technische en autogegevens. Gekoppeld aan klanten via klantId.
    // ──────────────────────────────────────────────────────────────────────────
    voertuigen: defineTable({
        /** FK → klanten._id — optioneel: voertuig kan ongebonden zijn (later te koppelen). */
        klantId: v.optional(v.id("klanten")),

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

        brandstof: vBrandstof,

        // ── RDW-verrijking (opgeslagen bij aanmaken via scan of handmatig) ────
        /** Soort voertuig, bijv. "Personenauto", "Bedrijfsauto", "Motor". */
        voertuigsoort: v.optional(v.string()),

        /** Eerste geregistreerde kleur, bijv. "WIT". */
        kleur: v.optional(v.string()),

        /** Tweede kleur (tweekleurige voertuigen), bijv. "ZWART". */
        tweedeKleur: v.optional(v.string()),

        /** Rijklaar gewicht in kg. */
        massaRijklaar: v.optional(v.number()),

        /** Maximaal trekgewicht ongeremd in kg. */
        maxTrekgewichtOngeremd: v.optional(v.number()),

        /** Maximaal trekgewicht geremd in kg. */
        maxTrekgewichtGeremd: v.optional(v.number()),

        /** Aantal zitplaatsen inclusief bestuurder. */
        aantalZitplaatsen: v.optional(v.number()),

        /** Eerste tenaamstelling in NL (YYYY-MM-DD). */
        eersteTenaamstelling: v.optional(v.string()),

        /** CO₂-uitstoot in g/km gecombineerd. */
        co2Uitstoot: v.optional(v.number()),

        /**
         * Inrichting van het voertuig, bijv. "hatchback", "sedan", "stationwagon".
         * Afkomstig uit RDW OPEN API dataset.
         */
        inrichting: v.optional(v.string()),

        /** Cilinderinhoud in cc, bijv. 1598 voor een 1.6-motor. */
        cilinderinhoud: v.optional(v.number()),

        /** Vermogen van de verbrandingsmotor in kW, bijv. 85 kW = ~116 pk. */
        vermogen: v.optional(v.number()),

        /** Emissieklasse, bijv. "Euro 6", "Euro 5". */
        emissieklasse: v.optional(v.string()),

        /**
         * WOK-status: Wacht Op Keuren.
         * true = voertuig mag niet rijden totdat het gekeurd is.
         * Garage-kritisch signaal — altijd prominent tonen.
         */
        wok: v.optional(v.boolean()),

        /**
         * Openstaande terugroepactie (recall).
         * true = er is een openstaande recall voor dit voertuig.
         */
        heeftRecall: v.optional(v.boolean()),

        /**
         * NAP-status (Nationale Auto Pas).
         * "Logisch" = kilometerstand klopt, "Onlogisch" = fraude-indicator.
         */
        nap: v.optional(v.string()),

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
        // Index: eerst tenant-filter, dan kenteken-lookup (consistente volgorde: token eerst)
        .index("by_token_and_kenteken", ["tokenIdentifier", "kenteken"])
        // Index: eerst tenant-filter (tokenIdentifier), dan range-scan op APK-datum.
        .index("by_apk_and_token", ["tokenIdentifier", "apkVervaldatum"])
        // L-3 FIX: sort op aanmaaktijdstip voor deterministische volgorde in list() queries.
        // .order("desc") op by_token_identifier sorteert op interne ID, niet op aangemaaktOp.
        .index("by_aangemaakt_and_token", ["tokenIdentifier", "aangemaaktOp"]),

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

        typeWerk: vTypeWerk,

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
        // Index: eerst tenant-filter, dan datum-range — zelfde redenering als by_apk_and_token.
        .index("by_datum_and_token", ["tokenIdentifier", "datumUitgevoerd"]),

    // ──────────────────────────────────────────────────────────────────────────
    // Tabel 4: werkplekken  (Werkplaatsbord — Kolommen)
    //   Fysieke locaties in de garage. Eén rij = één kolom op het bord.
    //   Voorbeelden: "Brug 1", "Brug 2", "Uitlijnbrug".
    //   De impliciete "Buiten/Wachtend" kolom heeft géén werkplek-record;
    //   werkorders zonder werkplekId worden daar weergegeven.
    // ──────────────────────────────────────────────────────────────────────────
    werkplekken: defineTable({
        /** Weergavenaam: "Brug 1", "Uitlijnbrug", etc. */
        naam: v.string(),

        /** Fysiek type — bepaalt icoon en kleur in de UI. */
        type: vWerkplekType,

        /**
         * Kolomvolgorde op het bord (links → rechts, oplopend).
         * "Buiten" = impliciete kolom 0 (geen record nodig).
         * "Klaar voor ophalen" = impliciete laatste kolom (status-filter).
         */
        volgorde: v.number(),

        /**
         * Operationele status van de werkplek.
         * v.optional() voor backward-compatibiliteit: bestaande records
         * zonder dit veld werken door als "Beschikbaar".
         *
         * Beschikbaar  → normaal in gebruik (default)
         * In onderhoud → tijdelijk niet bruikbaar (service, defect)
         * Buiten gebruik → langdurig of permanent niet actief
         */
        status: v.optional(vWerkplekStatus),

        /** Multi-tenant isolatie. */
        tokenIdentifier: v.string(),
    })
        .index("by_token_identifier", ["tokenIdentifier"])
        // Sorteren op volgorde, gefilterd per tenant.
        .index("by_token_and_volgorde", ["tokenIdentifier", "volgorde"]),

    // ──────────────────────────────────────────────────────────────────────────
    // Tabel 5: werkorders  (Werkplaatsbord — Kaartjes)
    //   Eén actieve klus per auto per dag. Dit is het hart van het bord.
    //   Relaties: voertuigen ──< werkorders >── werkplekken
    // ──────────────────────────────────────────────────────────────────────────
    werkorders: defineTable({
        /** FK → voertuigen._id (de auto die binnen is). */
        voertuigId: v.id("voertuigen"),

        /** FK → klanten._id (snelle access voor telefoonnummer bij bellen). Optioneel voor voertuigen zonder klant. */
        klantId: v.optional(v.id("klanten")),

        /**
         * FK → werkplekken._id (waar staat de auto nú?).
         * null = auto staat nog "Buiten" / wacht op een plek.
         */
        werkplekId: v.optional(v.id("werkplekken")),

        /**
         * FK → medewerkers._id (wie is ermee bezig?).
         * null = nog niet toegewezen.
         */
        monteursId: v.optional(v.id("medewerkers")),

        /**
         * De klacht / taakomschrijving.
         * Dit is het meest gelezen veld op het kaartje: "Rammelt linksvoor".
         */
        klacht: v.string(),

        /** Huidige lifecycle-status — zie validators.ts voor transitie-diagram. */
        status: vWerkorderStatus,

        /** Datum van de afspraak (ms since epoch). */
        afspraakDatum: v.number(),

        /**
         * Totale kosten van de werkorder (euro).
         * Wordt ingevuld bij afsluiting via WerkorderAfsluitenModal.
         * Optioneel voor backward-compatibiliteit met bestaande records.
         */
        totaalKosten: v.optional(v.number()),

        /**
         * Of `totaalKosten` inclusief BTW is.
         * undefined = niet van toepassing (geen kosten ingevuld).
         */
        btwInbegrepen: v.optional(v.boolean()),

        /**
         * Slotnotitie van de balie bij afsluiting.
         * Wordt ook gelogd in werkorderLogs maar hier persistent opgeslagen
         * zodat het zichtbaar blijft na archivering.
         */
        slotNotitie: v.optional(v.string()),

        /**
         * Timestamp: klant heeft auto daadwerkelijk opgehaald (ms since epoch).
         * null = nog niet opgehaald. Gevuld via `bevestigOphalen` mutatie (balie).
         * Maakt het mogelijk om "Afgerond maar niet opgehaald" te filteren.
         */
        opgehaaldOp: v.optional(v.number()),

        /**
         * Reden van annulering — verplicht bij `annuleerWerkorder`.
         * Opgeslagen voor rapportage (no-show rate, klant-annuleringen etc.).
         */
        afsluitingReden: v.optional(vAfsluitingReden),

        /**
         * Gearchiveerd — verbergt order van het actieve bord.
         * Geannuleerde orders: automatisch true via `annuleerWerkorder`.
         * Afgeronde orders: handmatig door eigenaar of balie.
         * undefined / false = zichtbaar, true = gearchiveerd.
         */
        gearchiveerd: v.optional(v.boolean()),

        /** Multi-tenant isolatie. */
        tokenIdentifier: v.string(),

        /** Aanmaaktijdstip (ms since epoch). */
        aangemaaktOp: v.number(),
    })
        .index("by_token_identifier", ["tokenIdentifier"])
        // Ophalen van alle orders per werkplek (= één kolom op het bord).
        .index("by_werkplek", ["werkplekId"])
        // 🔴 FIX: ontbrekende index — nodig voor cascade-delete bij verwijder voertuig.
        .index("by_voertuig", ["voertuigId"])
        // Tenant-filter + status-filter (bijv. alle "Klaar" orders).
        .index("by_status_and_token", ["tokenIdentifier", "status"])
        // Tenant-filter + datum-range (orders van vandaag).
        .index("by_datum_and_token", ["tokenIdentifier", "afspraakDatum"])
        // Index: afgeronde orders die nog niet opgehaald zijn (balie-widget).
        // Queries: lijstAfgerondNietOpgehaald — effectief: status=Afgerond, opgehaaldOp undefined.
        .index("by_opgehaald_and_token", ["tokenIdentifier", "opgehaaldOp"]),

    // ──────────────────────────────────────────────────────────────────────────
    // Tabel 6: werkorderLogs  (Audit Trail — Fase 2)
    //   Chronologisch logboek per werkorder.
    //   Elke verplaatsing of statuswijziging schrijft een logregel.
    //   Monteurs kunnen ook vrije notities toevoegen ("Onderdeel besteld bij...").
    // ──────────────────────────────────────────────────────────────────────────
    werkorderLogs: defineTable({
        /** FK → werkorders._id */
        werkorderId: v.id("werkorders"),

        /**
         * FK → medewerkers._id (wie heeft deze actie uitgevoerd?).
         * Altijd gevuld — elke actie is traceerbaar.
         */
        monteursId: v.id("medewerkers"),

        /**
         * Omschrijving van de actie, auto-gegenereerd of handmatig.
         * Bijv. "Verplaatst naar Brug 2" of "Status gewijzigd naar Wacht op onderdelen".
         */
        actie: v.string(),

        /**
         * Optionele vrije notitie van de monteur.
         * Bijv. "Draagarmrubber stuk — onderdeel besteld bij Van der Berg".
         */
        notitie: v.optional(v.string()),

        /** Tijdstip van de actie (ms since epoch). */
        tijdstip: v.number(),

        /** Multi-tenant isolatie. */
        tokenIdentifier: v.string(),
    })
        // Alle logs per werkorder ophalen (voor het logboek-panel).
        .index("by_werkorder", ["werkorderId"])
        // Tenant-brede audit-query.
        .index("by_token_identifier", ["tokenIdentifier"])
        // L-1 FIX: datum-index voor tenant-brede audit queries (bijv. "alle acties van vandaag").
        .index("by_datum_and_token", ["tokenIdentifier", "tijdstip"]),

    // ──────────────────────────────────────────────────────────────────────────
    // Tabel 7: werkorderBevindingen  (Reparatie-Rapport — Fase 3)
    //
    //   Gestructureerde bevindingen per werkorder, gescheiden van de audit trail.
    //   Bedoeld voor de monteur om tijdens het werk bij te houden:
    //     - Technische bevindingen (observaties)
    //     - Gebruikte / bestelde onderdelen
    //     - Tijdregistratie per sessie
    //     - Taken / checklist-items
    //
    //   Rol-gating:
    //     Lezen  → monteur+
    //     Schrijven → monteur+
    //     Verwijderen → eigenaar only
    // ──────────────────────────────────────────────────────────────────────────
    werkorderBevindingen: defineTable({
        /** FK → werkorders._id */
        werkorderId: v.id("werkorders"),

        /** FK → medewerkers._id (wie heeft dit ingevuld?) */
        monteursId: v.id("medewerkers"),

        /**
         * Type bevinding — bepaalt welke extra velden aanwezig zijn:
         *   Bevinding  → alleen omschrijving
         *   Onderdeel  → omschrijving + onderdeelInfo
         *   Uren       → omschrijving + aantalUren
         *   Taak       → omschrijving + gedaan
         */
        type: v.union(
            v.literal("Bevinding"),  // Technische observatie ("Draagarm versleten")
            v.literal("Onderdeel"),  // Gebruikt of besteld onderdeel
            v.literal("Uren"),       // Tijdregistratie (uren)
            v.literal("Taak"),       // Checklist-item (wel/niet uitgevoerd)
        ),

        /** Omschrijving — verplicht voor alle types. */
        omschrijving: v.string(),

        /** Tijdstip van aanmaak (ms since epoch). */
        tijdstip: v.number(),

        // ── Type-specifieke velden ────────────────────────────────────────────

        /**
         * Onderdeel-administratie — alleen aanwezig bij type "Onderdeel".
         * Maakt het mogelijk om de totaalkosten automatisch op te tellen.
         */
        onderdeel: v.optional(v.object({
            artikelnummer: v.optional(v.string()),  // bijv. "VW 1K0 407 151 J"
            leverancier: v.optional(v.string()),  // bijv. "Van Mossel Parts"
            prijs: v.optional(v.number()),  // inkoopprijs per stuk (euro)
            aantal: v.number(),              // minimaal 1
        })),

        /**
         * Tijdregistratie — alleen aanwezig bij type "Uren".
         * Decimale uren: 1.5 = 1 uur en 30 minuten.
         */
        aantalUren: v.optional(v.number()),

        /**
         * Werkdatum — voor welke dag zijn deze uren?
         * ms since epoch. Default = tijdstip (dag van invoer) als niet opgegeven.
         * Optioneel voor backward-compatibiliteit met bestaande records.
         */
        werkDatum: v.optional(v.number()),

        /**
         * Taakstatus — alleen aanwezig bij type "Taak".
         * true = uitgevoerd, false = niet gedaan (bijv. vanwege onderdeel).
         * undefined bij aanmaak = nog niet beoordeeld (wordt later gezet).
         */
        gedaan: v.optional(v.boolean()),

        /** Multi-tenant isolatie. */
        tokenIdentifier: v.string(),
    })
        // Alle bevindingen per werkorder (voor het rapport-panel).
        .index("by_werkorder", ["werkorderId"])
        // Tenant-brede rapportage-query (bijv. onderdelen van vandaag).
        .index("by_token_identifier", ["tokenIdentifier"])
        // Type-filter per werkorder (bijv. alleen onderdelen ophalen).
        .index("by_werkorder_and_type", ["werkorderId", "type"]),
});
