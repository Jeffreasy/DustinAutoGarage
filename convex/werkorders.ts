/**
 * convex/werkorders.ts
 *
 * Queries en mutations voor werkorders (Werkplaatsbord — Kaartjes).
 *
 * Een werkorder is het hart van het Werkplaatsbord: één actieve klus per auto.
 * De data flow voor de monteur:
 *   1. Balie maakt werkorder aan (status: Wachtend, werkplekId: null = "Buiten")
 *   2. Monteur verplaatst naar brug  → verplaatsNaarWerkplek()
 *   3. Monteur werkt → update status → updateStatus()
 *   4. Balie sluit af → sluitWerkorderAf() → kopieert naar onderhoudshistorie
 *
 * Elke schrijf-actie logt automatisch een rij in werkorderLogs (audit trail).
 *
 * Rol-gating:
 *   Lezen             → monteur+
 *   Aanmaken          → balie+
 *   Verplaatsen       → monteur+
 *   Status wijzigen   → monteur+
 *   Afsluiten         → balie+
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { vWerkorderStatus, vTypeWerk, vAfsluitingReden } from "./validators";
import { requireAuth, requireDomainRole } from "./helpers";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * lijstWerkordersVoorBord — alle actieve werkorders van de tenant.
 *
 * Geeft ALLE orders terug (niet gefilterd op datum),
 * zodat het bord geen actieve orders mist als een auto een nacht blijft.
 * "Klaar" orders worden in de UI in de aparte eindkolom gegroepeerd.
 */
export const lijstWerkordersVoorBord = query({
    args: {},
    handler: async (ctx) => {
        // B-09 FIX: monteur+ vereist (was requireAuth — stagiairs kwamen er ook doorheen)
        const profiel = await requireDomainRole(ctx, "monteur");
        const tokenIdentifier = profiel.tokenIdentifier;

        const orders = await ctx.db
            .query("werkorders")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
            )
            .order("asc")
            .collect();

        // M-5 FIX: filter gearchiveerde orders server-side — voorkomen dat verouderde
        // kaartjes op het bord verschijnen als de UI-filter ooit mist.
        const actief = orders.filter((o) => !o.gearchiveerd);

        // Verrijk elke order met voertuig- en klantdata voor de kaartjes
        const verrijkt = await Promise.all(
            actief.map(async (order) => {
                const voertuig = await ctx.db.get(order.voertuigId);
                const klant = await ctx.db.get(order.klantId);
                const monteur = order.monteursId
                    ? await ctx.db.get(order.monteursId)
                    : null;

                return {
                    ...order,
                    voertuig: voertuig
                        ? { kenteken: voertuig.kenteken, merk: voertuig.merk, model: voertuig.model }
                        : null,
                    klant: klant
                        ? { voornaam: klant.voornaam, achternaam: klant.achternaam, telefoonnummer: klant.telefoonnummer }
                        : null,
                    monteur: monteur ? { naam: monteur.naam } : null,
                };
            })
        );

        return verrijkt;
    },
});

/**
 * lijstWerkordersVoorWerkplek — werkorders gefiltered op één werkplek.
 * Handig voor een toekomstige server-side gefilterde view per brug.
 */
