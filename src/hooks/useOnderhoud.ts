/**
 * src/hooks/useOnderhoud.ts
 *
 * Custom React hooks voor de `onderhoudshistorie` tabel.
 * Gebruikt de Convex queries uit convex/onderhoudshistorie.ts.
 */

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

/**
 * Haalt het volledige onderhoudsdossier op voor één voertuig.
 * Geef `null` mee als het voertuigId nog niet bekend is.
 *
 * @returns Array van onderhoudsbeurten (nieuwste eerst), of `undefined` (laden)
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
 *
 * @param limiet - Maximaal aantal resultaten (default: 20)
 * @returns Array van recente beurten (nieuwste eerst), of `undefined` (laden)
 */
export function useRecenteOnderhoudsbeurten(
    limiet: number = 20
): Doc<"onderhoudshistorie">[] | undefined {
    return useQuery(api.onderhoudshistorie.getRecenteOnderhoudsbeurten, { limiet });
}
