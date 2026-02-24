/**
 * src/components/onderhoud/BalieOnderhoudView.tsx
 *
 * Balie / Receptie weergave voor Onderhoudshistorie.
 *
 * Functies:
 *   - KPI-blokken (totaal beurten, APK's, grote beurten) — gelijk aan eigenaar
 *   - Recente activiteitsfeed
 *   - Zoek voertuig op kenteken
 *   - Bekijk volledig onderhoudsdossier (GEEN verwijder — eigenaar only)
 *   - Nieuwe onderhoudsbeurt registreren (NieuweBeurtModal)
 *   - Beurten overzicht bekijken (BeurtenOverzichtModal)
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useVoertuigHistorie, useRecenteBeurtenVerrijkt } from "../../hooks/useOnderhoud";
import NieuweBeurtModal from "../modals/NieuweBeurtModal";
import BeurtenOverzichtModal from "../modals/BeurtenOverzichtModal";
import { TYPE_ICOON, formatDatum } from "./utils";
import type { TypeWerk } from "./utils";

// ---------------------------------------------------------------------------
// KPI blokken (gedeeld patroon met EigenaarOnderhoudView)
// ---------------------------------------------------------------------------

function KPIBlokken({ beurten }: { beurten: Doc<"onderhoudshistorie">[] | undefined }) {
    if (!beurten) return null;
    const nu = Date.now();
    const startMaand = new Date(nu).setDate(1);
    const apksDezeMaand = beurten.filter((b) => b.typeWerk === "APK" && b.datumUitgevoerd >= startMaand).length;
    const groteBeurten = beurten.filter((b) => b.typeWerk === "Grote Beurt").length;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "var(--space-3)" }}>
            {[
                { label: "Totaal beurten", waarde: beurten.length, icoon: "🔧" },
                { label: "APK's deze maand", waarde: apksDezeMaand, icoon: "📋" },
                { label: "Grote beurten", waarde: groteBeurten, icoon: "⚙️" },
            ].map(({ label, waarde, icoon }) => (
                <div key={label} className="card" style={{ padding: "var(--space-4)", textAlign: "center" }}>
                    <div style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-1)" }}>{icoon}</div>
                    <div style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)" }}>{waarde}</div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginTop: "2px" }}>{label}</div>
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// OnderhoudsDossier — voor één geselecteerd voertuig (read + registreren, GEEN verwijder)
// ---------------------------------------------------------------------------

function OnderhoudsDossier({
    voertuig,
    onTerug,
}: {
    voertuig: Doc<"voertuigen">;
    onTerug: () => void;
}) {
    const historie = useVoertuigHistorie(voertuig._id);
    const [toonNieuw, setToonNieuw] = useState(false);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
                <button onClick={onTerug} className="btn btn-ghost btn-sm" style={{ minHeight: "40px" }}>
                    ← Terug
                </button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)" }}>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{voertuig.kenteken}</span>
                        {" "}— {voertuig.merk} {voertuig.model}
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                        {voertuig.bouwjaar} · {voertuig.brandstof}
                        {voertuig.kilometerstand !== undefined && ` · ${voertuig.kilometerstand.toLocaleString("nl-NL")} km`}
                    </p>
                </div>
                <button onClick={() => setToonNieuw(true)} className="btn btn-primary" style={{ minHeight: "44px" }}>
                    + Beurt registreren
                </button>
            </div>

            {/* Dossier (geen verwijder-knop — eigenaar only) */}
            {historie === undefined ? (
                <p style={{ color: "var(--color-muted)" }}>⏳ Dossier laden…</p>
            ) : historie.length === 0 ? (
                <div className="card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
                    <p style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-3)" }}>📋</p>
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>
                        Nog geen onderhoudsbeurten geregistreerd voor dit voertuig.
                    </p>
                    <button onClick={() => setToonNieuw(true)} className="btn btn-primary" style={{ marginTop: "var(--space-4)", minHeight: "48px" }}>
                        + Eerste beurt toevoegen
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    {historie.map((beurt) => (
                        <div key={beurt._id} className="card" style={{ padding: "var(--space-4)" }}>
                            <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                                <span style={{ fontSize: "var(--text-2xl)", lineHeight: 1 }}>
                                    {TYPE_ICOON[beurt.typeWerk as TypeWerk] ?? "🔧"}
                                </span>
                                <div>
                                    <p style={{ margin: 0, fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", fontSize: "var(--text-sm)" }}>
                                        {beurt.typeWerk}
                                    </p>
                                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                        {formatDatum(beurt.datumUitgevoerd)} · {beurt.kmStandOnderhoud.toLocaleString("nl-NL")} km
                                    </p>
                                    {beurt.werkNotities && (
                                        <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--color-body)", fontStyle: "italic" }}>
                                            {beurt.werkNotities}
                                        </p>
                                    )}
                                    {beurt.documentUrl && (
                                        <a href={beurt.documentUrl} target="_blank" rel="noreferrer"
                                            style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-accent-text)" }}>
                                            📄 Document bekijken
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {toonNieuw && <NieuweBeurtModal voertuig={voertuig} onSluit={() => setToonNieuw(false)} />}
        </div>
    );
}

// ---------------------------------------------------------------------------
// VoertuigKiezer — zoek op kenteken
// ---------------------------------------------------------------------------

function VoertuigKiezer({ onSelecteer }: { onSelecteer: (v: Doc<"voertuigen">) => void }) {
    const [zoek, setZoek] = useState("");
    const resultaten = useQuery(
        api.voertuigen.zoekOpKenteken,
        zoek.length >= 2 ? { term: zoek } : "skip"
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div>
                <h2 className="section-title" style={{ marginBottom: "var(--space-3)" }}>
                    🔍 Voertuigdossier openen
                </h2>
                <input
                    type="search"
                    value={zoek}
                    onChange={(e) => setZoek(e.target.value)}
                    placeholder="Kenteken zoeken (min. 2 tekens)…"
                    className="input"
                    style={{ maxWidth: "320px", minHeight: "48px" }}
                    autoFocus
                />
            </div>

            {zoek.length >= 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {resultaten === undefined ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>⏳ Zoeken…</p>
                    ) : resultaten.length === 0 ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>
                            Geen voertuigen gevonden voor "{zoek}".
                        </p>
                    ) : resultaten.map((v) => (
                        <button
                            key={v._id}
                            onClick={() => onSelecteer(v)}
                            className="card card-interactive"
                            style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", width: "100%", cursor: "pointer" }}
                            aria-label={`Selecteer ${v.kenteken}`}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-base)", color: "var(--color-heading)" }}>
                                    {v.kenteken}
                                </span>
                                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", flex: 1 }}>
                                    {v.merk} {v.model} · {v.bouwjaar} · {v.brandstof}
                                </span>
                                {v.kilometerstand !== undefined && (
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                        {v.kilometerstand.toLocaleString("nl-NL")} km
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default function BalieOnderhoudView() {
    const [geselecteerd, setGeselecteerd] = useState<Doc<"voertuigen"> | null>(null);
    const [toonBeurtenModal, setToonBeurtenModal] = useState(false);
    const recenteBeurten = useRecenteBeurtenVerrijkt(20);

    if (geselecteerd) {
        return <OnderhoudsDossier voertuig={geselecteerd} onTerug={() => setGeselecteerd(null)} />;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

            {/* KPI blokken — balie heeft ook inzicht in dagelijkse aantallen */}
            {recenteBeurten !== undefined && recenteBeurten.length > 0 && (
                <section>
                    <h2 className="section-title" style={{ marginBottom: "var(--space-3)" }}>📊 Statistieken</h2>
                    <KPIBlokken beurten={recenteBeurten} />
                </section>
            )}

            {/* Beurten overzicht modal knop */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                    onClick={() => setToonBeurtenModal(true)}
                    className="btn btn-ghost btn-sm"
                    style={{ minHeight: "40px" }}
                    aria-label="Open beurten overzicht"
                >
                    🔧 Beurten overzicht
                </button>
            </div>

            {/* Voertuig zoeken */}
            <section>
                <VoertuigKiezer onSelecteer={setGeselecteerd} />
            </section>

            {/* Recente activiteitsfeed */}
            <section>
                <h2 className="section-title" style={{ marginBottom: "var(--space-3)" }}>🕐 Recente activiteit</h2>
                {recenteBeurten === undefined ? (
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Laden…</p>
                ) : recenteBeurten.length === 0 ? (
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>
                        Nog geen beurten geregistreerd.
                    </p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        {recenteBeurten.map((b) => (
                            <button
                                key={b._id}
                                onClick={() => b.voertuig && setGeselecteerd(b.voertuig as Doc<"voertuigen">)}
                                disabled={!b.voertuig}
                                className="card card-interactive"
                                style={{
                                    textAlign: "left", width: "100%", cursor: b.voertuig ? "pointer" : "default",
                                    padding: "var(--space-3) var(--space-4)",
                                    display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap",
                                }}
                                aria-label={b.voertuig ? `Open dossier ${b.voertuig.kenteken}` : b.typeWerk}
                            >
                                <span>{TYPE_ICOON[b.typeWerk as TypeWerk] ?? "🔧"}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)", display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                                        {b.typeWerk}
                                        {b.voertuig && (
                                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "0 6px" }}>
                                                {b.voertuig.kenteken}
                                            </span>
                                        )}
                                    </p>
                                    {b.voertuig && (
                                        <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                            {b.voertuig.merk} {b.voertuig.model}
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                        {formatDatum(b.datumUitgevoerd)}
                                    </span>
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                        {b.kmStandOnderhoud.toLocaleString("nl-NL")} km
                                    </span>
                                </div>
                                {b.voertuig && (
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-accent-text)", flexShrink: 0 }}>dossier →</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </section>

            {toonBeurtenModal && <BeurtenOverzichtModal onSluit={() => setToonBeurtenModal(false)} />}
        </div>
    );
}
