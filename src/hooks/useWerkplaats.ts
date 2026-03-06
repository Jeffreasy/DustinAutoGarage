/**
 * src/hooks/useWerkplaats.ts
 *
 * Data hooks voor het Werkplaatsbord.
 * Volgt hetzelfde patroon als useVoertuigen.ts — useQuery + Convex real-time.
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Types (afgeleid van de Convex return types)
// ---------------------------------------------------------------------------

export type WerkplekStatus = "Beschikbaar" | "In onderhoud" | "Buiten gebruik";

export type WerkplekDoc = {
    _id: Id<"werkplekken">;
    naam: string;
    type: "Brug" | "Uitlijnbrug" | "Wasplaats" | "Buiten" | "Overig";
    volgorde: number;
    /** Operationele status — undefined = Beschikbaar (backward-compat) */
    status?: WerkplekStatus;
    tokenIdentifier: string;
};

/** Mogelijke redenen voor annulering — gespiegeld aan vAfsluitingReden in validators.ts */
export type AfsluitingReden =
    | "Klant niet verschenen"
    | "Klant geannuleerd"
    | "Geen toestemming klant"
    | "Onderdelen niet leverbaar"
    | "Dubbele boeking"
    | "Overig";

export type WerkorderVerrijkt = {
    _id: Id<"werkorders">;
    voertuigId: Id<"voertuigen">;
    klantId?: Id<"klanten">;
    werkplekId?: Id<"werkplekken">;
    monteursId?: Id<"medewerkers">;
    klacht: string;
    status:
    | "Gepland"
    | "Aanwezig"
    | "Wachtend"
    | "Bezig"
    | "Wacht op onderdelen"
    | "Klaar"
    | "Afgerond"
    | "Geannuleerd";
    afspraakDatum: number;
    totaalKosten?: number;
    /** Of totaalKosten incl. BTW is. undefined = niet ingevuld. */
    btwInbegrepen?: boolean;
    /** Slotnotitie van de balie — persistent op het record (ook in logs). */
    slotNotitie?: string;
    /** Timestamp: klant heeft auto opgehaald. undefined = nog niet opgehaald. */
    opgehaaldOp?: number;
    /** Reden van annulering — aanwezig als status = "Geannuleerd". */
    afsluitingReden?: AfsluitingReden;
    gearchiveerd?: boolean;
    tokenIdentifier: string;
    aangemaaktOp: number;
    voertuig: { kenteken: string; merk: string; model: string } | null;
    klant: { voornaam: string; achternaam: string; telefoonnummer: string } | null;
    monteur: { naam: string } | null;
};

export type WerkorderLogDoc = {
    _id: Id<"werkorderLogs">;
    werkorderId: Id<"werkorders">;
    monteursId: Id<"medewerkers">;
    actie: string;
    notitie?: string;
    tijdstip: number;
    tokenIdentifier: string;
    /** Naam van de medewerker — server-side verrijkt via JOIN op medewerkers tabel. Altijd ingevuld (fallback "Onbekend"). */
    medewerkerNaam: string;
};


// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/** Real-time lijst van alle werkplekken (kolommen), gesorteerd op volgorde. */
export function useWerkplekken() {
    return useQuery(api.werkplekken.lijstWerkplekken) as WerkplekDoc[] | undefined;
}

/** Real-time lijst van alle werkorders, verrijkt met voertuig- en klantdata. */
export function useWerkorders() {
    return useQuery(api.werkorders.lijstWerkordersVoorBord) as WerkorderVerrijkt[] | undefined;
}

/** Logboek voor één werkorder, nieuwste eerst. */
export function useWerkorderLogs(werkorderId: Id<"werkorders"> | null) {
    return useQuery(
        api.werkorderLogs.lijstLogsVoorWerkorder,
        werkorderId ? { werkorderId } : "skip"
    ) as WerkorderLogDoc[] | undefined;
}

/** Live klant-zoek voor het aanmaak-formulier (min. 2 tekens). */
export function useZoekKlanten(zoekterm: string) {
    return useQuery(
        api.klanten.zoek,
        zoekterm.length >= 2 ? { term: zoekterm } : "skip"
    );
}

/** Voertuigen van een geselecteerde klant voor het aanmaak-formulier. */
export function useVoertuigenVanKlant(klantId: Id<"klanten"> | null) {
    return useQuery(
        api.voertuigen.getByKlant,
        klantId ? { klantId } : "skip"
    );
}

/** Alle medewerkers ophalen voor monteur-toewijzing. */
export function useMedewerkers() {
    return useQuery(api.medewerkers.listMedewerkers);
}

/**
 * Afgeronde orders die nog wachten op ophalen door de klant.
 * Balie-widget: toont welke auto's klaarstaan maar nog niet opgehaald zijn.
 *
 * @param enabled - Geef `false` mee voor rollen zonder balie-rechten (monteur, stagiair).
 *                  Standaard `true` (backwards-compat voor BalieWerkplaatsView).
 */
export function useAfgerondNietOpgehaald(enabled = true) {
    return useQuery(
        api.werkorders.lijstAfgerondNietOpgehaald,
        enabled ? {} : "skip"
    ) as WerkorderVerrijkt[] | undefined;
}

