/**
 * src/hooks/useOnderhoud.ts
 *
 * Custom React hooks voor de `onderhoudshistorie` en `werkorderLogs` tabellen.
 * Queries + mutations — compleet setje voor eigenaar én balie.
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Query hooks — Onderhoudshistorie
// ---------------------------------------------------------------------------

/**
 * Haalt het volledige onderhoudsdossier op voor één voertuig.
 * Geef `null` mee als het voertuigId nog niet bekend is.
 */
export function useVoertuigHistorie(
    voertuigId: Id<"voertuigen"> | null
): Doc<"onderhoudshistorie">[] | undefined {
    return useQuery(
        api.onderhoudshistorie.getHistorie,
        voertuigId ? { voertuigId } : "skip"
    );
}

/**
 * Correcte garage-brede statistieken — telt ALLE records, niet gelimiteerd.
 * Gebruik dit voor KPI-blokken i.p.v. useRecenteBeurtenVerrijkt.
 *
 * Resultaat: { totaal, apksDezeMaand, groteBeurten, kleineBeurten, reparaties }
 */
export function useTotaalStatistieken() {
    return useQuery(api.onderhoudshistorie.getTotaalStatistieken);
}

/**
 * Haalt de meest recente onderhoudsbeurten op.
 * Ondersteunt nu datum-range filtering voor maand/kwartaal-rapportage.
 *
 * @param limiet   - Max aantal (default: 20)
 * @param vanafMs  - Optionele startdatum (ms since epoch)
 * @param totMs    - Optionele einddatum (ms since epoch)
 */
export function useRecenteOnderhoudsbeurten(
    limiet: number = 20,
    vanafMs?: number,
    totMs?: number
): Doc<"onderhoudshistorie">[] | undefined {
    return useQuery(api.onderhoudshistorie.getRecenteOnderhoudsbeurten, {
        limiet,
        vanafMs,
        totMs,
    });
}

/**
 * Verrijkte recente beurten met voertuig- én klantcontext.
 * Gebruik dit voor de activiteitsfeed — bevat kenteken, merk/model én klantnaam.
 */
export function useRecenteBeurtenVerrijkt(limiet: number = 20) {
    return useQuery(api.onderhoudshistorie.getRecenteBeurtenVerrijkt, { limiet });
}

// ---------------------------------------------------------------------------
// Query hooks — Werkorder Audit Trail
// ---------------------------------------------------------------------------

/**
 * Garage-brede chronologische activiteitsfeed — alle werkorder-acties.
 * Verrijkt met medewerkersnaam en voertuig-context.
 * Alleen beschikbaar voor balie+ rollen.
 *
 * @param limiet   - Max resultaten (default: 50)
 * @param vanafMs  - Optionele startdatum
 * @param totMs    - Optionele einddatum
 */
export function useGarageActiviteit(
    limiet: number = 50,
    vanafMs?: number,
    totMs?: number
) {
    return useQuery(api.werkorderLogs.lijstGarageActiviteit, {
        limiet,
        vanafMs,
        totMs,
    });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/** Registreer een nieuwe onderhoudsbeurt voor een voertuig. */
export function useRegistreerOnderhoud() {
    return useMutation(api.onderhoudshistorie.registreer);
}

/** Voeg een factuur-/rapportage-URL toe aan een bestaande beurt. */
export function useUpdateDocumentUrl() {
    return useMutation(api.onderhoudshistorie.updateDocumentUrl);
}

/** Verwijder een onderhoudsrecord (permanent, eigenaar only). */
export function useVerwijderOnderhoud() {
    return useMutation(api.onderhoudshistorie.verwijder);
}

// ---------------------------------------------------------------------------
// Persoonlijk voertuig (medewerker-as-klant)
// ---------------------------------------------------------------------------

/**
 * Haalt het interne klant-profiel op van de ingelogde medewerker.
 * Retourneert null als nog geen profiel bestaat.
 */
export function useMijnKlantProfiel() {
    return useQuery(api.klanten.getMijnKlantProfiel);
}

/** Registreer de ingelogde medewerker als interne klant (idempotent). */
export function useRegistreerMedewerkerAlsKlant() {
    return useMutation(api.klanten.registreerMedewerkerAlsKlant);
}
