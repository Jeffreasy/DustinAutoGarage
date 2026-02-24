/**
 * src/hooks/useOnderhoud.ts
 *
 * Custom React hooks voor de `onderhoudshistorie` tabel.
 * Queries + mutations — compleet setje.
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Query hooks
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
 * Haalt de meest recente onderhoudsbeurten op voor het dashboard.
 * @param limiet - Maximaal (default: 20)
 */
export function useRecenteOnderhoudsbeurten(
    limiet: number = 20
): Doc<"onderhoudshistorie">[] | undefined {
    return useQuery(api.onderhoudshistorie.getRecenteOnderhoudsbeurten, { limiet });
}

/**
 * Haalt verrijkte recente beurten op met voertuig-context (kenteken, merk, model).
 * Gebruik dit voor de activiteitsfeed waar de eigenaar/balie direct het voertuig wil zien.
 */
export function useRecenteBeurtenVerrijkt(limiet: number = 20) {
    return useQuery(api.onderhoudshistorie.getRecenteBeurtenVerrijkt, { limiet });
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

/** Verwijder een onderhoudsrecord (permanent). */
export function useVerwijderOnderhoud() {
    return useMutation(api.onderhoudshistorie.verwijder);
}