/** Planning voor de balie — vandaag + N dagen (balie-only). */
export function useLijstPlanningVoorBalie(vanafMs?: number, totMs?: number) {
    return useQuery(api.werkorders.lijstPlanningVoorBalie, { vanafMs, totMs });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

export function useVerplaatsNaarWerkplek() {
    return useMutation(api.werkorders.verplaatsNaarWerkplek);
}

export function useUpdateStatus() {
    return useMutation(api.werkorders.updateStatus);
}

export function useMaakWerkorderAan() {
    return useMutation(api.werkorders.maakWerkorderAan);
}

export function useVoegLogToe() {
    return useMutation(api.werkorderLogs.voegLogToe);
}

export function useSeedDefaultWerkplekken() {
    return useMutation(api.werkplekken.seedDefaultWerkplekken);
}

export function useSluitWerkorderAf() {
    return useMutation(api.werkorders.sluitWerkorderAf);
}

/** Archiveer een werkorder (eigenaar-only). */
export function useArchiveerWerkorder() {
    return useMutation(api.werkorders.archiveerWerkorder);
}

/** Wijs een monteur toe aan een werkorder — of ontkoppel (eigenaar/balie). */
export function useWijsMonteurtoe() {
    return useMutation(api.werkorders.wijsMonteurtoe);
}

/**
 * Annuleer een werkorder met een verplichte reden.
 * Auto-archiveert de order direct — verdwijnt van het bord.
 * Gebruik deze in plaats van useUpdateStatus voor annuleringen.
 */
export function useAnnuleerWerkorder() {
    return useMutation(api.werkorders.annuleerWerkorder);
}

/**
 * Bevestig dat de klant de auto heeft opgehaald.
 * Vult `opgehaaldOp` — order blijft status "Afgerond".
 */
export function useBevestigOphalen() {
    return useMutation(api.werkorders.bevestigOphalen);
}

/** Zet operationele status van een werkplek (eigenaar-only). */
export function useZetWerkplekStatus() {
    return useMutation(api.werkplekken.zetWerkplekStatus);
}

// ---------------------------------------------------------------------------
// Rapport — werkorderBevindingen types
// ---------------------------------------------------------------------------

export type BevindingType = "Bevinding" | "Onderdeel" | "Uren" | "Taak";

export type BevindingDoc = {
    _id: Id<"werkorderBevindingen">;
    werkorderId: Id<"werkorders">;
    monteursId: Id<"medewerkers">;
    type: BevindingType;
    omschrijving: string;
    tijdstip: number;
    /** G4: voor welke werkdag zijn deze uren (ms since epoch) */
    werkDatum?: number;
    onderdeel?: {
        artikelnummer?: string;
        leverancier?: string;
        prijs?: number;
        aantal: number;
    };
    aantalUren?: number;
    gedaan?: boolean;
    tokenIdentifier: string;
    /** Naam van de medewerker — server-side verrijkt. Altijd ingevuld. */
    medewerkerNaam: string;
};

// ---------------------------------------------------------------------------
// Rapport hooks — queries
// ---------------------------------------------------------------------------

/** Alle bevindingen voor één werkorder, chronologisch (monteur+). */
export function useBevindingen(werkorderId: Id<"werkorders"> | null) {
    return useQuery(
        api.werkorderBevindingen.lijstBevindingen,
        werkorderId ? { werkorderId } : "skip"
    ) as BevindingDoc[] | undefined;
}

/** Totale inkoopprijs van alle onderdelen (balie+). Null = geen onderdelen met prijs. */
export function useTotaalOnderdelenKosten(werkorderId: Id<"werkorders"> | null) {
    return useQuery(
        api.werkorderBevindingen.totaalOnderdelenKosten,
        werkorderId ? { werkorderId } : "skip"
    ) as number | null | undefined;
}

/** Totaal geregistreerde uren (monteur+). Null = geen uren. G1 FIX: was balie+. */
export function useTotaalUren(werkorderId: Id<"werkorders"> | null) {
    return useQuery(
        api.werkorderBevindingen.totaalUren,
        werkorderId ? { werkorderId } : "skip"
    ) as number | null | undefined;
}

/**
 * Uren uitgesplitst per monteur voor één werkorder.
 * G2 FIX: Per-monteur aggregatie.
 * G3 FIX: loonkosten aanwezig als eigenaar én uurloon ingesteld.
 */
export function useUrenPerMonteur(werkorderId: Id<"werkorders"> | null) {
    return useQuery(
        api.werkorderBevindingen.urenPerMonteur,
        werkorderId ? { werkorderId } : "skip"
    ) as { monteursId: string; monteurNaam: string; totaalUren: number; loonkosten?: number }[] | undefined;
}

// ---------------------------------------------------------------------------
// Rapport hooks — mutaties
// ---------------------------------------------------------------------------

/** Voeg een gestructureerde bevinding toe (monteur+). */
export function useVoegBevindingToe() {
    return useMutation(api.werkorderBevindingen.voegBevindingToe);
}

/** Wijzig omschrijving, taakstatus, uren of onderdeel-details (monteur own / eigenaar all). */
export function useUpdateBevinding() {
    return useMutation(api.werkorderBevindingen.updateBevinding);
}

/** Verwijder een bevinding permanent (eigenaar only). */
export function useVerwijderBevinding() {
    return useMutation(api.werkorderBevindingen.verwijderBevinding);
}
