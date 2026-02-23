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
import { useVoertuigHistorie, useRecenteOnderhoudsbeurten } from "../../hooks/useOnderhoud";
import BeurtenOverzichtModal from "../modals/BeurtenOverzichtModal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TypeWerk =
    | "Grote Beurt" | "Kleine Beurt" | "APK" | "Reparatie"
    | "Bandenwisseling" | "Schadeherstel" | "Diagnostiek" | "Overig";

const TYPE_ICOON: Record<TypeWerk, string> = {
    "Grote Beurt": "🔧", "Kleine Beurt": "🪛", "APK": "📋",
    "Reparatie": "🔨", "Bandenwisseling": "🔄", "Schadeherstel": "🚗",
    "Diagnostiek": "🔍", "Overig": "📦",
};

const TYPE_WERK_OPTIES: TypeWerk[] = [
    "Grote Beurt", "Kleine Beurt", "APK", "Reparatie",
    "Bandenwisseling", "Schadeherstel", "Diagnostiek", "Overig",
];

function formatDatum(ms: number) {
    return new Date(ms).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const inputStyle = {
    width: "100%", padding: "var(--space-2) var(--space-3)",
    borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
    background: "var(--color-surface)", color: "var(--color-heading)",
    fontSize: "var(--text-sm)", minHeight: "44px", boxSizing: "border-box" as const,
};

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
// NieuweBeurtModal (zelfde als Balie maar ook voor eigenaar)
// ---------------------------------------------------------------------------

function NieuweBeurtModal({ voertuig, onSluit }: { voertuig: Doc<"voertuigen">; onSluit: () => void }) {
    const registreer = useMutation(api.onderhoudshistorie.registreer);
    const [form, setForm] = useState({
        typeWerk: "Kleine Beurt" as TypeWerk,
        datumUitgevoerd: new Date().toISOString().split("T")[0],
        kmStandOnderhoud: voertuig.kilometerstand?.toString() ?? "",
        werkNotities: "",
        documentUrl: "",
    });
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.kmStandOnderhoud) return;
        setBezig(true); setFout(null);
        try {
            await registreer({
                voertuigId: voertuig._id,
                typeWerk: form.typeWerk,
                datumUitgevoerd: new Date(form.datumUitgevoerd).getTime(),
                kmStandOnderhoud: parseInt(form.kmStandOnderhoud),
                werkNotities: form.werkNotities || undefined,
                documentUrl: form.documentUrl || undefined,
            });
            onSluit();
        } catch (err) {
            setFout(err instanceof Error ? err.message : "Onbekende fout");
        } finally { setBezig(false); }
    }

    return (
        <div onClick={onSluit} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "var(--space-4)" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "520px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-xl)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)" }}>+ Onderhoudsbeurt registreren</h2>
                        <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}>{voertuig.kenteken} — {voertuig.merk} {voertuig.model}</p>
                    </div>
                    <button onClick={onSluit} className="btn btn-ghost btn-sm" style={{ minHeight: "40px" }}>✕</button>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)", overflowY: "auto" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>Type werk *</label>
                        <select value={form.typeWerk} onChange={(e) => setForm((f) => ({ ...f, typeWerk: e.target.value as TypeWerk }))} style={{ ...inputStyle, cursor: "pointer" }} required>
                            {TYPE_WERK_OPTIES.map((t) => <option key={t} value={t}>{TYPE_ICOON[t]} {t}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>Datum *</label>
                            <input type="date" value={form.datumUitgevoerd} onChange={(e) => setForm((f) => ({ ...f, datumUitgevoerd: e.target.value }))} required style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>Kilometerstand *</label>
                            <input type="number" value={form.kmStandOnderhoud} onChange={(e) => setForm((f) => ({ ...f, kmStandOnderhoud: e.target.value }))} placeholder="bijv. 125000" required min={0} style={inputStyle} />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>Werknotities</label>
                        <textarea value={form.werkNotities} onChange={(e) => setForm((f) => ({ ...f, werkNotities: e.target.value }))} placeholder="Omschrijving van de uitgevoerde werkzaamheden…" rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>Factuur / Rapport URL</label>
                        <input type="url" value={form.documentUrl} onChange={(e) => setForm((f) => ({ ...f, documentUrl: e.target.value }))} placeholder="https://…" style={inputStyle} />
                    </div>
                    {fout && <div className="alert alert-error" role="alert">{fout}</div>}
                    <button type="submit" disabled={bezig} className="btn btn-primary" style={{ minHeight: "52px" }}>
                        {bezig ? "Registreren…" : "✅ Opslaan"}
                    </button>
                </form>
            </div>
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
    const recenteBeurten = useRecenteOnderhoudsbeurten(20);

    if (geselecteerd) {
        return <EigenaarDossier voertuig={geselecteerd} onTerug={() => { setGeselecteerd(null); setZoek(""); }} />;
    }

    // Bereken snel statistieken voor de badge onder de knop
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

            {/* Recente activiteitsfeed */}
            {!zoek && (
                <section>
                    <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)" }}>
                        🕐 Recente activiteit
                    </h2>
                    {recenteBeurten === undefined ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Laden…</p>
                    ) : recenteBeurten.length === 0 ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>Nog geen beurten geregistreerd.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                            {recenteBeurten.map((b) => (
                                <div key={b._id} className="card" style={{ padding: "var(--space-3) var(--space-4)", display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                                    <span>{TYPE_ICOON[b.typeWerk as TypeWerk] ?? "🔧"}</span>
                                    <span style={{ fontWeight: "var(--weight-medium)", fontSize: "var(--text-sm)", color: "var(--color-heading)", flex: 1 }}>{b.typeWerk}</span>
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{formatDatum(b.datumUitgevoerd)}</span>
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{b.kmStandOnderhoud.toLocaleString("nl-NL")} km</span>
                                </div>
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
