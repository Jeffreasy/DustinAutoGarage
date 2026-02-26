/**
 * src/hooks/useKentekenLookup.ts
 *
 * Debounced auto-fill hook voor het kentekenveld.
 *
 * Flow:
 *   1. Gebruiker typt kenteken (bijv. "GH-446-V")
 *   2. Na 500ms debounce + minimaal 6 tekens → fetch naar /api/rdw/{kenteken}
 *   3. Astro BFF-proxy stuurt cookies mee → Go backend valideert editor+ rol
 *   4. Gevonden data wordt teruggegeven zodat het formulier zichzelf invult
 *
 * Kenmerken:
 *   - Debounce van 500ms — voorkomt een API call per toetsdruk
 *   - Minimum 6 tekens — "GH-446-V" genormaliseerd is "GH446V" (6 chars)
 *   - AbortController — annuleert in-flight requests bij snelle invoer
 *   - Cookie-auth via apiFetch (credentials: include) — geen JWT nodig
 *   - Idempotent — zelfde kenteken twee keer = één call
 */

import { useState, useEffect, useRef } from "react";
import { apiFetch, ApiError } from "../lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RDWVoertuigInfo {
    // Identificatie
    kenteken: string;
    merk: string;
    model: string;
    bouwjaar: number;
    voertuigsoort?: string;          // "Personenauto", "Bedrijfsauto", "Motor"
    inrichting?: string;             // "hatchback", "sedan"

    // Kleuren
    kleur?: string;                  // Eerste geregistreerde kleur
    tweedeKleur?: string;            // Tweede kleur (bijv. "ZWART" op tweekleurige auto)

    // Brandstof & techniek
    brandstof: "Benzine" | "Diesel" | "EV" | "Hybride" | "LPG";
    cilinderinhoud?: number;         // cc
    vermogen?: number;               // kW verbrandingsmotor
    emissieklasse?: string;          // "Euro 6"
    co2Uitstoot?: number;            // g/km gecombineerd

    // Gewichten & zitplaatsen
    massaRijklaar?: number;          // kg rijklaar gewicht
    maxTrekgewichtOngeremd?: number; // kg maximaal trekgewicht ongeremd
    maxTrekgewichtGeremd?: number;   // kg maximaal trekgewicht geremd
    aantalZitplaatsen?: number;      // aantal zitplaatsen (bijv. 5)

    // APK & tenaamstelling
    apkVervaldatum?: string;         // "YYYY-MM-DD"
    eersteTenaamstelling?: string;   // "YYYY-MM-DD" — eerste NL registratie

    // Garage-signalen
    wok: boolean;                    // true = wacht op keuren
    heeftRecall: boolean;            // true = openstaande terugroepactie (boolean fallback)
    recalls?: RecallDetail[];        // Gedetailleerde recall-informatie
    nap?: string;                    // "Logisch" | "Onlogisch"
}

/** Eén openstaande terugroepactie (RDW dataset j9yh-4bf6). */
export interface RecallDetail {
    code: string;
    omschrijving?: string;
    oorzaak?: string;
    remedie?: string;
    datum?: string; // "YYYY-MM-DD"
}



export type KentekenStatus = "idle" | "loading" | "ok" | "notfound" | "error";

export interface KentekenLookupResult {
    /** Huidige status van de lookup. */
    status: KentekenStatus;
    /** Gevonden voertuigdata — alleen gevuld bij status "ok". */
    data: RDWVoertuigInfo | null;
    /** Foutmelding — alleen gevuld bij status "error". */
    error: string | null;
    /** Reset de status naar "idle" (bijv. bij handmatige veldwijziging). */
    reset: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normaliseert het kenteken voor vergelijking: verwijder streepjes + uppercase. */
function normeer(kenteken: string): string {
    return kenteken.replace(/[-\s]/g, "").toUpperCase();
}

const DEBOUNCE_MS = 500;
const MIN_CHARS = 6;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @param kenteken - Ruwe input van het kentekenveld (bijv. "GH-446-V")
 */
export function useKentekenLookup(kenteken: string): KentekenLookupResult {
    const [status, setStatus] = useState<KentekenStatus>("idle");
    const [data, setData] = useState<RDWVoertuigInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Ref om in-flight fetch te annuleren bij snelle invoer
    const abortRef = useRef<AbortController | null>(null);
    // Ref om debounce timer bij te houden
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Ref om dubbele calls voor hetzelfde kenteken te voorkomen
    const lastFetchedRef = useRef<string>("");

    const genormeerd = normeer(kenteken);

    useEffect(() => {
        // Ruim de vorige timer op
        if (timerRef.current) clearTimeout(timerRef.current);

        // Reset naar idle als te kort of geklaard
        if (genormeerd.length < MIN_CHARS) {
            setStatus("idle");
            setData(null);
            setError(null);
            lastFetchedRef.current = "";
            return;
        }

        // Sla dubbele fetch voor hetzelfde kenteken over
        if (genormeerd === lastFetchedRef.current) return;

        timerRef.current = setTimeout(async () => {
            // Annuleer vorige in-flight request
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            setStatus("loading");
            setData(null);
            setError(null);

            try {
                const result = await apiFetch<RDWVoertuigInfo>(
                    `/api/rdw/${encodeURIComponent(genormeerd)}`,
                    { signal: controller.signal }
                );

                if (controller.signal.aborted) return;

                setData(result);
                setStatus("ok");
                lastFetchedRef.current = genormeerd;
            } catch (err) {
                if (controller.signal.aborted) return;

                if (err instanceof ApiError) {
                    if (err.status === 404) {
                        setStatus("notfound");
                    } else if (err.status === 401 || err.status === 403) {
                        setStatus("error");
                        setError("Geen toegang — editor-rol vereist.");
                    } else {
                        setStatus("error");
                        setError(`Fout ${err.status}: ${err.message}`);
                    }
                } else {
                    setStatus("error");
                    setError("Netwerk onbereikbaar — probeer opnieuw.");
                }
            }
        }, DEBOUNCE_MS);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [genormeerd]);

    function reset() {
        if (timerRef.current) clearTimeout(timerRef.current);
        abortRef.current?.abort();
        setStatus("idle");
        setData(null);
        setError(null);
        lastFetchedRef.current = "";
    }

    return { status, data, error, reset };
}
