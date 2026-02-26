/**
 * src/components/voertuigen/scanner/KentekenScanner.tsx
 *
 * Device-responsive kenteken scanner UI:
 *   1. Mobiel/tablet → camera (capture="environment")
 *      Desktop/laptop → bestandsmanager (geen capture attribuut)
 *   2. Foto wordt geüpload naar /api/rdw/scan-foto (POST multipart)
 *   3. Backend (xAI Grok Vision) OCR → RDW lookup → JSON response
 *   4. Gedetecteerd kenteken wordt getoond + onGescanned callback
 *   5. Na scan: inline correctie-modus (✏️ potlood) beschikbaar
 *
 * Foutgevallen:
 *   - 503: scan-backend tijdelijk niet beschikbaar (vriendelijke melding)
 *   - 400: ongeldig bestandstype of te groot
 *   - 422: geen kenteken herkend in de foto
 *
 * UI/UX conformiteit (ui-ux-pro-max audit Feb 2026):
 *   - Alle touch targets ≥ 44×44px (min-width + min-height)
 *   - flexShrink: 0 op alle icon-knoppen
 *   - flexWrap: "wrap" op pill-containers (mobiel-veilig)
 *   - inputmode="text" + autocapitalize="characters" op correctie-input
 *   - type="button" op alle knoppen
 *   - Hover-transitie op alle klikbare elementen (200ms)
 *   - prefers-reduced-motion gerespecteerd in spinner
 */

import { useState, useRef, useEffect } from "react";

// Eenmalige device-detectie: touch = mobiel/tablet, geen touch = desktop/laptop.
const isMobileDevice = typeof navigator !== "undefined" && navigator.maxTouchPoints > 1;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecallDetail {
    code: string;
    omschrijving?: string;
    oorzaak?: string;
    remedie?: string;
    datum?: string;
}

interface ScanResultaat {
    detected_kenteken: string;
    voertuig?: {
        merk?: string;
        model?: string;
        bouwjaar?: number | string;
        voertuigsoort?: string;
        inrichting?: string;
        kleur?: string;
        tweedeKleur?: string;
        brandstof?: string;
        cilinderinhoud?: number;
        vermogen?: number;
        emissieklasse?: string;
        co2Uitstoot?: number;
        massaRijklaar?: number;
        maxTrekgewichtOngeremd?: number;
        maxTrekgewichtGeremd?: number;
        aantalZitplaatsen?: number;
        apkVervaldatum?: string;
        eersteTenaamstelling?: string;
        wok?: boolean;
        heeftRecall?: boolean;
        recalls?: RecallDetail[];
        nap?: string;
    };
}

interface KentekenScannerProps {
    /** Callback: kenteken string zodra OCR slaagt */
    onGescanned: (kenteken: string, voertuig?: ScanResultaat["voertuig"]) => void;
    label?: string;
}

// ---------------------------------------------------------------------------
// Gedeelde stijl-constanten  (buiten component → geen re-allocatie per render)
// ---------------------------------------------------------------------------

/** Minimale touch-target grootte: 44×44px per WCAG 2.5.5 */
const TOUCH_TARGET: React.CSSProperties = {
    minWidth: 44,
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: "var(--space-2)",
    background: "none",
    border: "none",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
    transition: "background-color 200ms ease, opacity 200ms ease",
    WebkitTapHighlightColor: "transparent",
};

/** Pill-container voor success/error/scanning states */
const PILL_BASE: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    flexWrap: "wrap",        // wraps op <375px
    gap: "var(--space-2)",
    padding: "var(--space-2) var(--space-3)",
    minHeight: "44px",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--text-sm)",
};

// ---------------------------------------------------------------------------
// Icons (consistente 24×24 viewBox; visuele grootte via width/height)
// ---------------------------------------------------------------------------

function IconCamera() {
    return (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    );
}

