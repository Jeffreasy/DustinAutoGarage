/**
 * src/components/onderhoud/EigenaarOnderhoudView.tsx
 *
 * Eigenaar weergave voor Onderhoudshistorie.
 *
 * Functies (alles + statistieken):
 *   - Recente activiteitsfeed met statistieken (totaal beurten, APK's deze maand)
 *   - Zoek voertuig + volledig dossier met verwijder-optie
 *   - Nieuw beurt registreren
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useVoertuigHistorie, useRecenteBeurtenVerrijkt } from "../../hooks/useOnderhoud";
import BeurtenOverzichtModal from "../modals/BeurtenOverzichtModal";
import NieuweBeurtModal from "../modals/NieuweBeurtModal";

// ---------------------------------------------------------------------------
// Helpers (gedeeld via utils.ts)
// ---------------------------------------------------------------------------

import { TYPE_ICOON, formatDatum } from "./utils";
import type { TypeWerk } from "./utils";

// ---------------------------------------------------------------------------
// KPI blokken
// ---------------------------------------------------------------------------

function KPIBlokken({ beurten }: { beurten: Doc<"onderhoudshistorie">[] | undefined }) {
    if (!beurten) return null;
    const nu = Date.now();
    const startMaand = new Date(nu).setDate(1);
    const apksDezeMaand = beurten.filter((b) => b.typeWerk === "APK" && b.datumUitgevoerd >= startMaand).length;
    const groteBeurten = beurten.filter((b) => b.typeWerk === "Grote Beurt").length;

    const kpis = [
        { label: "Totaal beurten", waarde: beurten.length, icoon: "🔧" },
        { label: "APK's deze maand", waarde: apksDezeMaand, icoon: "📋" },
        { label: "Grote beurten", waarde: groteBeurten, icoon: "⚙️" },
    ];

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "var(--space-3)" }}>
            {kpis.map(({ label, waarde, icoon }) => (
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
// Dossier (met verwijder-optie voor eigenaar)
// ---------------------------------------------------------------------------

function EigenaarDossier({ voertuig, onTerug }: { voertuig: Doc<"voertuigen">; onTerug: () => void }) {
    const historie = useVoertuigHistorie(voertuig._id);
    const verwijder = useMutation(api.onderhoudshistorie.verwijder);
    const [toonNieuw, setToonNieuw] = useState(false);
    const [verwijderBezig, setVerwijderBezig] = useState<Id<"onderhoudshistorie"> | null>(null);

    async function handleVerwijder(id: Id<"onderhoudshistorie">) {
        if (!confirm("Definitief verwijderen?")) return;
        setVerwijderBezig(id);
        try { await verwijder({ historieId: id }); } finally { setVerwijderBezig(null); }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
                <button onClick={onTerug} className="btn btn-ghost btn-sm" style={{ minHeight: "40px" }}>← Terug</button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)" }}>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{voertuig.kenteken}</span>
                        {" "}&mdash; {voertuig.merk} {voertuig.model}
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

            {/* KPI boven het dossier */}
            <KPIBlokken beurten={historie} />

            {historie === undefined ? (
                <p style={{ color: "var(--color-muted)" }}>⏳ Laden…</p>
            ) : historie.length === 0 ? (
                <div className="card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
                    <p style={{ fontSize: "var(--text-2xl)" }}>📋</p>
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Geen beurten gevonden.</p>
                    <button onClick={() => setToonNieuw(true)} className="btn btn-primary" style={{ marginTop: "var(--space-4)", minHeight: "48px" }}>
                        + Eerste beurt toevoegen
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    {historie.map((beurt) => (
                        <div key={beurt._id} className="card" style={{ padding: "var(--space-4)" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
                                <div style={{ display: "flex", gap: "var(--space-3)", flex: 1 }}>
                                    <span style={{ fontSize: "var(--text-2xl)", lineHeight: 1 }}>{TYPE_ICOON[beurt.typeWerk as TypeWerk] ?? "🔧"}</span>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", fontSize: "var(--text-sm)" }}>{beurt.typeWerk}</p>
                                        <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                            {formatDatum(beurt.datumUitgevoerd)} · {beurt.kmStandOnderhoud.toLocaleString("nl-NL")} km
                                        </p>
                                        {beurt.werkNotities && (
                                            <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--color-body)", fontStyle: "italic" }}>{beurt.werkNotities}</p>
                                        )}
                                        {beurt.documentUrl && (
                                            <a href={beurt.documentUrl} target="_blank" rel="noreferrer"
                                                style={{ display: "inline-flex", gap: "4px", marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-primary)" }}>
                                                📄 Document
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => handleVerwijder(beurt._id)} disabled={verwijderBezig === beurt._id}
                                    className="btn btn-ghost btn-sm" aria-label="Verwijder"
                                    style={{ color: "var(--color-error)", minHeight: "36px", flexShrink: 0 }}>
                                    {verwijderBezig === beurt._id ? "…" : "🗑️"}
                                </button>
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
// Export
// ---------------------------------------------------------------------------

export default function EigenaarOnderhoudView() {
    const [geselecteerd, setGeselecteerd] = useState<Doc<"voertuigen"> | null>(null);
    const [zoek, setZoek] = useState("");
    const [toonBeurtenModal, setToonBeurtenModal] = useState(false);
    const resultaten = useQuery(api.voertuigen.zoekOpKenteken, zoek.length >= 2 ? { term: zoek } : "skip");
    const recenteBeurten = useRecenteBeurtenVerrijkt(20);

    if (geselecteerd) {
        return <EigenaarDossier voertuig={geselecteerd} onTerug={() => { setGeselecteerd(null); setZoek(""); }} />;
    }

    const totaalBeurten = recenteBeurten?.length ?? 0;
    const groteBeurten = recenteBeurten?.filter((b) => b.typeWerk === "Grote Beurt").length ?? 0;
    const kleineBeurten = recenteBeurten?.filter((b) => b.typeWerk === "Kleine Beurt").length ?? 0;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            {/* Statistieken overzicht */}
            <section>
                <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)" }}>
                    📊 Garage statistieken
                </h2>

                <button
                    id="beurten-overzicht-btn"
                    onClick={() => setToonBeurtenModal(true)}
                    className="btn btn-primary"
                    aria-label="Open beurten overzicht"
                    style={{
                        minHeight: "56px",
                        minWidth: "220px",
                        display: "inline-flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: "var(--space-1)",
                        padding: "var(--space-3) var(--space-5)",
                    }}
                >
                    <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-bold)" }}>
                        🔧 Beurten overzicht
                    </span>
                    {recenteBeurten !== undefined && (
                        <span style={{ fontSize: "var(--text-xs)", opacity: 0.85, fontWeight: "var(--weight-normal)" }}>
                            {totaalBeurten} totaal · {groteBeurten} groot · {kleineBeurten} klein
                        </span>
                    )}
                </button>
            </section>

            {/* Zoekbalk */}
            <section>
                <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)" }}>
                    🔍 Voertuigdossier openen
                </h2>
                <input
                    type="search" value={zoek} onChange={(e) => setZoek(e.target.value)}
                    placeholder="Kenteken zoeken (min. 2 tekens)…"
                    className="input" style={{ maxWidth: "320px", minHeight: "48px" }}
                />
                {zoek.length >= 2 && (
                    <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        {resultaten === undefined
                            ? <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>⏳ Zoeken…</p>
                            : resultaten.length === 0
                                ? <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>Niets gevonden.</p>
                                : resultaten.map((v) => (
                                    <button key={v._id} onClick={() => setGeselecteerd(v)}
                                        className="card card-interactive"
                                        style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", width: "100%", cursor: "pointer" }}>
                                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, marginRight: "var(--space-3)", color: "var(--color-heading)" }}>{v.kenteken}</span>
                                        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>{v.merk} {v.model} · {v.bouwjaar}</span>
                                    </button>
                                ))
                        }
                    </div>
                )}
            </section>

            {/* Recente activiteitsfeed — klikbaar → opent voertuigdossier */}
            {!zoek && (
                <section>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
                        <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)" }}>
                            🕐 Recente activiteit
                        </h2>
                        <a
                            href="/werkplaats"
                            style={{ fontSize: "var(--text-xs)", color: "var(--color-accent-text)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            title="Open het werkplaatsbord"
                        >
                            🔧 Werkplaatsbord →
                        </a>
                    </div>
                    {recenteBeurten === undefined ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Laden…</p>
                    ) : recenteBeurten.length === 0 ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>Nog geen beurten geregistreerd.</p>
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
                                    <span style={{ fontSize: "var(--text-lg)", lineHeight: 1 }}>{TYPE_ICOON[b.typeWerk as TypeWerk] ?? "🔧"}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
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
                                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{formatDatum(b.datumUitgevoerd)}</span>
                                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{b.kmStandOnderhoud.toLocaleString("nl-NL")} km</span>
                                    </div>
                                    {b.voertuig && (
                                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-accent-text)", flexShrink: 0 }}>dossier →</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Beurten overzicht modal */}
            {toonBeurtenModal && (
                <BeurtenOverzichtModal onSluit={() => setToonBeurtenModal(false)} />
            )}
        </div>
    );
}