export const lijstWerkordersVoorWerkplek = query({
    args: { werkplekId: v.optional(v.id("werkplekken")) },
    handler: async (ctx, args) => {
        // 🔴 FIX #4: tenantIdentifier filter toevoegen — anders kan elke auth-user
        // werkorders van andere tenants opvragen met een geraden werkplekId.
        const tokenIdentifier = await requireAuth(ctx);

        return ctx.db
            .query("werkorders")
            .withIndex("by_werkplek", (q) => q.eq("werkplekId", args.werkplekId))
            .filter((q) => q.eq(q.field("tokenIdentifier"), tokenIdentifier))
            .collect();
    },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * maakWerkorderAan — receptionist/balie maakt een nieuwe werkorder aan.
 *
 * De auto start altijd in de "Buiten/Wachtend" kolom (werkplekId: undefined).
 * Vereist minimaal de rol "balie".
 */
export const maakWerkorderAan = mutation({
    args: {
        voertuigId: v.id("voertuigen"),
        klantId: v.id("klanten"),
        klacht: v.string(),
        afspraakDatum: v.number(),
        monteursId: v.optional(v.id("medewerkers")),
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "balie");

        // 🔴 FIX #3: Valideer dat voertuig + klant tot dezelfde tenant behoren.
        // Zonder deze check kan een balie-medewerker IDs van een andere tenant invoeren.
        const voertuig = await ctx.db.get(args.voertuigId);
        if (!voertuig || voertuig.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Voertuig behoort niet tot deze garage.");
        }

        const klant = await ctx.db.get(args.klantId);
        if (!klant || klant.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Klant behoort niet tot deze garage.");
        }

        // Controleer consistentie: klant moet eigenaar zijn van het voertuig
        if (voertuig.klantId !== args.klantId) {
            throw new Error("CONFLICT: Het opgegeven voertuig behoort niet tot de opgegeven klant.");
        }

        // B-10 FIX: Valideer dat de opgegeven monteur tot dezelfde tenant behoort.
        if (args.monteursId) {
            const monteur = await ctx.db.get(args.monteursId);
            if (!monteur || monteur.tokenIdentifier !== profiel.tokenIdentifier) {
                throw new Error("FORBIDDEN: De opgegeven monteur behoort niet tot deze garage.");
            }
        }

        // Guard: klacht mag niet leeg zijn — werkorder zonder omschrijving is nutteloos.
        if (!args.klacht.trim()) {
            throw new Error("INVALID: Klacht/taakomschrijving mag niet leeg zijn.");
        }

        const werkorderId = await ctx.db.insert("werkorders", {
            voertuigId: args.voertuigId,
            klantId: args.klantId,
            klacht: args.klacht.trim(),
            afspraakDatum: args.afspraakDatum,
            monteursId: args.monteursId,
            werkplekId: undefined,
            // Nieuwe werkorders starten als Gepland — ze zijn ingepland maar nog niet aanwezig
            status: "Gepland",
            tokenIdentifier: profiel.tokenIdentifier,
            aangemaaktOp: Date.now(),
        });

        // Log de aanmaak
        await ctx.db.insert("werkorderLogs", {
            werkorderId,
            monteursId: profiel._id,
            actie: `Werkorder aangemaakt — ${voertuig.kenteken} (${klant.voornaam} ${klant.achternaam})`,
            tijdstip: Date.now(),
            tokenIdentifier: profiel.tokenIdentifier,
        });

        return werkorderId;
    },
});

/**
 * verplaatsNaarWerkplek — de "grote knop" actie van de monteur.
 *
 * Verplaatst een kaartje naar een andere kolom (fysieke locatie).
 * Updatet werkplekId + status tegelijk.
 * Logt de verplaatsing automatisch.
 *
 * Vereist minimaal de rol "monteur".
 */
export const verplaatsNaarWerkplek = mutation({
    args: {
        werkorderId: v.id("werkorders"),
        werkplekId: v.optional(v.id("werkplekken")),
        nieuweStatus: vWerkorderStatus,
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "monteur");

        const order = await ctx.db.get(args.werkorderId);
        if (!order || order.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Werkorder niet gevonden of geen toegang.");
        }

        // Bewaar eindstatussen — Afgerond en Geannuleerd mogen niet meer worden verplaatst
        if (order.status === "Afgerond" || order.status === "Geannuleerd") {
            throw new Error(`CONFLICT: Werkorder is al definitief gesloten (${order.status}) en kan niet worden verplaatst.`);
        }

        // Bepaal een leesbare actie-omschrijving voor het logboek
        let actieLabel = "Status gewijzigd";
        if (args.werkplekId !== order.werkplekId) {
            if (args.werkplekId) {
                const werkplek = await ctx.db.get(args.werkplekId);
                actieLabel = werkplek
                    ? `Verplaatst naar ${werkplek.naam}`
                    : "Verplaatst";
            } else {
                actieLabel = "Terug naar Wachtend (Buiten)";
            }
        } else if (args.nieuweStatus !== order.status) {
            actieLabel = `Status gewijzigd naar ${args.nieuweStatus}`;
        }

        await ctx.db.patch(args.werkorderId, {
            werkplekId: args.werkplekId,
            status: args.nieuweStatus,
        });

        await ctx.db.insert("werkorderLogs", {
            werkorderId: args.werkorderId,
            monteursId: profiel._id,
            actie: actieLabel,
            tijdstip: Date.now(),
            tokenIdentifier: profiel.tokenIdentifier,
        });

        return { succes: true };
    },
});

