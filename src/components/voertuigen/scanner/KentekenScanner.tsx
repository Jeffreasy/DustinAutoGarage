/**
 * src/components/voertuigen/scanner/KentekenScanner.tsx
 *
 * Device-responsive kenteken scanner UI:
 *   1. Mobiel/tablet → camera (capture="environment")
 *      Desktop/laptop → bestandsmanager (geen capture attribuut)
 *   2. Foto wordt geüpload naar /api/rdw/scan-foto (POST multipart)
 *   3. Backend (xAI Grok Vision) OCR → RDW lookup → JSON response
 *   4. Gedetecteerd kenteken wordt getoond + onGescanned callback
 *
 * Foutgevallen:
 *   - 503: scan-backend tijdelijk niet beschikbaar (vriendelijke melding)
 *   - 400: ongeldig bestandstype of te groot
 *   - 422: geen kenteken herkend in de foto
 */

import { useState, useRef } from "react";

// Eenmalige device-detectie: touch = mobiel/tablet, geen touch = desktop/laptop.
const isMobileDevice = typeof navigator !== "undefined" && navigator.maxTouchPoints > 1;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanResultaat {
    detected_kenteken: string;
    voertuig?: {
        merk?: string;
        model?: string;
        bouwjaar?: number | string;
        brandstof?: string;
        kleur?: string;
        apkVervaldatum?: string;
    };
}

interface KentekenScannerProps {
    /** Callback: kenteken string zodra OCR slaagt */
    onGescanned: (kenteken: string, voertuig?: ScanResultaat["voertuig"]) => void;
    label?: string;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconCamera() {
    return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    );
}

function IconX() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function IconCheck() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
    // prefers-reduced-motion: vervang spin door subtiele pulse
    const reducedMotion =
        typeof window !== "undefined"
            ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
            : false;

    return (
        <svg
            width={16} height={16} viewBox="0 0 24 24"
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

    function handleFileKeuze(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview genereren
        const reader = new FileReader();
        reader.onload = (ev) => setPreview(ev.target?.result as string);
        reader.readAsDataURL(file);

        scanFoto(file);
    }

    /**
     * compresseerFoto — client-side canvas resize + JPEG compressie.
     * Vercel's serverless function limit is 4.5 MB. Camera foto's van moderne
     * telefoons kunnen 10+ MB zijn. OCR heeft max ~1280px nodig.
     */
    async function compresseerFoto(file: File): Promise<File> {
        const MAX_BREEDTE = 1280;
        const MAX_BYTES = 3 * 1024 * 1024; // 3 MB ruim onder de Vercel limiet

        // Als het al klein genoeg is, gewoon doorgeven
        if (file.size <= MAX_BYTES) return file;

        return new Promise((resolve) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);

                // Schaal berekenen
                const schaal = img.width > MAX_BREEDTE ? MAX_BREEDTE / img.width : 1;
                const breedte = Math.round(img.width * schaal);
                const hoogte = Math.round(img.height * schaal);

                const canvas = document.createElement("canvas");
                canvas.width = breedte;
                canvas.height = hoogte;
                canvas.getContext("2d")!.drawImage(img, 0, 0, breedte, hoogte);

                // Verlaag kwaliteit indien nog steeds te groot
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
            // Client-side compressie vóór upload (Vercel max 4.5MB)
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

        // Reset input zodat dezelfde foto opnieuw gekozen kan worden
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function reset() {
        setStatus("idle");
        setFoutmelding("");
        setGevondenKenteken("");
        setVoertuigInfo(undefined);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    // ── Render ──────────────────────────────────────────────────────────────

    if (status === "success" && gevondenKenteken) {
        return (
            <div style={{
                display: "inline-flex", alignItems: "center", gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)", minHeight: "44px",
                borderRadius: "var(--radius-md)",
                background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)",
                color: "var(--color-success)", fontSize: "var(--text-sm)",
                transition: "opacity var(--transition-base)",
            }}>
                <IconCheck />
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--weight-bold)", letterSpacing: "0.05em" }}>
                    {gevondenKenteken}
                </span>
                {voertuigInfo?.merk && (
                    <span style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)" }}>
                        {voertuigInfo.merk} {voertuigInfo.model}
                    </span>
                )}
                <button
                    onClick={reset}
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--color-muted)", padding: "var(--space-1)", display: "flex",
                    }}
                    aria-label="Scanner resetten"
                >
                    <IconX />
                </button>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div style={{
                display: "inline-flex", alignItems: "center", gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)", minHeight: "44px",
                borderRadius: "var(--radius-md)",
                background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)",
                color: "var(--color-error)", fontSize: "var(--text-sm)", maxWidth: "320px",
                transition: "opacity var(--transition-base)",
            }}>
                <span style={{ flex: 1 }}>{foutmelding}</span>
                <button
                    onClick={reset}
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--color-error)", padding: "var(--space-1)", display: "flex", flexShrink: 0,
                    }}
                    aria-label="Probeer opnieuw"
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
                // Scanning state: spinner + preview thumbnail
                <div style={{
                    display: "inline-flex", alignItems: "center", gap: "var(--space-2)",
                    padding: "var(--space-2) var(--space-4)", minHeight: "44px",
                    borderRadius: "var(--radius-md)",
                    border: "1.5px solid var(--color-accent)",
                    background: "var(--color-accent-dim)",
                    color: "var(--color-accent)",
                    fontSize: "var(--text-sm)",
                }}>
                    <Spinner />
                    <span>Kenteken herkennen…</span>
                    {preview && (
                        <img
                            src={preview}
                            alt="Geselecteerde foto"
                            style={{
                                width: 32, height: 32, objectFit: "cover",
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--color-border)",
                            }}
                        />
                    )}
                </div>
            ) : (
                // Idle: trigger knop
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title={isMobileDevice ? "Scan kenteken via camera" : "Selecteer foto van kenteken"}
                    aria-label={label}
                    className="btn btn-ghost"
                    style={{
                        minHeight: "44px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        border: "1.5px dashed var(--color-border)",
                        fontSize: "var(--text-sm)",
                        transition: "border-color var(--transition-fast), background-color var(--transition-fast)",
                    }}
                >
                    <IconCamera />
                    {label}
                </button>
            )}
        </>
    );
}
