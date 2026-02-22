/**
 * src/hooks/useKlanten.ts
 *
 * Custom React hooks voor de `klanten` tabel.
 * Gebruikt de Convex queries uit convex/klanten.ts.
 */

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

/**
 * Haalt alle klanten op voor de huidige tenant-sessie.
 * @returns Array van klanten, of `undefined` tijdens laden.
 */
export function useKlantenLijst(): Doc<"klanten">[] | undefined {
    return useQuery(api.klanten.list);
}

/**
 * Haalt klanten gefilterd op status op.
 * @param status - "Actief" | "Inactief" | "Prospect"
 */
export function useKlantenByStatus(
    status: "Actief" | "Inactief" | "Prospect"
): Doc<"klanten">[] | undefined {
    return useQuery(api.klanten.getByStatus, { status });
}

/**
 * Haalt één klant op op basis van zijn Convex ID.
 * Geef `null` mee als ID nog niet bekend is.
 *
 * @returns Klant object, `null` (niet gevonden), of `undefined` (laden)
 */
export function useKlantById(
    klantId: Id<"klanten"> | null
): Doc<"klanten"> | null | undefined {
    return useQuery(
        api.klanten.getById,
        klantId ? { klantId } : "skip"
    );
}

/**
 * Zoekt klanten op naam of e-mailadres.
 * @param term - Zoekterm (minimaal 2 tekens, anders lege array)
 */
export function useKlantenZoek(term: string): Doc<"klanten">[] | undefined {
    return useQuery(api.klanten.zoek, { term });
}
