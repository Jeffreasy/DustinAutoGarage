/**
 * src/components/klanten/EigenaarExtras.tsx
 *
 * Eigenaar-only panelen bovenaan de klanten module:
 *   - Top-10 klanten op bezoekfrequentie (via lijstKlantenMetOmzet)
 *   - "Niet gezien in 2+ jaar" signalering
 *   - CSV-export knop
 */

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const TWEE_JAAR_MS = 2 * 365 * 24 * 60 * 60 * 1000;

function downloadCsv(rijen: Record<string, string>[], bestandsnaam: string) {
    if (rijen.length === 0) return;
    const headers = Object.keys(rijen[0]).join(";");
    const body = rijen.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([`${headers}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = bestandsnaam;
    a.click();
    URL.revokeObjectURL(url);
}

export default function EigenaarExtras() {
    const klantenMetOmzet = useQuery(api.klanten.lijstKlantenMetOmzet);
    const exportData = useQuery(api.klanten.exportKlanten);

    const nu = Date.now();
    const nietGezien = klantenMetOmzet?.filter(
        (k) => !k.laasteBezoekvDatum || nu - k.laasteBezoekvDatum > TWEE_JAAR_MS
    ) ?? [];

    const top10 = klantenMetOmzet?.slice(0, 10) ?? [];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* Header + Export knop */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", margin: 0 }}>
                    📊 Klantanalyse
                </h2>
                <button
                    onClick={() => exportData && downloadCsv(exportData as Record<string, string>[], `klanten-export-${new Date().toISOString().slice(0, 10)}.csv`)}
                    disabled={!exportData}
                    className="btn btn-ghost btn-sm"
                    style={{ minHeight: "44px" }}
                    aria-label="Klanten exporteren naar CSV"
                >
                    📥 Exporteer CSV ({exportData?.length ?? "…"} klanten)
                </button>
            </div>

            {/* Grid: Top-10 + Niet gezien */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-5)" }}>
                {/* Top-10 bezoekfrequentie */}
                <section className="card" style={{ padding: "var(--space-4)" }}>
                    <p className="card-title" style={{ marginBottom: "var(--space-4)" }}>🏆 Top 10 — Meeste bezoeken</p>
                    {klantenMetOmzet === undefined ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Laden…</p>
                    ) : top10.length === 0 ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>Nog geen bezoekdata beschikbaar.</p>
                    ) : (
                        <ol style={{ margin: 0, padding: "0 0 0 var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                            {top10.map((k, i) => (
                                <li key={k._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)", fontSize: "var(--text-sm)" }}>
                                    <span style={{ color: i < 3 ? "var(--color-accent)" : "var(--color-heading)", fontWeight: i < 3 ? "var(--weight-semibold)" : "normal" }}>
                                        {k.voornaam} {k.achternaam}
                                        {k.bedrijfsnaam && <span style={{ color: "var(--color-muted)", fontWeight: "normal" }}> ({k.bedrijfsnaam})</span>}
                                    </span>
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                                        {k.aantalBezoeken} {k.aantalBezoeken === 1 ? "bezoek" : "bezoeken"}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>

                {/* Niet gezien 2+ jaar */}
                <section className="card" style={{ padding: "var(--space-4)", borderColor: nietGezien.length > 0 ? "var(--color-warning-border, #fcd34d)" : undefined }}>
                    <p className="card-title" style={{ marginBottom: "var(--space-4)" }}>
                        ⏰ Niet gezien in 2+ jaar
                        {nietGezien.length > 0 && (
                            <span className="badge badge-warning" style={{ marginLeft: "var(--space-2)" }}>{nietGezien.length}</span>
                        )}
                    </p>
                    {klantenMetOmzet === undefined ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Laden…</p>
                    ) : nietGezien.length === 0 ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>✅ Alle klanten recent actief.</p>
                    ) : (
                        <ul style={{ margin: 0, paddingLeft: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                            {nietGezien.slice(0, 8).map((k) => (
                                <li key={k._id} style={{ fontSize: "var(--text-sm)", color: "var(--color-body)" }}>
                                    {k.voornaam} {k.achternaam}
                                    {k.laasteBezoekvDatum ? (
                                        <span style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)", marginLeft: "var(--space-2)" }}>
                                            (laatste: {new Date(k.laasteBezoekvDatum).toLocaleDateString("nl-NL")})
                                        </span>
                                    ) : (
                                        <span style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)", marginLeft: "var(--space-2)" }}>(nooit)</span>
                                    )}
                                </li>
                            ))}
                            {nietGezien.length > 8 && (
                                <li style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", listStyle: "none" }}>
                                    …en {nietGezien.length - 8} meer
                                </li>
                            )}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
