/**
 * src/components/voertuigen/BalieVoertuigenView.tsx
 *
 * Balie / Receptie weergave: volledig CRUD voor het wagenpark.
 *
 * Functionaliteiten:
 *   - Zoekbalk + Scanner slot
 *   - [+ Nieuw Voertuig] knop — opent NieuwVoertuigModal (gedeeld)
 *   - Voertuigkaarten — ✏️ opent VoertuigBewerkModal (nieuw)
 *   - APK-waarschuwingen bovenaan (30 dagen)
 *   - Km-stand bijwerken inline
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useVoertuigenLijst, useApkWaarschuwingen } from "../../hooks/useVoertuigen";
import ScannerSlot from "./scanner/ScannerSlot";
import NieuwVoertuigModal from "../modals/NieuwVoertuigModal";
import VoertuigBewerkModal from "../modals/VoertuigBewerkModal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function apkKleur(ms: number | undefined) {
    if (!ms) return "var(--color-muted)";
    const nu = Date.now();
    if (ms < nu) return "var(--color-error, #dc2626)";
    if (ms < nu + 30 * 86400000) return "var(--color-warning, #d97706)";
    return "var(--color-success, #16a34a)";
}

const inputStyle: React.CSSProperties = {
    width: "100%", padding: "var(--space-2) var(--space-3)",
    borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
    background: "var(--color-surface)", color: "var(--color-heading)",
    fontSize: "var(--text-sm)", minHeight: "44px", boxSizing: "border-box",
};

// ---------------------------------------------------------------------------
// Voertuigkaart (balie versie — met km-update inline + bewerken modal)
// ---------------------------------------------------------------------------

function VoertuigKaartBalie({ voertuig, onBewerk }: { voertuig: Doc<"voertuigen">; onBewerk: () => void }) {
    const updateKm = useMutation(api.voertuigen.updateKilometerstand);
    const [km, setKm] = useState(String(voertuig.kilometerstand ?? ""));
    const [bezig, setBezig] = useState(false);

    async function handleKmUpdate() {
        if (!km || Number(km) === voertuig.kilometerstand) return;
        setBezig(true);
        try { await updateKm({ voertuigId: voertuig._id, nieuweKilometerstand: Number(km) }); }
        finally { setBezig(false); }
    }

    return (
        <div className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 900, fontSize: "var(--text-xl)", color: "var(--color-heading)", letterSpacing: "0.06em" }}>
                    {voertuig.kenteken}
                </span>
                <button onClick={onBewerk} className="btn btn-ghost btn-sm" style={{ minHeight: "36px" }} aria-label={`Bewerk ${voertuig.kenteken}`}>
                    ✏️
                </button>
            </div>

            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-body)", margin: 0 }}>
                {voertuig.merk} {voertuig.model} · {voertuig.bouwjaar} · {voertuig.brandstof}
            </p>

            <p style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: apkKleur(voertuig.apkVervaldatum), margin: 0 }}>
                {voertuig.apkVervaldatum
                    ? `APK: ${new Date(voertuig.apkVervaldatum).toLocaleDateString("nl-NL")}`
                    : "APK onbekend"}
            </p>

            {/* Km inline update */}
            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                <input
                    type="number"
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    placeholder="km-stand"
                    aria-label="Kilometerstand bijwerken"
                    style={{ ...inputStyle, minHeight: "36px", fontSize: "var(--text-xs)", flex: 1 }}
                    onBlur={handleKmUpdate}
                    onKeyDown={(e) => e.key === "Enter" && handleKmUpdate()}
                />
                {bezig && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>…</span>}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// BalieVoertuigenView — hoofd-export
// ---------------------------------------------------------------------------

export default function BalieVoertuigenView() {
    const [zoek, setZoek] = useState("");
    const [toonNieuw, setToonNieuw] = useState(false);
    const [teBewerken, setTeBewerken] = useState<Doc<"voertuigen"> | null>(null);

    const voertuigen = useVoertuigenLijst();
    const apkWaarschuwingen = useApkWaarschuwingen(30);

    const gefilterd = (voertuigen ?? []).filter((v) => {
        if (zoek.length < 2) return true;
        const t = zoek.toLowerCase();
        return v.kenteken.toLowerCase().includes(t) || v.merk.toLowerCase().includes(t) || v.model.toLowerCase().includes(t);
    });

    const verlopen = (apkWaarschuwingen ?? []).filter((v) => v.apkVervaldatum && v.apkVervaldatum < Date.now());
    const bijnaVerlopen = (apkWaarschuwingen ?? []).filter((v) => v.apkVervaldatum && v.apkVervaldatum >= Date.now());

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* APK-waarschuwingen */}
            {verlopen.length > 0 && (
                <div className="alert alert-error" role="alert">
                    ⚠️ <strong>{verlopen.length} voertuig{verlopen.length > 1 ? "en" : ""} met verlopen APK:</strong>
                    {" "}{verlopen.map((v) => v.kenteken).join(" · ")}
                </div>
            )}
            {bijnaVerlopen.length > 0 && (
                <div className="alert alert-warning" role="alert">
                    ⏰ <strong>{bijnaVerlopen.length} voertuig{bijnaVerlopen.length > 1 ? "en" : ""} met APK binnen 30 dagen:</strong>
                    {" "}{bijnaVerlopen.map((v) => v.kenteken).join(" · ")}
                </div>
            )}

            {/* Actiebalk */}
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => setToonNieuw(true)} className="btn btn-primary" style={{ minHeight: "48px" }}>
                    + Nieuw Voertuig
                </button>
                <div style={{ flex: 1, maxWidth: "320px" }}>
                    <input
                        type="search" value={zoek} onChange={(e) => setZoek(e.target.value)}
                        placeholder="Zoek op kenteken of merk…"
                        className="input" style={{ minHeight: "48px" }}
                        aria-label="Voertuigen zoeken"
                    />
                </div>
                <ScannerSlot onKenteken={(k) => setZoek(k)} label="Scan Kenteken" />
            </div>

            {/* Teller */}
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: 0 }}>{gefilterd.length} voertuig(en)</p>

            {/* Grid */}
            {voertuigen === undefined ? (
                <p style={{ color: "var(--color-muted)" }}>⏳ Laden…</p>
            ) : (
                <div style={{ display: "grid", gap: "var(--space-3)", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                    {gefilterd.map((v) => (
                        <VoertuigKaartBalie key={v._id} voertuig={v} onBewerk={() => setTeBewerken(v)} />
                    ))}
                    {gefilterd.length === 0 && (
                        <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                            <span className="empty-state-icon">🚗</span>
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
