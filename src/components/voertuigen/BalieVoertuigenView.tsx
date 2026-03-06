/**
 * src/components/voertuigen/BalieVoertuigenView.tsx
 *
 * Balie / Receptie: volledig CRUD voor het wagenpark.
 * ui-ux-pro-max: SVG icons, glassmorphism cards, APK banner met SVG, skeleton grid, ✏️ → SVG pencil.
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useVoertuigenLijst, useApkWaarschuwingen, useVerlopenApk, useMijnKlantId } from "../../hooks/useVoertuigen";
import { useScannerActie } from "../../hooks/useScannerActie";
import { useRol } from "../../hooks/useRol";
import type { ScanVoertuigData, ScanPreFillData } from "../../hooks/useScannerActie";
import ScannerSlot from "./scanner/ScannerSlot";
import NieuwVoertuigModal from "../modals/NieuwVoertuigModal";
import ScanKlantKeuzeModal from "../modals/ScanKlantKeuzeModal";
import type { ScanKlantKeuzeResult } from "../modals/ScanKlantKeuzeModal";
import VoertuigBewerkModal from "../modals/VoertuigBewerkModal";
import VoertuigDetailPanel from "../modals/VoertuigDetailPanel";

// ---------------------------------------------------------------------------
// APK helpers
// ---------------------------------------------------------------------------

function apkStijl(ms: number | undefined) {
    if (!ms) return { color: "var(--color-muted)", bg: "transparent", border: "transparent" };
    const nu = Date.now();
    if (ms < nu) return { color: "var(--color-error)", bg: "var(--color-error-bg)", border: "var(--color-error-border)" };
    if (ms < nu + 30 * 864e5) return { color: "var(--color-warning)", bg: "var(--color-warning-bg)", border: "var(--color-warning-border)" };
    return { color: "var(--color-success)", bg: "var(--color-success-bg)", border: "var(--color-success-border)" };
}

// ---------------------------------------------------------------------------
// SVG icons
// ---------------------------------------------------------------------------

function IconSearch() {
    return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

function IconPlus() {
    return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

function IconPencil() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

function IconCar() {
    return (
        <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2" />
            <circle cx="9" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
        </svg>
    );
}

function IconAlertTriangle() {
    return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

function IconClock() {
    return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function VoertuigSkeleton() {
    return (
        <div aria-hidden="true" style={{ borderRadius: "var(--radius-xl)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)", height: "140px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ width: "55%", height: "24px", borderRadius: "var(--radius-md)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ width: "28px", height: "28px", borderRadius: "var(--radius-md)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
            <div style={{ width: "75%", height: "14px", borderRadius: "var(--radius-md)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ width: "40%", height: "20px", borderRadius: "9999px", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ width: "100%", height: "34px", borderRadius: "var(--radius-md)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite", marginTop: "auto" }} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// VoertuigKaartBalie
// ---------------------------------------------------------------------------

function VoertuigKaartBalie({ voertuig, onBewerk, highlighted, isEigenVoertuig }: {
    voertuig: Doc<"voertuigen">;
    onBewerk: () => void;
    highlighted?: boolean;
    isEigenVoertuig?: boolean;
}) {
    const updateKm = useMutation(api.voertuigen.updateKilometerstand);
    const [km, setKm] = useState(String(voertuig.kilometerstand ?? ""));
    const [bezig, setBezig] = useState(false);
    const [kmFout, setKmFout] = useState("");

    async function handleKmUpdate() {
        if (!km || Number(km) === voertuig.kilometerstand) return;
        setBezig(true); setKmFout("");
        try { await updateKm({ voertuigId: voertuig._id, nieuweKilometerstand: Number(km) }); }
        catch (err) { setKmFout(err instanceof Error ? err.message.replace(/^INVALID: /, "") : "Fout bij opslaan"); }
        finally { setBezig(false); }
    }

    const apk = apkStijl(voertuig.apkVervaldatum);

    return (
        <div
            id={`voertuig-${voertuig._id}`}
            style={{
                borderRadius: "var(--radius-xl)",
                background: "var(--glass-bg)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: highlighted
                    ? "2px solid var(--color-accent)"
                    : "1px solid var(--glass-border)",
                boxShadow: highlighted
                    ? "0 0 0 4px var(--color-accent-dim), var(--shadow-glow)"
                    : "var(--glass-shadow)",
                display: "flex", flexDirection: "column", gap: "var(--space-3)",
                overflow: "hidden",
                transition: "border var(--transition-slow), box-shadow var(--transition-slow)",
            }}>
            {/* Kaart header */}
            <div style={{ padding: "var(--space-4) var(--space-4) 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", minWidth: 0, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--weight-black)", fontSize: "var(--text-xl)", color: "var(--color-heading)", letterSpacing: "0.06em", flexShrink: 0 }}>
                        {voertuig.kenteken}
                    </span>
                    {isEigenVoertuig && (
                        <span
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "0.3em",
                                fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                                color: "var(--color-accent-text, var(--color-accent))",
                                background: "var(--color-accent-dim, rgba(99,102,241,0.12))",
                                border: "1px solid var(--color-accent-border, rgba(99,102,241,0.3))",
                                borderRadius: "var(--radius-full)",
                                padding: "0.15em 0.55em",
                                whiteSpace: "nowrap",
                            }}
                            aria-label="Dit is jouw persoonlijke voertuig"
                        >
                            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
                                <circle cx="7" cy="7" r="5" />
                                <path d="M12 7h10M19 4l3 3-3 3" />
                            </svg>
                            Mijn auto
                        </span>
                    )}
                </div>
                <button
                    onClick={onBewerk}
                    className="btn btn-ghost btn-sm"
                    style={{ minHeight: "34px", minWidth: "34px", padding: "0", display: "flex", alignItems: "center", justifyContent: "center" }}
                    aria-label={`Bewerk ${voertuig.kenteken}`}
                >
                    <IconPencil />
                </button>
            </div>

            <div style={{ padding: "0 var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-body)", margin: 0 }}>
                    {voertuig.merk} {voertuig.model}
                    <span style={{ color: "var(--color-muted)" }}> · {voertuig.bouwjaar} · {voertuig.brandstof}</span>
                </p>

                {/* APK badge */}
                <span style={{
                    display: "inline-flex", alignSelf: "flex-start",
                    fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                    color: apk.color, background: apk.bg, border: `1px solid ${apk.border}`,
                    borderRadius: "var(--radius-full)", padding: "0.2em 0.65em",
                }}>
                    {voertuig.apkVervaldatum
                        ? `APK: ${new Date(voertuig.apkVervaldatum).toLocaleDateString("nl-NL")}`
                        : "APK onbekend"}
                </span>
            </div>

            {/* Km inline update footer */}
            <div style={{ padding: "var(--space-3) var(--space-4)", background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                    <input
                        type="number" value={km} onChange={(e) => setKm(e.target.value)}
                        placeholder="km-stand bijwerken"
                        aria-label="Kilometerstand bijwerken"
                        style={{
                            flex: 1, padding: "var(--space-2) var(--space-3)",
                            borderRadius: "var(--radius-md)",
                            border: `1px solid ${kmFout ? "var(--color-error-border)" : "var(--color-border)"}`,
                            background: "var(--glass-bg-subtle)",
                            color: "var(--color-heading)", fontSize: "var(--text-xs)",
                            minHeight: "34px", boxSizing: "border-box" as const,
                        }}
                        onBlur={handleKmUpdate}
                        onKeyDown={(e) => e.key === "Enter" && handleKmUpdate()}
                    />
                    {bezig && <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={2} strokeLinecap="round" aria-hidden="true" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>}
                </div>
                {kmFout && <p style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", margin: 0 }}>{kmFout}</p>}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// BalieVoertuigenView
// ---------------------------------------------------------------------------

export default function BalieVoertuigenView() {
    const [zoek, setZoek] = useState("");
    const [toonNieuw, setToonNieuw] = useState(false);
    const [teBewerken, setTeBewerken] = useState<Doc<"voertuigen"> | null>(null);
    const [detailVoertuig, setDetailVoertuig] = useState<Doc<"voertuigen"> | null>(null);
    const [highlightId, setHighlightId] = useState<string | null>(null);
    // ScanPreFill: verrijkte scan data (RDW) voor NieuwVoertuigModal
    const [scanPreFill, setScanPreFill] = useState<ScanPreFillData | null>(null);
    // Two-step flow: na scan eerst keuze-modal
    const [toonScanKeuze, setToonScanKeuze] = useState(false);

    const voertuigen = useVoertuigenLijst();
    const verlopen = useVerlopenApk() ?? [];         // APK < nu (eigen query)
    const bijnaVerlopen = useApkWaarschuwingen(30) ?? []; // APK 0..30d (eigen query)
    // F-02: rol-bewustzijn — scanner en mutatieknoppen zijn balie+ exclusief
    const { isBalie } = useRol();
    const mijnKlantId = useMijnKlantId();

    const { handleScanResultaat } = useScannerActie(voertuigen, (id) => {
        setHighlightId(id);
        setZoek(""); // reset zoekfilter zodat kaart zichtbaar is
        setTimeout(() => setHighlightId(null), 3000);
    });

    function handleGescandResultaat(kenteken: string, voertuigInfo?: ScanVoertuigData) {
        const preFill = handleScanResultaat(kenteken, voertuigInfo);
        if (preFill) {
            // Nieuw voertuig — open eerst de keuze-modal (klant koppelen of niet)
            setScanPreFill(preFill);
            setToonScanKeuze(true);
        }
        // Als preFill null is: bestaand voertuig gevonden → highlight (side-effect in hook)
    }

    /**
     * Callback vanuit ScanKlantKeuzeModal:
     * Gebruiker heeft gekozen met of zonder klant.
     * Sluit keuze-modal, opent NieuwVoertuigModal met klantId (optioneel) in preFill.
     */
    function handleKlantKeuze(keuze: ScanKlantKeuzeResult) {
        setToonScanKeuze(false);
        setScanPreFill((prev) => prev ? {
            ...prev,
            klantId: keuze.klantId,
            klantNaam: keuze.klantNaam,
        } : null);
        setToonNieuw(true);
    }

    function sluitAlleModals() {
        setToonNieuw(false);
        setToonScanKeuze(false);
        setScanPreFill(null);
    }

    const gefilterd = (voertuigen ?? []).filter((v) => {
        if (zoek.length < 2) return true;
        const t = zoek.toLowerCase();
        return v.kenteken.toLowerCase().includes(t) || v.merk.toLowerCase().includes(t) || v.model.toLowerCase().includes(t);
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

            {/* APK-banners */}
            {verlopen.length > 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-xl)", background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)" }} role="alert">
                    <span style={{ color: "var(--color-error)", flexShrink: 0, marginTop: "1px" }}><IconAlertTriangle /></span>
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--color-error-text)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-2)" }}>
                        <strong>{verlopen.length} voertuig{verlopen.length > 1 ? "en" : ""} met verlopen APK:</strong>
                        {verlopen.map((v) => (
                            <button
                                key={v._id}
                                onClick={() => setDetailVoertuig(v)}
                                style={{
                                    fontFamily: "var(--font-mono)", fontWeight: "var(--weight-bold)",
                                    fontSize: "var(--text-xs)", letterSpacing: "0.05em",
                                    color: "var(--color-error)", background: "var(--color-error-bg)",
                                    border: "1px solid var(--color-error-border)",
                                    borderRadius: "var(--radius-full)", padding: "0.15em 0.6em",
                                    cursor: "pointer", transition: "opacity 150ms",
                                    textDecoration: "underline", textDecorationStyle: "dotted",
                                }}
                                aria-label={`Open details voor ${v.kenteken}`}
                            >
                                {v.kenteken}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {bijnaVerlopen.length > 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-xl)", background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)" }} role="alert">
                    <span style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: "1px" }}><IconClock /></span>
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--color-warning-text)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-2)" }}>
                        <strong>{bijnaVerlopen.length} voertuig{bijnaVerlopen.length > 1 ? "en" : ""} met APK binnen 30 dagen:</strong>
                        {bijnaVerlopen.map((v) => (
                            <button
                                key={v._id}
                                onClick={() => setDetailVoertuig(v)}
                                style={{
                                    fontFamily: "var(--font-mono)", fontWeight: "var(--weight-bold)",
                                    fontSize: "var(--text-xs)", letterSpacing: "0.05em",
                                    color: "var(--color-warning)", background: "var(--color-warning-bg)",
                                    border: "1px solid var(--color-warning-border)",
                                    borderRadius: "var(--radius-full)", padding: "0.15em 0.6em",
                                    cursor: "pointer", transition: "opacity 150ms",
                                    textDecoration: "underline", textDecorationStyle: "dotted",
                                }}
                                aria-label={`Open details voor ${v.kenteken}`}
                            >
                                {v.kenteken}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Actiebalk — F-02: uitsluitend voor balie-rollen en hoger */}
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
                {isBalie && (
                    <button onClick={() => setToonNieuw(true)} className="btn btn-primary" style={{ minHeight: "48px", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <IconPlus /> Nieuw Voertuig
                    </button>
                )}
                <div style={{ flex: 1, maxWidth: "320px", position: "relative" }}>
                    <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", pointerEvents: "none" }}>
                        <IconSearch />
                    </span>
                    <input
                        type="search" value={zoek} onChange={(e) => setZoek(e.target.value)}
                        placeholder="Zoek op kenteken of merk…"
                        className="input" style={{ minHeight: "48px", paddingLeft: "40px" }}
                        aria-label="Voertuigen zoeken"
                    />
                </div>
                {isBalie && (
                    <ScannerSlot onGescandResultaat={handleGescandResultaat} label="Scan Kenteken" />
                )}
            </div>

            {/* Teller */}
            {voertuigen !== undefined && (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: 0 }}>
                    {gefilterd.length} van {voertuigen.length} voertuig{voertuigen.length !== 1 ? "en" : ""}
                </p>
            )}

            {/* Grid */}
            {voertuigen === undefined ? (
                <div style={{ display: "grid", gap: "var(--space-3)", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                    {Array.from({ length: 6 }).map((_, i) => <VoertuigSkeleton key={i} />)}
                </div>
            ) : (
                <div style={{ display: "grid", gap: "var(--space-3)", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                    {gefilterd.map((v) => (
                        <VoertuigKaartBalie
                            key={v._id}
                            voertuig={v}
                            onBewerk={() => setTeBewerken(v)}
                            highlighted={highlightId === v._id}
                            isEigenVoertuig={!!mijnKlantId && v.klantId === mijnKlantId}
                        />
                    ))}
                    {gefilterd.length === 0 && (
                        <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                            <span className="empty-state-icon"><IconCar /></span>
                            <p className="empty-state-title">Geen voertuigen gevonden</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            {/* Stap 1: keuze-modal na scan */}
            {toonScanKeuze && scanPreFill && (
                <ScanKlantKeuzeModal
                    preFill={scanPreFill}
                    onKeuze={handleKlantKeuze}
                    onSluit={sluitAlleModals}
                />
            )}
            {/* Stap 2: voertuig aanmaken (met of zonder klant) */}
            {toonNieuw && (
                <NieuwVoertuigModal
                    onSluit={sluitAlleModals}
                    preFill={scanPreFill
                        ? {
                            kenteken: scanPreFill.kenteken,
                            merk: scanPreFill.merk,
                            model: scanPreFill.model,
                            bouwjaar: scanPreFill.bouwjaar,
                            brandstof: scanPreFill.brandstof,
                            apkVervaldatum: scanPreFill.apkVervaldatum,
                            klantId: scanPreFill.klantId,
                            klantNaam: scanPreFill.klantNaam,
                        }
                        : undefined}
                />
            )}
            {teBewerken && <VoertuigBewerkModal voertuig={teBewerken} onSluit={() => setTeBewerken(null)} />}
            {/* APK-banner: direct naar voertuig detail */}
            {detailVoertuig && (
                <VoertuigDetailPanel
                    voertuig={detailVoertuig}
                    onSluit={() => setDetailVoertuig(null)}
                />
            )}
        </div>
    );
}
