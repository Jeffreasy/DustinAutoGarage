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
import { useVoertuigenLijst, useApkWaarschuwingen, useVerlopenApk } from "../../hooks/useVoertuigen";
import ScannerSlot from "./scanner/ScannerSlot";
import NieuwVoertuigModal from "../modals/NieuwVoertuigModal";
import VoertuigBewerkModal from "../modals/VoertuigBewerkModal";

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

function VoertuigKaartBalie({ voertuig, onBewerk }: { voertuig: Doc<"voertuigen">; onBewerk: () => void }) {
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
        <div style={{
            borderRadius: "var(--radius-xl)",
            background: "var(--glass-bg)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-shadow)",
            display: "flex", flexDirection: "column", gap: "var(--space-3)",
            overflow: "hidden",
        }}>
            {/* Kaart header */}
            <div style={{ padding: "var(--space-4) var(--space-4) 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--weight-black)", fontSize: "var(--text-xl)", color: "var(--color-heading)", letterSpacing: "0.06em" }}>
                    {voertuig.kenteken}
                </span>
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
                            background: "var(--color-surface-2, var(--color-surface))",
                            color: "var(--color-heading)", fontSize: "var(--text-xs)",
                            minHeight: "34px", boxSizing: "border-box",
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

    const voertuigen = useVoertuigenLijst();
    const verlopen = useVerlopenApk() ?? [];         // APK < nu (eigen query)
    const bijnaVerlopen = useApkWaarschuwingen(30) ?? []; // APK 0..30d (eigen query)

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
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--color-error-text)" }}>
                        <strong>{verlopen.length} voertuig{verlopen.length > 1 ? "en" : ""} met verlopen APK:</strong>
                        {" "}{verlopen.map((v) => v.kenteken).join(" · ")}
                    </div>
                </div>
            )}
            {bijnaVerlopen.length > 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-xl)", background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)" }} role="alert">
                    <span style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: "1px" }}><IconClock /></span>
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--color-warning-text)" }}>
                        <strong>{bijnaVerlopen.length} voertuig{bijnaVerlopen.length > 1 ? "en" : ""} met APK binnen 30 dagen:</strong>
                        {" "}{bijnaVerlopen.map((v) => v.kenteken).join(" · ")}
                    </div>
                </div>
            )}

            {/* Actiebalk */}
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => setToonNieuw(true)} className="btn btn-primary" style={{ minHeight: "48px", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <IconPlus /> Nieuw Voertuig
                </button>
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
                <ScannerSlot onKenteken={(k) => setZoek(k)} label="Scan Kenteken" />
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
                        <VoertuigKaartBalie key={v._id} voertuig={v} onBewerk={() => setTeBewerken(v)} />
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
            {toonNieuw && <NieuwVoertuigModal onSluit={() => setToonNieuw(false)} />}
            {teBewerken && <VoertuigBewerkModal voertuig={teBewerken} onSluit={() => setTeBewerken(null)} />}
        </div>
    );
}
