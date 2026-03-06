/**
 * src/components/onderhoud/MonteurOnderhoudView.tsx
 *
 * Monteur / Stagiair weergave voor Onderhoudshistorie.
 *
 * Functies (read-focused, geen delete):
 *   - Zoek voertuig op kenteken
 *   - Bekijk volledig onderhoudsdossier (read-only)
 *   - Snel overzicht recente beurten als niets geselecteerd
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useVoertuigHistorie, useRecenteOnderhoudsbeurten } from "../../hooks/useOnderhoud";
import { TYPE_ICOON, formatDatum } from "./utils";
import type { TypeWerk } from "./utils";

// ---------------------------------------------------------------------------
// Dossier (read-only voor monteur)
// ---------------------------------------------------------------------------

function DossierView({ voertuig, onTerug }: { voertuig: Doc<"voertuigen">; onTerug: () => void }) {
    const historie = useVoertuigHistorie(voertuig._id);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
                <button onClick={onTerug} className="btn btn-ghost btn-sm" style={{ minHeight: "40px" }}>← Terug</button>
                <div>
                    <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)" }}>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{voertuig.kenteken}</span>
                        {" "}&mdash; {voertuig.merk} {voertuig.model}
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                        {voertuig.bouwjaar} · {voertuig.brandstof}
                        {voertuig.kilometerstand !== undefined && ` · ${voertuig.kilometerstand.toLocaleString("nl-NL")} km`}
                        {voertuig.apkVervaldatum && ` · APK: ${formatDatum(voertuig.apkVervaldatum)}`}
                    </p>
                </div>
            </div>

            {historie === undefined ? (
                <p style={{ color: "var(--color-muted)" }}>Dossier laden…</p>
            ) : historie.length === 0 ? (
                <div className="card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
                    <svg viewBox="0 0 24 24" width={40} height={40} fill="none" stroke="var(--color-border)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ margin: "0 auto var(--space-3)", display: "block" }}><path d="M9 2h6l1 3H8z" /><rect x="3" y="5" width="18" height="16" rx="2" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></svg>
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Geen onderhoudsbeurten gevonden.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    {historie.map((beurt) => (
                        <div key={beurt._id} className="card" style={{ padding: "var(--space-4)" }}>
                            <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                                <span style={{
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    width: "32px", height: "32px", borderRadius: "var(--radius-xs)",
                                    background: "var(--color-accent-dim)", fontSize: "var(--text-xs)",
                                    fontWeight: "var(--weight-bold)", color: "var(--color-accent-text)",
                                    flexShrink: 0, fontFamily: "var(--font-mono)",
                                }}>
                                    {TYPE_ICOON[beurt.typeWerk as TypeWerk] ?? "OVR"}
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
                                            style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)", marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-accent-text)" }}
                                            aria-label="Document bekijken">
                                            <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                            Document
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Hoofd export
// ---------------------------------------------------------------------------

export default function MonteurOnderhoudView() {
    const [geselecteerd, setGeselecteerd] = useState<Doc<"voertuigen"> | null>(null);
    const [zoek, setZoek] = useState("");
    const resultaten = useQuery(
        api.voertuigen.zoekOpKenteken,
        zoek.length >= 2 ? { term: zoek } : "skip"
    );
    const recenteBeurten = useRecenteOnderhoudsbeurten(10);

    if (geselecteerd) {
        return <DossierView voertuig={geselecteerd} onTerug={() => { setGeselecteerd(null); setZoek(""); }} />;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            {/* Zoekbalk */}
            <div>
                <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)" }}>
                    Onderhoudsdossier opzoeken
                </h2>
                <input
                    type="search"
                    value={zoek}
                    onChange={(e) => setZoek(e.target.value)}
                    placeholder="Kenteken (min. 2 tekens)…"
                    className="input"
                    style={{ maxWidth: "320px", minHeight: "48px" }}
                />
                {zoek.length >= 2 && (
                    <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        {resultaten === undefined ? (
                            <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Zoeken…</p>
                        ) : resultaten.length === 0 ? (
                            <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>Niets gevonden.</p>
                        ) : resultaten.map((v) => (
                            <button key={v._id} onClick={() => setGeselecteerd(v)}
                                className="card card-interactive"
                                style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", width: "100%", cursor: "pointer" }}>
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--weight-bold)", marginRight: "var(--space-3)", color: "var(--color-heading)" }}>
                                    {v.kenteken}
                                </span>
                                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
                                    {v.merk} {v.model} · {v.bouwjaar}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Recente beurten (overzicht) */}
            {!zoek && (
                <div>
                    <h3 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)" }}>
                        Recente beurten
                    </h3>
                    {recenteBeurten === undefined ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Laden…</p>
                    ) : recenteBeurten.length === 0 ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>Nog geen beurten geregistreerd.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                            {recenteBeurten.map((b) => (
                                <div key={b._id} className="card" style={{ padding: "var(--space-3) var(--space-4)", display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
                                    <span style={{
                                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                                        width: "28px", height: "28px", borderRadius: "var(--radius-xs)",
                                        background: "var(--color-accent-dim)", fontSize: "var(--text-xs)",
                                        fontWeight: "var(--weight-bold)", color: "var(--color-accent-text)",
                                        flexShrink: 0, fontFamily: "var(--font-mono)",
                                    }}>{TYPE_ICOON[b.typeWerk as TypeWerk] ?? "OVR"}</span>
                                    <span style={{ fontWeight: "var(--weight-medium)", fontSize: "var(--text-sm)", color: "var(--color-heading)", flex: 1 }}>{b.typeWerk}</span>
                                    {/* voertuigId als referentie — toekomstige uitbreiding: JOIN op kenteken */}
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}>
                                        #{String(b.voertuigId).slice(-6)}
                                    </span>
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{formatDatum(b.datumUitgevoerd)}</span>
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{b.kmStandOnderhoud.toLocaleString("nl-NL")} km</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
