/**
 * src/hooks/useScannerActie.ts
 *
 * Centrale logica die na een kentekenscan beslist wat er moet gebeuren:
 *   - Kenteken gevonden in voertuigenlijst → highlight + scroll naar kaart
 *   - Kenteken niet gevonden → preFill data retourneren voor NieuwVoertuigModal
 */

import type { RecallDetail } from "./useKentekenLookup";
import type { Id } from "../../convex/_generated/dataModel";

export type { RecallDetail };

export interface ScanVoertuigData {
    // Identificatie
    merk?: string;
    model?: string;
    bouwjaar?: number | string;
    voertuigsoort?: string;
    inrichting?: string;

    // Kleuren
    kleur?: string;
    tweedeKleur?: string;

    // Brandstof & techniek
    brandstof?: string;
    cilinderinhoud?: number;
    vermogen?: number;
    emissieklasse?: string;
    co2Uitstoot?: number;

    // Gewichten & zitplaatsen
    massaRijklaar?: number;
    maxTrekgewichtOngeremd?: number;
    maxTrekgewichtGeremd?: number;
    aantalZitplaatsen?: number;

    // APK & tenaamstelling
    apkVervaldatum?: string;
    eersteTenaamstelling?: string;

    // Garage-signalen
    wok?: boolean;
    heeftRecall?: boolean;
    recalls?: RecallDetail[];
    nap?: string;
}

export interface ScanPreFillData {
    kenteken: string;
    merk?: string;
    model?: string;
    bouwjaar?: number;
    voertuigsoort?: string;
    brandstof?: string;
    kleur?: string;
    tweedeKleur?: string;
    co2Uitstoot?: number;
    massaRijklaar?: number;
    aantalZitplaatsen?: number;
    apkVervaldatum?: string;
    eersteTenaamstelling?: string;
    // Recall-data meegeven zodat NieuwVoertuigModal ze direct kan tonen
    wok?: boolean;
    heeftRecall?: boolean;
    recalls?: RecallDetail[];
    nap?: string;
    // Klant-koppeling vanuit ScanKlantKeuzeModal (optioneel)
    klantId?: Id<"klanten">;
    klantNaam?: string;
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
            // Identificatie
            if (voertuigInfo.merk) preFill.merk = voertuigInfo.merk;
            if (voertuigInfo.model) preFill.model = voertuigInfo.model;
            if (voertuigInfo.bouwjaar) preFill.bouwjaar = Number(voertuigInfo.bouwjaar);
            if (voertuigInfo.voertuigsoort) preFill.voertuigsoort = voertuigInfo.voertuigsoort;
            // Brandstof
            if (voertuigInfo.brandstof) preFill.brandstof = voertuigInfo.brandstof;
            // Kleuren
            if (voertuigInfo.kleur) preFill.kleur = voertuigInfo.kleur;
            if (voertuigInfo.tweedeKleur) preFill.tweedeKleur = voertuigInfo.tweedeKleur;
            // Techniek
            if (voertuigInfo.co2Uitstoot) preFill.co2Uitstoot = voertuigInfo.co2Uitstoot;
            // Gewichten & zitplaatsen
            if (voertuigInfo.massaRijklaar) preFill.massaRijklaar = voertuigInfo.massaRijklaar;
            if (voertuigInfo.aantalZitplaatsen) preFill.aantalZitplaatsen = voertuigInfo.aantalZitplaatsen;
            // APK & tenaamstelling
            if (voertuigInfo.apkVervaldatum) preFill.apkVervaldatum = voertuigInfo.apkVervaldatum;
            if (voertuigInfo.eersteTenaamstelling) preFill.eersteTenaamstelling = voertuigInfo.eersteTenaamstelling;
            // Garage-signalen
            if (voertuigInfo.wok !== undefined) preFill.wok = voertuigInfo.wok;
            if (voertuigInfo.heeftRecall !== undefined) preFill.heeftRecall = voertuigInfo.heeftRecall;
            if (voertuigInfo.recalls?.length) preFill.recalls = voertuigInfo.recalls;
            if (voertuigInfo.nap) preFill.nap = voertuigInfo.nap;
        }
        return preFill;

    }

    return { handleScanResultaat };
}
