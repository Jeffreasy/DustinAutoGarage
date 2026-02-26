/**
 * src/hooks/useScannerActie.ts
 *
 * Centrale logica die na een kentekenscan beslist wat er moet gebeuren:
 *   - Kenteken gevonden in voertuigenlijst → highlight + scroll naar kaart
 *   - Kenteken niet gevonden → preFill data retourneren voor NieuwVoertuigModal
 */

export interface ScanVoertuigData {
    merk?: string;
    model?: string;
    bouwjaar?: number | string;
    brandstof?: string;
    kleur?: string;
    apkVervaldatum?: string;
}

export interface ScanPreFillData {
    kenteken: string;
    merk?: string;
    model?: string;
    bouwjaar?: number;
    brandstof?: string;
    apkVervaldatum?: string;
}

interface ScannerActieResult {
    /**
     * Verwerkt een scan-resultaat. Roep aan vanuit de onGescandResultaat callback.
     * @param kenteken - Het gescande kenteken
     * @param voertuigInfo - Optionele voertuigdata uit de OCR+RDW pipeline
     * @returns preFillData als het voertuig NIET in de lijst staat, anders null
     */
    handleScanResultaat: (
        kenteken: string,
        voertuigInfo?: ScanVoertuigData,
    ) => ScanPreFillData | null;
}

/** Normaliseert een kenteken voor vergelijking: uppercase, geen streepjes/spaties. */
export function normaliseKenteken(k: string): string {
    return k.toUpperCase().replace(/[\s-]/g, "");
}

/**
 * Geeft een handler terug die na een scan beslist:
 *  - match → scroll + highlight (side-effect via DOM) → returns null
 *  - geen match → returns ScanPreFillData voor de modal
 */
export function useScannerActie(
    voertuigen: Array<{ _id: string; kenteken: string }> | undefined,
    onHighlight: (id: string) => void,
): ScannerActieResult {
    function handleScanResultaat(
        kenteken: string,
        voertuigInfo?: ScanVoertuigData,
    ): ScanPreFillData | null {
        const norm = normaliseKenteken(kenteken);

        const gevonden = (voertuigen ?? []).find(
            (v) => normaliseKenteken(v.kenteken) === norm,
        );

        if (gevonden) {
            // Bestaand voertuig: highlight + smooth scroll
            onHighlight(gevonden._id);
            setTimeout(() => {
                document
                    .getElementById(`voertuig-${gevonden._id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 50);
            return null;
        }

        // Nieuw voertuig: geef preFill data terug voor NieuwVoertuigModal
        const preFill: ScanPreFillData = { kenteken: norm };
        if (voertuigInfo) {
            if (voertuigInfo.merk) preFill.merk = voertuigInfo.merk;
            if (voertuigInfo.model) preFill.model = voertuigInfo.model;
            if (voertuigInfo.bouwjaar) preFill.bouwjaar = Number(voertuigInfo.bouwjaar);
            if (voertuigInfo.brandstof) preFill.brandstof = voertuigInfo.brandstof;
            if (voertuigInfo.apkVervaldatum) preFill.apkVervaldatum = voertuigInfo.apkVervaldatum;
        }
        return preFill;
    }

    return { handleScanResultaat };
}