/**
 * updateStatus — wijzigt alleen de status van een werkorder.
 * Handige shortcut voor "Wacht op onderdelen" zonder verplaatsen.
 *
 * Vereist minimaal de rol "monteur".
 */
export const updateStatus = mutation({
    args: {
        werkorderId: v.id("werkorders"),
        nieuweStatus: vWerkorderStatus,
        notitie: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "monteur");

        const order = await ctx.db.get(args.werkorderId);
        if (!order || order.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Werkorder niet gevonden of geen toegang.");
        }

        await ctx.db.patch(args.werkorderId, { status: args.nieuweStatus });

        await ctx.db.insert("werkorderLogs", {
            werkorderId: args.werkorderId,
            monteursId: profiel._id,
            actie: `Status gewijzigd naar ${args.nieuweStatus}`,
            notitie: args.notitie,
            tijdstip: Date.now(),
            tokenIdentifier: profiel.tokenIdentifier,
        });

        return { succes: true };
    },
});

/**
 * wijsMonteurtoe — koppelt of wijzigt de toegewezen monteur.
 * Vereist minimaal de rol "balie".
 */
export const wijsMonteurtoe = mutation({
    args: {
        werkorderId: v.id("werkorders"),
        monteursId: v.optional(v.id("medewerkers")),
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "balie");

        const order = await ctx.db.get(args.werkorderId);
        if (!order || order.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Werkorder niet gevonden of geen toegang.");
        }

        // B-10 FIX: Valideer dat de opgegeven monteur tot dezelfde tenant behoort.
        if (args.monteursId) {
            const monteur = await ctx.db.get(args.monteursId);
            if (!monteur || monteur.tokenIdentifier !== profiel.tokenIdentifier) {
                throw new Error("FORBIDDEN: De opgegeven monteur behoort niet tot deze garage.");
            }
        }

        await ctx.db.patch(args.werkorderId, { monteursId: args.monteursId });

        const actieLabel = args.monteursId
            ? `Monteur toegewezen`
            : "Monteur ontkoppeld";

        await ctx.db.insert("werkorderLogs", {
            werkorderId: args.werkorderId,
            monteursId: profiel._id,
            actie: actieLabel,
            tijdstip: Date.now(),
            tokenIdentifier: profiel.tokenIdentifier,
        });

        return { succes: true };
    },
});

/**
 * sluitWerkorderAf — markeert een werkorder als definitief afgerond.
 *
 * Zet status op "Afgerond" en kopieert de klus naar `onderhoudshistorie`
 * zodat de voertuig-historiek compleet blijft. Slaat slotnotitie en
 * btwInbegrepen-indicator op het record zelf op voor persistentie.
 *
 * Lifecycle na afsluiting:
 *   Afgerond → bevestigOphalen() → opgehaaldOp gevuld
 *   Afgerond → archiveerWerkorder() → gearchiveerd = true
 *
 * Vereist minimaal de rol "balie".
 */
