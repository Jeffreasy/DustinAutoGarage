/**
 * src/hooks/useKlanten.ts
 *
 * Custom React hooks voor de `klanten` tabel.
 * Gebruikt de Convex queries uit convex/klanten.ts.
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Queries — beschikbaar voor alle ingelogde medewerkers
// ---------------------------------------------------------------------------

/** Haalt alle klanten op voor de huidige tenant. */
export function useKlantenLijst(): Doc<"klanten">[] | undefined {
    return useQuery(api.klanten.list);
}

/** Haalt klanten gefilterd op status op. */
export function useKlantenByStatus(
    status: "Actief" | "Inactief" | "Prospect"
): Doc<"klanten">[] | undefined {
    return useQuery(api.klanten.getByStatus, { status });
}

/** Haalt één klant op op basis van zijn Convex ID. */
export function useKlantById(
    klantId: Id<"klanten"> | null
): Doc<"klanten"> | null | undefined {
    return useQuery(
        api.klanten.getById,
        klantId ? { klantId } : "skip"
    );
}

/** Zoekt klanten op naam of e-mailadres (minimaal 2 tekens). */
export function useKlantenZoek(term: string): Doc<"klanten">[] | undefined {
    return useQuery(api.klanten.zoek, { term });
}

// ---------------------------------------------------------------------------
// Eigenaar-only queries
// ---------------------------------------------------------------------------

/** Klanten met bezoekfrequentie — eigenaar only. */
export function useKlantenMetOmzet() {
    return useQuery(api.klanten.lijstKlantenMetOmzet);
}

/** CSV-ready export data — eigenaar only. */
export function useExportKlanten() {
    return useQuery(api.klanten.exportKlanten);
}

// ---------------------------------------------------------------------------
// Mutaties
// ---------------------------------------------------------------------------

/** Maak een nieuwe klant aan (balie+). */
export function useMaakKlantAan() {
    return useMutation(api.klanten.create);
}

/** Pas klantgegevens aan (balie+, volledige update). */
export function useUpdateKlant() {
    return useMutation(api.klanten.update);
}

/** Pas alleen balie-velden aan (notities + AVG). */
export function useUpdateKlantBalieVelden() {
    return useMutation(api.klanten.updateKlantBalieVelden);
}

/** Zet klant op Inactief (zachte verwijdering). */
export function useDeactiveerKlant() {
    return useMutation(api.klanten.deactiveer);
}

/** Harde verwijdering van klant + cascade (eigenaar via UI gate). */
export function useVerwijderKlant() {
    return useMutation(api.klanten.verwijder);
}
