/**
 * src/components/voertuigen/MonteurVoertuigenView.tsx
 *
 * Monteur / Stagiair weergave: lees-only wagenpark.
 * - Zoekbalk op kenteken of merk/model
 * - Voertuigkaart: groot kenteken · merk/model · bouwjaar · brandstof
 * - APK-datum in kleur (rood=verlopen, oranje=<30d, groen=ok)
 * - Geen CRUD, geen financiële info
 */

import { useState } from "react";
import { useVoertuigenLijst } from "../../hooks/useVoertuigen";
import ScannerSlot from "./scanner/ScannerSlot";
import type { Doc } from "../../../convex/_generated/dataModel";

function apkKleur(apkMs: number | undefined): string {
    if (!apkMs) return "var(--color-muted)";
    const nu = Date.now();
    const dagMs = 24 * 60 * 60 * 1000;
    if (apkMs < nu) return "var(--color-error, #dc2626)";
    if (apkMs < nu + 30 * dagMs) return "var(--color-warning, #d97706)";
    return "var(--color-success, #16a34a)";
}

function apkLabel(apkMs: number | undefined): string {
    if (!apkMs) return "APK onbekend";
    const nu = Date.now();
    if (apkMs < nu) return `⚠️ Verlopen: ${new Date(apkMs).toLocaleDateString("nl-NL")}`;
    return `APK: ${new Date(apkMs).toLocaleDateString("nl-NL")}`;
}

function VoertuigKaartMonteur({ voertuig }: { voertuig: Doc<"voertuigen"> }) {
    return (
        <div className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {/* Groot kenteken */}
            <div style={{
                fontFamily: "var(--font-mono)", fontWeight: 900,
                fontSize: "var(--text-2xl)", color: "var(--color-heading)",
                letterSpacing: "0.08em", lineHeight: 1,
            }}>
                {voertuig.kenteken}
            </div>

            {/* Merk/model/jaar */}
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-body)", margin: 0 }}>
                {voertuig.merk} {voertuig.model} · {voertuig.bouwjaar} · {voertuig.brandstof === "EV" ? "Elektrisch" : voertuig.brandstof}
                {voertuig.kilometerstand && (
                    <span style={{ color: "var(--color-muted)" }}>
                        {" · "}{voertuig.kilometerstand.toLocaleString("nl-NL")} km
                    </span>
                )}
            </p>

            {/* APK */}
            <p style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: apkKleur(voertuig.apkVervaldatum), margin: 0 }}>
                {apkLabel(voertuig.apkVervaldatum)}
            </p>
        </div>
    );
}

export default function MonteurVoertuigenView() {
    const [zoek, setZoek] = useState("");
    const voertuigen = useVoertuigenLijst();

    const gefilterd = (voertuigen ?? []).filter((v) => {
        if (zoek.length < 2) return true;
        const t = zoek.toLowerCase();
        return (
            v.kenteken.toLowerCase().includes(t) ||
            v.merk.toLowerCase().includes(t) ||
            v.model.toLowerCase().includes(t)
        );
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* Zoekbalk + scanner slot */}
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, maxWidth: "360px" }}>
                    <input
                        type="search"
                        value={zoek}
                        onChange={(e) => setZoek(e.target.value)}
                        placeholder="Zoek op kenteken of merk…"
                        aria-label="Voertuigen zoeken"
                        className="input"
                        style={{ minHeight: "48px" }}
                    />
                </div>
                <ScannerSlot />
            </div>

            {/* Grid */}
            {voertuigen === undefined ? (
                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>⏳ Laden…</p>
            ) : gefilterd.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-state-icon">🚗</span>
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