export const sluitWerkorderAf = mutation({
    args: {
        werkorderId: v.id("werkorders"),
        kmStandOnderhoud: v.number(),
        typeWerk: vTypeWerk,
        slotNotitie: v.optional(v.string()),
        totaalKosten: v.optional(v.number()),
        btwInbegrepen: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "balie");

        const order = await ctx.db.get(args.werkorderId);
        if (!order || order.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Werkorder niet gevonden of geen toegang.");
        }

        // Guard: werkorder mag niet al definitief gesloten zijn
        if (order.status === "Afgerond" || order.status === "Geannuleerd") {
            throw new Error(`CONFLICT: Werkorder is al definitief gesloten (${order.status}).`);
        }

        // M-3 FIX: valideer kmStandOnderhoud — consistent met updateKilometerstand
        if (args.kmStandOnderhoud <= 0) {
            throw new Error("INVALID: Kilometerstand moet groter dan 0 zijn.");
        }
        const voertuigCheck = await ctx.db.get(order.voertuigId);
        if (
            voertuigCheck?.kilometerstand !== undefined &&
            args.kmStandOnderhoud < voertuigCheck.kilometerstand * 0.8
        ) {
            throw new Error(
                `INVALID: Kilometerstand (${args.kmStandOnderhoud.toLocaleString("nl-NL")}) ` +
                `is meer dan 20% lager dan de huidige stand ` +
                `(${voertuigCheck.kilometerstand.toLocaleString("nl-NL")}). Controleer de invoer.`
            );
        }

        // Status naar Afgerond — werkzaamheden voltooid, auto wacht op ophalen
        await ctx.db.patch(args.werkorderId, {
            status: "Afgerond",
            totaalKosten: args.totaalKosten,
            btwInbegrepen: args.btwInbegrepen,
            slotNotitie: args.slotNotitie?.trim() || undefined,
        });

        // Kopieer naar onderhoudshistorie voor langetermijn-voertuighistoriek.
        // datumUitgevoerd = afsluittijdstip (Date.now()), niet de afspraakdatum.
        await ctx.db.insert("onderhoudshistorie", {
            voertuigId: order.voertuigId,
            datumUitgevoerd: Date.now(),
            typeWerk: args.typeWerk,
            kmStandOnderhoud: args.kmStandOnderhoud,
            werkNotities: args.slotNotitie ?? order.klacht,
            tokenIdentifier: profiel.tokenIdentifier,
            aangemaaktOp: Date.now(),
        });

        // 🟠 FIX #6: Update de kilometerstand op het voertuig zelf.
        // Alleen updaten als de nieuwe stand hoger is dan de huidige (nooit terugzetten).
        const voertuig = await ctx.db.get(order.voertuigId);
        if (voertuig) {
            const huidigeKm = voertuig.kilometerstand ?? 0;
            if (args.kmStandOnderhoud > huidigeKm) {
                await ctx.db.patch(order.voertuigId, {
                    kilometerstand: args.kmStandOnderhoud,
                });
            }
        }

        // Definitief log-entry
        const kostenLabel = args.totaalKosten
            ? ` (€ ${args.totaalKosten.toFixed(2)}${args.btwInbegrepen ? " incl. BTW" : " excl. BTW"})`
            : "";
        await ctx.db.insert("werkorderLogs", {
            werkorderId: args.werkorderId,
            monteursId: profiel._id,
            actie: `Werkorder afgesloten — Afgerond${kostenLabel}`,
            notitie: args.slotNotitie,
            tijdstip: Date.now(),
            tokenIdentifier: profiel.tokenIdentifier,
        });

        return { succes: true };
    },
});

// ---------------------------------------------------------------------------
// Dedicated annuleer-mutatie (vervangt raw updateStatus naar Geannuleerd)
// ---------------------------------------------------------------------------

/**
 * annuleerWerkorder — annuleert een werkorder met een verplichte reden.
 *
 * Waarom een dedicated mutatie en niet `updateStatus`?
 *   - Reden is VERPLICHT — zonder reden geen annulering (rapportage-integriteit).
 *   - Auto-archiveert direct: `gearchiveerd: true` — order verdwijnt van bord.
 *   - Logt met reden voor the audit trail.
 *
 * Vereist minimaal de rol "balie".
 */
