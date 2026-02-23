/**
 * src/components/VoertuigenDashboard.tsx
 *
 * React Island — toont de lijst met voertuigen en APK-meldingen.
 * Wordt gemount binnen LaventeConvexProvider (die de Convex auth regelt).
 *
 * Data-logica is volledig gedelegeerd aan custom hooks:
 *   useVoertuigenLijst()      → src/hooks/useVoertuigen.ts
 *   useApkWaarschuwingen()    → src/hooks/useVoertuigen.ts
 *
 * Role-gating via Split-Role strategie:
 *   useRol() → bepaalt client-side welke acties zichtbaar zijn.
 *
 * Rol-matrix voor actieknoppen:
 *   stagair      → READ only, geen knoppen
 *   monteur      → READ only, geen knoppen
 *   balie        → + Voertuig toevoegen, + Klant toevoegen
 *   eigenaar     → + Voertuig toevoegen, + Klant toevoegen, ↓ Exporteer
 *
 * Design System: alle waarden bouwen op design-tokens.css.
 * Gebruik uitsluitend var(--token) voor stijlen — geen hardcoded waarden.
 */

import { useState } from "react";
import { useVoertuigenLijst, useApkWaarschuwingen } from "../hooks/useVoertuigen";
import { useRol } from "../hooks/useRol";
import NieuwVoertuigModal from "./modals/NieuwVoertuigModal";
import NieuweKlantModal from "./modals/NieuweKlantModal";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatDatum(ms: number): string {
    return new Date(ms).toLocaleDateString("nl-NL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VoertuigenDashboard() {
    const voertuigen = useVoertuigenLijst();
    const apkWaarschuwingen = useApkWaarschuwingen(30);
    const { isBalie, isEigenaar, domeinRol, isLoading: rolLaden } = useRol();

    // Modal state
    const [toonVoertuigModal, setToonVoertuigModal] = useState(false);
    const [toonKlantModal, setToonKlantModal] = useState(false);

    // ── Loading state ─────────────────────────────────────────────────────
    if (voertuigen === undefined || apkWaarschuwingen === undefined) {
        return (
            <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-muted)" }}>
                <p>Voertuigendata laden…</p>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>

            {/* Domein-rol banner voor niet-gekoppelde gebruikers */}
            {!rolLaden && !domeinRol && (
                <div
                    role="status"
                    style={{
                        padding: "var(--space-3) var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        background: "var(--color-warning-bg, #fffbeb)",
                        border: "1px solid var(--color-warning-border, #fcd34d)",
                        color: "var(--color-warning, #92400e)",
                        fontSize: "var(--text-sm)",
                    }}
                >
                    ⚠️ Je bent nog niet gekoppeld als garage-medewerker. Vraag de eigenaar om je toe te voegen via{" "}
                    <a href="/medewerkers" style={{ textDecoration: "underline" }}>Medewerkers</a>.
                </div>
            )}

            {/* ── Snelacties: alleen voor balie-rol en hoger ── */}
            {isBalie && (
                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
                    {/* + Voertuig toevoegen */}
                    <button
                        className="btn btn-primary btn-sm"
                        id="voertuig-toevoegen-btn"
                        aria-label="Voertuig toevoegen"
                        onClick={() => setToonVoertuigModal(true)}
                    >
                        + Voertuig toevoegen
                    </button>

                    {/* + Klant toevoegen */}
                    <button
                        className="btn btn-ghost btn-sm"
                        id="klant-toevoegen-btn"
                        aria-label="Klant toevoegen"
                        onClick={() => setToonKlantModal(true)}
                    >
                        + Klant toevoegen
                    </button>

                    {/* Exporteer — alleen eigenaar */}
                    {isEigenaar && (
                        <button
                            className="btn btn-ghost btn-sm"
                            id="exporteer-btn"
                            aria-label="Exporteer klantdata als CSV"
                            onClick={handleExporteer}
                        >
                            ↓ Exporteer klantdata
                        </button>
                    )}
                </div>
            )}

            {/* APK Waarschuwingen */}
            {apkWaarschuwingen.length > 0 && (
                <section>
                    <h2 style={{
                        fontSize: "var(--text-base)",
                        fontWeight: "var(--weight-semibold)",
                        marginBottom: "var(--space-3)",
                        color: "var(--color-error)",
                    }}>
                        ⚠️ APK verloopt binnenkort ({apkWaarschuwingen.length})
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        {apkWaarschuwingen.map((v) => (
                            <div
                                key={v._id}
                                style={{
                                    padding: "var(--space-3) var(--space-4)",
                                    borderRadius: "var(--radius-md)",
                                    background: "var(--color-error-bg)",
                                    border: "1px solid var(--color-error-border)",
                                    color: "var(--color-error)",
                                    fontSize: "var(--text-sm)",
                                }}
                            >
                                <strong>{v.kenteken}</strong> — {v.merk} {v.model}{" "}
                                | APK verloopt: {v.apkVervaldatum ? formatDatum(v.apkVervaldatum) : "onbekend"}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Voertuigenlijst */}
            <section>
                <h2 style={{
                    fontSize: "var(--text-base)",
                    fontWeight: "var(--weight-semibold)",
                    marginBottom: "var(--space-3)",
                    color: "var(--color-heading)",
                }}>
                    Voertuigen ({voertuigen.length})
                </h2>

                {voertuigen.length === 0 ? (
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>
                        Nog geen voertuigen geregistreerd.
                    </p>
                ) : (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                            gap: "var(--space-4)",
                        }}
                    >
                        {voertuigen.map((v) => (
                            <div
                                key={v._id}
                                style={{
                                    padding: "var(--space-5)",
                                    borderRadius: "var(--radius-xl)",
                                    background: "var(--glass-bg)",
                                    backdropFilter: "blur(12px)",
                                    WebkitBackdropFilter: "blur(12px)",
                                    border: "1px solid var(--glass-border)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "var(--space-2)",
                                    boxShadow: "var(--glass-shadow)",
                                    transition: "border-color var(--transition-base), box-shadow var(--transition-base), background var(--transition-base)",
                                    cursor: "default",
                                    position: "relative",
                                    overflow: "hidden",
                                }}
                                onMouseEnter={e => {
                                    const el = e.currentTarget as HTMLDivElement;
                                    el.style.borderColor = "var(--color-border-luminous)";
                                    el.style.boxShadow = "var(--shadow-accent)";
                                    el.style.background = "var(--glass-bg-strong)";
                                }}
                                onMouseLeave={e => {
                                    const el = e.currentTarget as HTMLDivElement;
                                    el.style.borderColor = "var(--glass-border)";
                                    el.style.boxShadow = "var(--glass-shadow)";
                                    el.style.background = "var(--glass-bg)";
                                }}
                            >
                                {/* Kenteken badge */}
                                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                    <span
                                        style={{
                                            fontFamily: "var(--font-mono)",
                                            fontWeight: "var(--weight-bold)",
                                            fontSize: "var(--text-sm)",
                                            color: "var(--color-heading)",
                                            background: "var(--gradient-accent-subtle)",
                                            border: "1px solid var(--color-border-luminous)",
                                            borderRadius: "var(--radius-md)",
                                            padding: "0.2em 0.6em",
                                            letterSpacing: "var(--tracking-wider)",
                                        }}
                                    >
                                        {v.kenteken}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "var(--text-xs)",
                                            color: "var(--color-muted)",
                                            background: "var(--color-surface)",
                                            padding: "0.15em 0.5em",
                                            borderRadius: "var(--radius-md)",
                                            border: "1px solid var(--color-border)",
                                        }}
                                    >
                                        {v.brandstof}
                                    </span>
                                </div>

                                {/* Voertuiginfo */}
                                <p style={{ color: "var(--color-heading)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-base)" }}>
                                    {v.merk} {v.model}
                                </p>
                                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)" }}>
                                    Bouwjaar: {v.bouwjaar}
                                    {v.kilometerstand !== undefined && ` · ${v.kilometerstand.toLocaleString("nl-NL")} km`}
                                </p>

                                {/* APK datum */}
                                {v.apkVervaldatum && (
                                    <p style={{ fontSize: "var(--text-xs)", color: "var(--color-body)" }}>
                                        APK: {formatDatum(v.apkVervaldatum)}
                                    </p>
                                )}

                                {/* Notities */}
                                {v.voertuigNotities && (
                                    <p
                                        style={{
                                            fontSize: "var(--text-xs)",
                                            color: "var(--color-muted)",
                                            fontStyle: "italic",
                                            borderTop: "1px solid var(--color-border)",
                                            paddingTop: "var(--space-2)",
                                            marginTop: "var(--space-1)",
                                        }}
                                    >
                                        {v.voertuigNotities}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── Modals ── */}
            {toonVoertuigModal && (
                <NieuwVoertuigModal onSluit={() => setToonVoertuigModal(false)} />
            )}
            {toonKlantModal && (
                <NieuweKlantModal onSluit={() => setToonKlantModal(false)} />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Exporteer handler (eigenaar only)
// ---------------------------------------------------------------------------

function handleExporteer() {
    // Exporteer is nog niet geïmplementeerd in de backend.
    // Toon een professionele melding tot de export-API beschikbaar is.
    alert("Export-functionaliteit wordt binnenkort beschikbaar gesteld.");
}
