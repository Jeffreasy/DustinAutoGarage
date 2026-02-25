/**
 * src/components/voertuigen/MonteurVoertuigenView.tsx
 *
 * Monteur / Stagiair: lees-only wagenpark.
 * ui-ux-pro-max: SVG search icon, glassmorphism card, APK badge, skeleton grid.
 */

import { useState } from "react";
import { useVoertuigenLijst } from "../../hooks/useVoertuigen";
import ScannerSlot from "./scanner/ScannerSlot";
import type { Doc } from "../../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// APK helpers
// ---------------------------------------------------------------------------

function apkKleur(apkMs: number | undefined) {
    if (!apkMs) return { color: "var(--color-muted)", bg: "transparent", border: "transparent" };
    const nu = Date.now();
    if (apkMs < nu) return { color: "var(--color-error)", bg: "var(--color-error-bg)", border: "var(--color-error-border)" };
    if (apkMs < nu + 30 * 864e5) return { color: "var(--color-warning)", bg: "var(--color-warning-bg)", border: "var(--color-warning-border)" };
    return { color: "var(--color-success)", bg: "var(--color-success-bg)", border: "var(--color-success-border)" };
}

function apkLabel(apkMs: number | undefined): string {
    if (!apkMs) return "APK onbekend";
    const nu = Date.now();
    const datum = new Date(apkMs).toLocaleDateString("nl-NL");
    if (apkMs < nu) return `Verlopen: ${datum}`;
    return `APK: ${datum}`;
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

function IconCar() {
    return (
        <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2" />
            <circle cx="9" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function VoertuigSkeleton() {
    return (
        <div aria-hidden="true" style={{ borderRadius: "var(--radius-xl)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ width: "55%", height: "28px", borderRadius: "var(--radius-md)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ width: "75%", height: "14px", borderRadius: "var(--radius-md)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ width: "40%", height: "20px", borderRadius: "9999px", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// VoertuigKaartMonteur
// ---------------------------------------------------------------------------

function VoertuigKaartMonteur({ voertuig }: { voertuig: Doc<"voertuigen"> }) {
    const apk = apkKleur(voertuig.apkVervaldatum);

    return (
        <div style={{
            borderRadius: "var(--radius-xl)",
            background: "var(--glass-bg)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-shadow)",
            padding: "var(--space-4)",
            display: "flex", flexDirection: "column", gap: "var(--space-3)",
        }}>
            {/* Kenteken */}
            <div style={{
                fontFamily: "var(--font-mono)", fontWeight: "var(--weight-black)",
                fontSize: "var(--text-2xl)", color: "var(--color-heading)",
                letterSpacing: "0.08em", lineHeight: 1,
            }}>
                {voertuig.kenteken}
            </div>

            {/* Merk / model / jaar / brandstof */}
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-body)", margin: 0 }}>
                {voertuig.merk} {voertuig.model}
                <span style={{ color: "var(--color-muted)" }}> · {voertuig.bouwjaar} · {voertuig.brandstof === "EV" ? "Elektrisch" : voertuig.brandstof}</span>
            </p>

            {voertuig.kilometerstand && (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: 0 }}>
                    {voertuig.kilometerstand.toLocaleString("nl-NL")} km
                </p>
            )}

            {/* APK badge */}
            <span style={{
                display: "inline-flex", alignSelf: "flex-start",
                fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                color: apk.color, background: apk.bg, border: `1px solid ${apk.border}`,
                borderRadius: "var(--radius-full)", padding: "0.2em 0.65em",
            }}>
                {apkLabel(voertuig.apkVervaldatum)}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// MonteurVoertuigenView
// ---------------------------------------------------------------------------

export default function MonteurVoertuigenView() {
    const [zoek, setZoek] = useState("");
    const voertuigen = useVoertuigenLijst();

    const gefilterd = (voertuigen ?? []).filter((v) => {
        if (zoek.length < 2) return true;
        const t = zoek.toLowerCase();
        return v.kenteken.toLowerCase().includes(t) || v.merk.toLowerCase().includes(t) || v.model.toLowerCase().includes(t);
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

            {/* Zoekbalk met SVG prefix + scanner slot */}
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, maxWidth: "360px", position: "relative" }}>
                    <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", pointerEvents: "none" }}>
                        <IconSearch />
                    </span>
                    <input
                        type="search" value={zoek} onChange={(e) => setZoek(e.target.value)}
                        placeholder="Zoek op kenteken of merk…"
                        aria-label="Voertuigen zoeken"
                        className="input"
                        style={{ minHeight: "48px", paddingLeft: "40px" }}
                    />
                </div>
                <ScannerSlot />
            </div>

            {/* Grid */}
            {voertuigen === undefined ? (
                <div style={{ display: "grid", gap: "var(--space-3)", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                    {Array.from({ length: 6 }).map((_, i) => <VoertuigSkeleton key={i} />)}
                </div>
            ) : gefilterd.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-state-icon"><IconCar /></span>
                    <p className="empty-state-title">Geen voertuigen gevonden</p>
                </div>
            ) : (
                <div style={{ display: "grid", gap: "var(--space-3)", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                    {gefilterd.map((v) => <VoertuigKaartMonteur key={v._id} voertuig={v} />)}
                </div>
            )}
        </div>
    );
}