export const annuleerWerkorder = mutation({
    args: {
        werkorderId: v.id("werkorders"),
        afsluitingReden: vAfsluitingReden,
        notitie: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "balie");

        const order = await ctx.db.get(args.werkorderId);
        if (!order || order.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Werkorder niet gevonden of geen toegang.");
        }

        // Guard: al definitief gesloten orders mogen niet opnieuw worden geannuleerd
        if (order.status === "Afgerond" || order.status === "Geannuleerd") {
            throw new Error(`CONFLICT: Werkorder is al definitief gesloten (${order.status}).`);
        }

        // Status → Geannuleerd + auto-archiveren in één atomaire schrijfoperatie
        await ctx.db.patch(args.werkorderId, {
            status: "Geannuleerd",
            afsluitingReden: args.afsluitingReden,
            gearchiveerd: true,
        });

        const logLabel = args.notitie
            ? `Geannuleerd (${args.afsluitingReden}) — ${args.notitie}`
            : `Geannuleerd (${args.afsluitingReden})`;

        await ctx.db.insert("werkorderLogs", {
            werkorderId: args.werkorderId,
            monteursId: profiel._id,
            actie: logLabel,
            notitie: args.notitie,
            tijdstip: Date.now(),
            tokenIdentifier: profiel.tokenIdentifier,
        });

        return { succes: true };
    },
});

// ---------------------------------------------------------------------------
// Ophaalbevestiging (balie)
// ---------------------------------------------------------------------------

/**
 * bevestigOphalen — registreert dat de klant de auto heeft opgehaald.
 *
 * Vult `opgehaaldOp` met het huidige tijdstip. Werkorder-status blijft
 * "Afgerond" — dit is een sub-stap in de afsluiting, geen statuswijziging.
 * Na ophaalbevestiging kan de eigenaar de werkorder archiveren.
 *
 * Vereist minimaal de rol "balie".
 */
export const bevestigOphalen = mutation({
    args: {
        werkorderId: v.id("werkorders"),
        notitie: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "balie");

        const order = await ctx.db.get(args.werkorderId);
        if (!order || order.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Werkorder niet gevonden of geen toegang.");
        }

        // Guard: alleen Afgeronde orders kunnen als opgehaald worden bevestigd
        if (order.status !== "Afgerond") {
            throw new Error(`CONFLICT: Ophaalbevestiging is alleen mogelijk voor Afgeronde orders (huidige status: ${order.status}).`);
        }

        // Guard: voorkom dubbele bevestiging
        if (order.opgehaaldOp !== undefined) {
            throw new Error("CONFLICT: Auto is al bevestigd als opgehaald.");
        }

        const nu = Date.now();
        await ctx.db.patch(args.werkorderId, { opgehaaldOp: nu });

        await ctx.db.insert("werkorderLogs", {
            werkorderId: args.werkorderId,
            monteursId: profiel._id,
            actie: "Auto opgehaald — bevestigd door balie",
            notitie: args.notitie,
            tijdstip: nu,
            tokenIdentifier: profiel.tokenIdentifier,
        });

        return { succes: true };
    },
});

/**
 * lijstAfgerondNietOpgehaald — afgeronde orders die nog niet door de klant zijn opgehaald.
 *
 * Balie-widget: toont welke auto's klaar staan maar de klant nog niet gebeld/opgehaald is.
 * Verrijkt met klant + voertuig voor telefonisch contact.
 *
 * Filter: status = "Afgerond" + opgehaaldOp = undefined + gearchiveerd = false/undefined.
 * Vereist minimaal de rol "balie".
 */
export const lijstAfgerondNietOpgehaald = query({
    args: {},
    handler: async (ctx) => {
        const profiel = await requireDomainRole(ctx, "balie");
        const tokenIdentifier = profiel.tokenIdentifier;

        // Gebruik status-index voor efficiënte tenant + status filter
        const afgerond = await ctx.db
            .query("werkorders")
            .withIndex("by_status_and_token", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier).eq("status", "Afgerond")
            )
            .collect();

        // Filter: nog niet opgehaald en niet gearchiveerd
        const wachtend = afgerond.filter(
            (o) => o.opgehaaldOp === undefined && !o.gearchiveerd
        );

        // Verrijk met klant + voertuig
        const verrijkt = await Promise.all(
            wachtend.map(async (order) => {
                const voertuig = await ctx.db.get(order.voertuigId);
                const klant = await ctx.db.get(order.klantId);
                return {
                    ...order,
                    voertuig: voertuig
                        ? { kenteken: voertuig.kenteken, merk: voertuig.merk, model: voertuig.model }
                        : null,
                    klant: klant
                        ? {
                            voornaam: klant.voornaam,
                            achternaam: klant.achternaam,
                            telefoonnummer: klant.telefoonnummer,
                        }
                        : null,
                };
            })
        );

        // Sorteer op aanmaakdatum (oudste orders bovenaan — geen afsluittijdstip beschikbaar)
        return verrijkt.sort((a, b) => a.aangemaaktOp - b.aangemaaktOp);
    },
});

