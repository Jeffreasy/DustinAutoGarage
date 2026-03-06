/**
 * src/hooks/useVoertuigen.ts
 *
 * Custom React hooks voor de `voertuigen` tabel.
 *
 * Data-logica is hiermee volledig losgekoppeld van UI-componenten:
 *   - Componenten importeren de hook en renderen de data
 *   - Queries worden op één plek gedefinieerd (DRY)
 *   - Unit-testbaar los van de component tree
 *
 * Vereisten:
 *   - Moet binnen een `<LaventeConvexProvider>` gebruikt worden
 *     (Convex auth context vereist)
 */

import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Hook: voertuigenlijst
// ---------------------------------------------------------------------------

/**
 * Haalt alle voertuigen op voor de huidige tenant-sessie.
 * Wacht op Convex auth voordat de query verstuurd wordt.
 *
 * @returns Array van voertuigen (nieuwste eerst), of `undefined` tijdens laden.
 */
export function useVoertuigenLijst(): Doc<"voertuigen">[] | undefined {
    const { isAuthenticated } = useConvexAuth();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const results = useQuery(api.voertuigen.list, isAuthenticated ? {} : "skip" as any);
    return results;
}

// ---------------------------------------------------------------------------
// Hook: APK-waarschuwingen
// ---------------------------------------------------------------------------

/**
 * Haalt alle voertuigen op waarvan de APK binnen `dagenVooruit` dagen verloopt.
 * Standaard: 30 dagen.
 *
 * @param dagenVooruit - Kijkvenster in dagen (default: 30)
 * @returns Gefilterde array van voertuigen, of `undefined` tijdens laden.
 *
 * @example
 * const waarschuwingen = useApkWaarschuwingen(14);
 * if (waarschuwingen?.length) return <ApkAlert items={waarschuwingen} />;
 */
export function useApkWaarschuwingen(
    dagenVooruit: number = 30
): Doc<"voertuigen">[] | undefined {
    const { isAuthenticated } = useConvexAuth();
    return useQuery(
        api.voertuigen.getBijnaVerlopenApk,
        isAuthenticated ? { dagenVooruit } : "skip"
    );
}

/**
 * Haalt voertuigen op waarvan de APK al verlopen is (apkVervaldatum < nu).
 * Aparte query zodat "verlopen" en "bijna verlopen" correct onderscheiden worden.
 */
export function useVerlopenApk(): Doc<"voertuigen">[] | undefined {
    const { isAuthenticated } = useConvexAuth();
    return useQuery(
        api.voertuigen.getVerlopenApk,
        isAuthenticated ? {} : "skip"
    );
}

// ---------------------------------------------------------------------------
// Hook: voertuig op ID
// ---------------------------------------------------------------------------

/**
 * Haalt één voertuig op op basis van zijn Convex ID.
 * Retourneert `null` als het voertuig niet bestaat of niet toebehoort aan
 * de sessie (IDOR-bescherming zit in de Convex query).
 *
 * Geef `null` mee als ID nog niet bekend is — de query wordt dan overgeslagen.
 *
 * @param voertuigId - Convex ID van het voertuig, of `null` om query te skippen
 * @returns Voertuig object, `null` (niet gevonden), of `undefined` (laden)
 */
export function useVoertuigById(
    voertuigId: Doc<"voertuigen">["_id"] | null
): Doc<"voertuigen"> | null | undefined {
    return useQuery(
        api.voertuigen.getById,
        voertuigId ? { voertuigId } : "skip"
    );
}

// ---------------------------------------------------------------------------
// Mutatie hooks
// ---------------------------------------------------------------------------

import { useMutation } from "convex/react";

/** Maak een nieuw voertuig aan (balie+). */
export function useMaakVoertuigAan() {
    return useMutation(api.voertuigen.create);
}

/** Pas voertuiggegevens aan (balie+). */
export function useUpdateVoertuig() {
    return useMutation(api.voertuigen.update);
}

/** Werk de kilometerstand bij (monteur+). */
export function useUpdateKilometerstand() {
    return useMutation(api.voertuigen.updateKilometerstand);
}

/** Verwijder voertuig + cascade (eigenaar via UI gate). */
export function useVerwijderVoertuig() {
    return useMutation(api.voertuigen.verwijder);
}

// ---------------------------------------------------------------------------
// Hook: mijn interne klant-ID (voor "Mijn auto" badge)
// ---------------------------------------------------------------------------

import { api as _api } from "../../convex/_generated/api";

/**
 * Retourneert het Convex-ID van het interne klant-profiel van de ingelogde
 * medewerker, of `null` als er geen profiel is, of `undefined` tijdens laden.
 *
 * Gebruik:
 *   const mijnKlantId = useMijnKlantId();
 *   const isEigen = voertuig.klantId === mijnKlantId;
 */
export function useMijnKlantId(): string | null | undefined {
    const { isAuthenticated } = useConvexAuth();
    const profiel = useQuery(
        _api.klanten.getMijnKlantProfiel,
        isAuthenticated ? {} : "skip"
    );
    if (profiel === undefined) return undefined;
    return profiel ? profiel._id : null;
}
