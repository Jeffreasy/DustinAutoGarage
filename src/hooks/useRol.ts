/**
 * src/hooks/useRol.ts
 *
 * Custom React hook — Domain Role Awareness (Split-Role strategie)
 *
 * Leest het medewerkers-profiel uit Convex en exposoet handige boolean flags
 * voor conditonele UI-rendering. Werkt enkel binnen een LaventeConvexProvider.
 *
 * Gebruik:
 *   const { isEigenaar, isBalie, domeinRol, isLoading } = useRol();
 *
 *   {isBalie && <KlantToevoegenKnop />}
 *   {isEigenaar && <FinancieelDashboard />}
 */

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { DomeinRol } from "../../convex/helpers";

// Re-export DomeinRol type voor gebruik in UI-componenten
export type { DomeinRol };

interface RolState {
    /** De garage-specifieke domeinrol, of null als nog niet gekoppeld / laden */
    domeinRol: DomeinRol | null;

    /** Eigenaar: volledige toegang inclusief financiën en medewerkersbeheer */
    isEigenaar: boolean;

    /** Balie of hoger: klantbeheer, voertuigen, facturen opstellen */
    isBalie: boolean;

    /** Monteur of hoger: werkorders inkijken, notities toevoegen */
    isMonteur: boolean;

    /** Nog dooraan het ophalen van het profiel */
    isLoading: boolean;

    /** Geen medewerkers-record gevonden — cold-start situatie */
    isNietGekoppeld: boolean;
}

/**
 * useRol — haal de domain-rol van de ingelogde medewerker op.
 *
 * Returns semantische boolean flags zodat componenten NOOIT direct
 * op de rol-string hoeven te vergelijken (minder bugs bij spelfouten).
 *
 * @example
 *   const { isBalie, isLoading } = useRol();
 *   if (isLoading) return <Spinner />;
 *   if (!isBalie) return null; // Verborgen voor monteurs en stagiairs
 */
export function useRol(): RolState {
    // useQuery retourneert `undefined` tijdens laden, `null` als niet ingelogd/niet gekoppeld
    const profiel = useQuery(api.medewerkers.getMijnProfiel);

    const isLoading = profiel === undefined;
    const domeinRol = (profiel?.domeinRol ?? null) as DomeinRol | null;

    return {
        domeinRol,
        isEigenaar: domeinRol === "eigenaar",
        isBalie: domeinRol === "eigenaar" || domeinRol === "balie",
        isMonteur: domeinRol !== null, // Elke actieve medewerker heeft minimaal monteur-rechten
        isLoading,
        isNietGekoppeld: !isLoading && profiel === null,
    };
}