// ---------------------------------------------------------------------------
// Balie-only: planningsagenda
// ---------------------------------------------------------------------------

/**
 * lijstPlanningVoorBalie — werkorders gesorteerd op afspraakDatum.
 *
 * Retourneert alle niet-gearchiveerde werkorders gesorteerd op datum,
 * verrijkt met voertuig- en klantdata voor de planningslijst.
 * Vereist minimaal de rol "balie".
 */
export const lijstPlanningVoorBalie = query({
    args: {
        /** Vanafmillis (epoch) — standaard begin van vandaag. */
        vanafMs: v.optional(v.number()),
        /** Totms (epoch) — standaard 7 dagen vanaf vandaag. */
        totMs: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const profiel = await requireDomainRole(ctx, "balie");
        const tokenIdentifier = profiel.tokenIdentifier;

        const nu = Date.now();
        const vanafMs = args.vanafMs ?? (nu - (nu % 86400000)); // begin vandaag (lokale UTC-midnight)
        const totMs = args.totMs ?? (vanafMs + 7 * 24 * 60 * 60 * 1000);  // +7 dagen (week-overzicht)

        const orders = await ctx.db
            .query("werkorders")
            .withIndex("by_datum_and_token", (q) =>
                q.eq("tokenIdentifier", tokenIdentifier)
                    .gte("afspraakDatum", vanafMs)
                    .lte("afspraakDatum", totMs)
            )
            .order("asc")
            .collect();

        // Filter gearchiveerde orders
        const actief = orders.filter((o) => !o.gearchiveerd);

        // Verrijk met voertuig + klant
        const verrijkt = await Promise.all(
            actief.map(async (order) => {
                const voertuig = await ctx.db.get(order.voertuigId);
                const klant = await ctx.db.get(order.klantId);
                return {
                    ...order,
                    voertuig: voertuig
                        ? { kenteken: voertuig.kenteken, merk: voertuig.merk, model: voertuig.model }
                        : null,
                    klant: klant
                        ? { voornaam: klant.voornaam, achternaam: klant.achternaam, telefoonnummer: klant.telefoonnummer }
                        : null,
                };
            })
        );

        return verrijkt;
    },
});

// ---------------------------------------------------------------------------
// Eigenaar-only: archiveren
// ---------------------------------------------------------------------------

/**
 * archiveerWerkorder — markeer een gesloten werkorder als gearchiveerd.
 *
 * Verbergt de order van het actieve Kanban-bord en de planningsagenda.
 * Alleen de eigenaar kan archiveren.
 */
export const archiveerWerkorder = mutation({
    args: {
        werkorderId: v.id("werkorders"),
    },
    handler: async (ctx, args): Promise<{ succes: boolean }> => {
        const profiel = await requireDomainRole(ctx, "eigenaar");

        const order = await ctx.db.get(args.werkorderId);
        if (!order || order.tokenIdentifier !== profiel.tokenIdentifier) {
            throw new Error("FORBIDDEN: Werkorder niet gevonden of geen toegang.");
        }

        await ctx.db.patch(args.werkorderId, { gearchiveerd: true });

        await ctx.db.insert("werkorderLogs", {
            werkorderId: args.werkorderId,
            monteursId: profiel._id,
            actie: "Werkorder gearchiveerd door eigenaar",
            tijdstip: Date.now(),
            tokenIdentifier: profiel.tokenIdentifier,
        });

        return { succes: true };
    },
});