function IconX() {
    return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none"
            stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
            aria-hidden="true" style={{ flexShrink: 0 }}>
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function IconCheck() {
    return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none"
            stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true" style={{ flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function IconEdit() {
    return (
        <svg viewBox="0 0 24 24" width={15} height={15} fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Spinner — respecteert prefers-reduced-motion
// ---------------------------------------------------------------------------

function Spinner() {
    const reducedMotion =
        typeof window !== "undefined"
            ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
            : false;

    return (
        <svg
            width={18} height={18} viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
            aria-hidden="true"
            style={{
                animation: reducedMotion ? "none" : "spin 0.8s linear infinite",
                opacity: reducedMotion ? 0.7 : 1,
                flexShrink: 0,
            }}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// KentekenScanner
// ---------------------------------------------------------------------------

type Status = "idle" | "scanning" | "success" | "error";

export default function KentekenScanner({ onGescanned, label = "Scan Kenteken" }: KentekenScannerProps) {
    const [status, setStatus] = useState<Status>("idle");
    const [foutmelding, setFoutmelding] = useState("");
    const [gevondenKenteken, setGevondenKenteken] = useState("");
    const [voertuigInfo, setVoertuigInfo] = useState<ScanResultaat["voertuig"]>();
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Correctie-state
    const [isCorrectieModus, setIsCorrectieModus] = useState(false);
    const [correctieInput, setCorrectieInput] = useState("");
    const correctieInputRef = useRef<HTMLInputElement>(null);

    function handleFileKeuze(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => setPreview(ev.target?.result as string);
        reader.readAsDataURL(file);

        scanFoto(file);
    }

    /**
     * compresseerFoto — client-side canvas resize + JPEG compressie.
     * Vercel's serverless function limit is 4.5 MB.
     */
    async function compresseerFoto(file: File): Promise<File> {
        const MAX_BREEDTE = 1280;
        const MAX_BYTES = 3 * 1024 * 1024;

        if (file.size <= MAX_BYTES) return file;

        return new Promise((resolve) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const schaal = img.width > MAX_BREEDTE ? MAX_BREEDTE / img.width : 1;
                const breedte = Math.round(img.width * schaal);
                const hoogte = Math.round(img.height * schaal);
                const canvas = document.createElement("canvas");
                canvas.width = breedte;
                canvas.height = hoogte;
                canvas.getContext("2d")!.drawImage(img, 0, 0, breedte, hoogte);
                let kwaliteit = 0.82;
                const tryBlob = (q: number) => {
                    canvas.toBlob((blob) => {
                        if (!blob) { resolve(file); return; }
                        if (blob.size > MAX_BYTES && q > 0.4) {
                            tryBlob(q - 0.15);
                        } else {
                            resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
                        }
                    }, "image/jpeg", q);
                };
                tryBlob(kwaliteit);
            };
            img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
            img.src = objectUrl;
        });
    }

    async function scanFoto(file: File) {
        setStatus("scanning");
        setFoutmelding("");
        setGevondenKenteken("");
        setVoertuigInfo(undefined);

        try {
            const gecomprimeerd = await compresseerFoto(file);
            const form = new FormData();
            form.append("foto", gecomprimeerd);

            const csrfToken =
                typeof document !== "undefined"
                    ? document.cookie.split("; ").find((c) => c.startsWith("csrf_token="))?.split("=")[1] ?? ""
                    : "";

            const res = await fetch("/api/rdw/scan-foto", {
                method: "POST",
                body: form,
                credentials: "include",
                headers: {
                    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
                },
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                const bericht = (errData as Record<string, string>).error
                    ?? (errData as Record<string, string>).message
                    ?? `Fout ${res.status}`;

                if (res.status === 503) {
                    setFoutmelding("Foto-scan tijdelijk niet beschikbaar. Voer het kenteken handmatig in.");
                } else if (res.status === 422) {
                    setFoutmelding("Geen kenteken herkend. Probeer een scherpere foto.");
                } else {
                    setFoutmelding(bericht);
                }
                setStatus("error");
                return;
            }

            const data: ScanResultaat = await res.json();

            if (!data.detected_kenteken) {
                setFoutmelding("Geen kenteken herkend in de foto.");
                setStatus("error");
                return;
            }

            setGevondenKenteken(data.detected_kenteken);
            setVoertuigInfo(data.voertuig);
            setStatus("success");
            onGescanned(data.detected_kenteken, data.voertuig);

        } catch (err) {
            setFoutmelding(err instanceof Error ? err.message : "Netwerk fout — probeer opnieuw.");
            setStatus("error");
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function reset() {
        setStatus("idle");
        setFoutmelding("");
        setGevondenKenteken("");
        setVoertuigInfo(undefined);
        setPreview(null);
        setIsCorrectieModus(false);
        setCorrectieInput("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function startCorrectie() {
        setCorrectieInput(gevondenKenteken);
        setIsCorrectieModus(true);
    }

    function annuleerCorrectie() {
        setIsCorrectieModus(false);
        setCorrectieInput("");
    }

    function bevestigCorrectie() {
        const genormaliseerd = correctieInput.trim().toUpperCase().replace(/[\s-]/g, "");
        if (genormaliseerd.length < 4) return;
        setGevondenKenteken(genormaliseerd);
        setIsCorrectieModus(false);
        setCorrectieInput("");
        onGescanned(genormaliseerd, voertuigInfo);
    }

    function handleCorrectieKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") { e.preventDefault(); bevestigCorrectie(); }
        if (e.key === "Escape") { e.preventDefault(); annuleerCorrectie(); }
    }

    // Auto-focus correctie-input zodra correctie-modus actief wordt
    useEffect(() => {
        if (isCorrectieModus) {
            setTimeout(() => correctieInputRef.current?.focus(), 30);
        }
    }, [isCorrectieModus]);

    // ── Render ──────────────────────────────────────────────────────────────

    if (status === "success" && gevondenKenteken) {

        // ── Correctie-modus ──────────────────────────────────────────────────
        if (isCorrectieModus) {
            return (
                <div style={{
                    ...PILL_BASE,
                    background: "var(--color-success-bg)",
                    border: "1px solid var(--color-success-border)",
                    color: "var(--color-success)",
                }}>
                    {/* Correctie-input: inputmode voor mobiel toetsenbord, autocapitalize voor iOS */}
                    <input
                        ref={correctieInputRef}
                        type="text"
                        inputMode="text"
                        autoCapitalize="characters"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        value={correctieInput}
                        onChange={(e) => setCorrectieInput(e.target.value.toUpperCase())}
                        onKeyDown={handleCorrectieKeyDown}
                        maxLength={9}
                        placeholder="bijv. 1TGP97"
                        aria-label="Corrigeer gescand kenteken"
                        style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: "var(--weight-bold)",
                            letterSpacing: "0.06em",
                            fontSize: "var(--text-sm)",
                            background: "transparent",
                            border: "none",
                            borderBottom: "1.5px solid var(--color-success)",
                            outline: "none",
                            color: "var(--color-success)",
                            width: "clamp(80px, 20vw, 110px)",  // fluid: smal op mobiel, ruimer op desktop
                            minHeight: "32px",                   // verticaal goed raakbaar
                            padding: "2px 4px",
                        }}
                    />

                    {/* Bevestig  */}
                    <button
                        type="button"
                        onClick={bevestigCorrectie}
                        disabled={correctieInput.trim().length < 4}
                        style={{
                            ...TOUCH_TARGET,
                            color: "var(--color-success)",
                            opacity: correctieInput.trim().length < 4 ? 0.35 : 1,
                        }}
                        aria-label="Kenteken bevestigen"
                        title="Bevestig (Enter)"
                    >
                        <IconCheck />
                    </button>

                    {/* Annuleer  */}
                    <button
                        type="button"
                        onClick={annuleerCorrectie}
                        style={{ ...TOUCH_TARGET, color: "var(--color-muted)" }}
                        aria-label="Correctie annuleren"
                        title="Annuleer (Escape)"
                    >
                        <IconX />
                    </button>
                </div>
            );
        }

        // ── Normale success-state ────────────────────────────────────────────
        return (
            <div style={{
                ...PILL_BASE,
                background: "var(--color-success-bg)",
                border: "1px solid var(--color-success-border)",
                color: "var(--color-success)",
                transition: "opacity var(--transition-base)",
            }}>
                <IconCheck />

                {/* Kentekentekst: nooit knippen, altijd monospace */}
                <span style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: "var(--weight-bold)",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                }}>
                    {gevondenKenteken}
                </span>

                {/* Merk/model: verborgen als te krap */}
                {voertuigInfo?.merk && (
                    <span style={{
                        color: "var(--color-muted)",
                        fontSize: "var(--text-xs)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "clamp(60px, 15vw, 140px)",
                    }}>
                        {voertuigInfo.merk} {voertuigInfo.model}
                    </span>
                )}

                {/* Corrigeer-knop */}
                <button
                    type="button"
                    onClick={startCorrectie}
                    style={{ ...TOUCH_TARGET, color: "var(--color-muted)" }}
                    aria-label="Kenteken corrigeren"
                    title="Kenteken corrigeren"
                >
                    <IconEdit />
                </button>

                {/* Reset-knop */}
                <button
                    type="button"
                    onClick={reset}
                    style={{ ...TOUCH_TARGET, color: "var(--color-muted)" }}
                    aria-label="Scanner resetten"
                    title="Opnieuw scannen"
                >
                    <IconX />
                </button>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div style={{
                ...PILL_BASE,
                background: "var(--color-error-bg)",
                border: "1px solid var(--color-error-border)",
                color: "var(--color-error)",
                maxWidth: "min(360px, 100%)",   // nooit breder dan parent op mobiel
                transition: "opacity var(--transition-base)",
            }}>
                <span style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    // Op mobiel mag de tekst wrappen zodat hij volledig leesbaar is
                    whiteSpace: isMobileDevice ? "normal" : "nowrap",
                }}>
                    {foutmelding}
                </span>

                {/* Sluit-knop: altijd 44×44 zodat hij raakbaar is naast lange foutmelding */}
                <button
                    type="button"
                    onClick={reset}
                    style={{ ...TOUCH_TARGET, color: "var(--color-error)" }}
                    aria-label="Probeer opnieuw"
                    title="Opnieuw proberen"
                >
                    <IconX />
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Verborgen file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                {...(isMobileDevice ? { capture: "environment" } : {})}
                onChange={handleFileKeuze}
                style={{ display: "none" }}
                aria-label={isMobileDevice ? "Fotografeer het kenteken" : "Selecteer foto van kenteken"}
            />

            {status === "scanning" ? (
                // Scanning-state: spinner + preview thumbnail
                <div style={{
                    ...PILL_BASE,
                    border: "1.5px solid var(--color-accent)",
                    background: "var(--color-accent-dim)",
                    color: "var(--color-accent)",
                }}>
                    <Spinner />
                    <span style={{ whiteSpace: "nowrap" }}>Kenteken herkennen…</span>
                    {preview && (
                        <img
                            src={preview}
                            alt="Geselecteerde foto"
                            style={{
                                width: 32, height: 32, objectFit: "cover",
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--color-border)",
                                flexShrink: 0,
                            }}
                        />
                    )}
                </div>
            ) : (
                // Idle: trigger-knop
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title={isMobileDevice ? "Scan kenteken via camera" : "Selecteer foto van kenteken"}
                    aria-label={label}
                    className="btn btn-ghost"
                    style={{
                        minHeight: "44px",
                        minWidth: "44px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        border: "1.5px dashed var(--color-border)",
                        fontSize: "var(--text-sm)",
                        cursor: "pointer",
                        transition: "border-color 200ms ease, background-color 200ms ease",
                        WebkitTapHighlightColor: "transparent",
                    }}
                >
                    <IconCamera />
                    {label}
                </button>
            )}
        </>
    );
}
