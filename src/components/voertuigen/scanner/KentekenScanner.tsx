/**
 * src/components/voertuigen/scanner/KentekenScanner.tsx
 *
 * Volledige kenteken scanner UI:
 *   1. Gebruiker opent de scanner via een camera / bestand knop
 *   2. Foto wordt geüpload naar /api/rdw/scan-foto (POST multipart)
 *   3. Backend (xAI Grok Vision) OCR → RDW lookup → JSON response
 *   4. Gedetecteerd kenteken wordt getoond + onGescanned callback
 *
 * Foutgevallen:
 *   - 503: XAI_API_KEY niet geconfigureerd op backend
 *   - 400: ongeldig bestandstype of te groot
 *   - 422: geen kenteken herkend in de foto
 */

import { useState, useRef } from "react";

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
        apk_vervaldatum?: string;
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
    return (
        <svg
            width={16} height={16} viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
            aria-hidden="true"
            style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}
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

    async function scanFoto(file: File) {
        setStatus("scanning");
        setFoutmelding("");
        setGevondenKenteken("");
        setVoertuigInfo(undefined);

        try {
            const form = new FormData();
            form.append("foto", file);

            const res = await fetch("/api/rdw/scan-foto", {
                method: "POST",
                body: form,
                credentials: "include",
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                const bericht = (errData as Record<string, string>).error
                    ?? (errData as Record<string, string>).message
                    ?? `Fout ${res.status}`;

                if (res.status === 503) {
                    setFoutmelding("AI scanner niet beschikbaar — XAI_API_KEY niet geconfigureerd.");
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
                background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.35)",
                color: "#16a34a", fontSize: "var(--text-sm)",
            }}>
                <IconCheck />
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.05em" }}>
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
                        color: "var(--color-muted)", padding: "2px", display: "flex",
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
                background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)",
                color: "#dc2626", fontSize: "var(--text-sm)", maxWidth: "320px",
            }}>
                <span style={{ flex: 1 }}>{foutmelding}</span>
                <button
                    onClick={reset}
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "rgba(220,38,38,0.7)", padding: "2px", display: "flex", flexShrink: 0,
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
                capture="environment"
                onChange={handleFileKeuze}
                style={{ display: "none" }}
                aria-label="Fotografeer het kenteken"
            />

            {status === "scanning" ? (
                // Scanning state: spinner + preview thumbnail
                <div style={{
                    display: "inline-flex", alignItems: "center", gap: "var(--space-2)",
                    padding: "var(--space-2) var(--space-4)", minHeight: "44px",
                    borderRadius: "var(--radius-md)",
                    border: "1.5px solid var(--color-accent, #10b981)",
                    background: "rgba(16,185,129,0.07)",
                    color: "var(--color-accent, #10b981)",
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
                    title="Scan kenteken via AI foto-herkenning"
                    aria-label={label}
                    className="btn btn-ghost"
                    style={{
                        minHeight: "44px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        border: "1.5px dashed var(--color-border)",
                        fontSize: "var(--text-sm)",
                    }}
                >
                    <IconCamera />
                    {label}
                </button>
            )}
        </>
    );
}
