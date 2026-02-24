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
                <p style={{ color: "var(--color-muted)" }}>⏳ Dossier laden…</p>
            ) : historie.length === 0 ? (
                <div className="card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
                    <p style={{ fontSize: "var(--text-2xl)" }}>📋</p>
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Geen onderhoudsbeurten gevonden.</p>
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
                                            style={{ display: "inline-flex", gap: "4px", marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-primary)" }}>
                                            📄 Document
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
                    🔍 Onderhoudsdossier opzoeken
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
                            <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>⏳ Zoeken…</p>
                        ) : resultaten.length === 0 ? (
                            <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>Niets gevonden.</p>
                        ) : resultaten.map((v) => (
                            <button key={v._id} onClick={() => setGeselecteerd(v)}
                                className="card card-interactive"
                                style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", width: "100%", cursor: "pointer" }}>
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, marginRight: "var(--space-3)", color: "var(--color-heading)" }}>
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
                        🕐 Recente beurten
                    </h3>
                    {recenteBeurten === undefined ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Laden…</p>
                    ) : recenteBeurten.length === 0 ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>Nog geen beurten geregistreerd.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                            {recenteBeurten.map((b) => (
                                <div key={b._id} className="card" style={{ padding: "var(--space-3) var(--space-4)", display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
                                    <span>{TYPE_ICOON[b.typeWerk as TypeWerk] ?? "🔧"}</span>
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
