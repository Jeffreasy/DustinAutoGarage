/**
 * src/components/werkplaats/BalieWerkplaatsView.tsx
 *
 * Balie / Receptie weergave voor de Werkplaats.
 *
 * Layout (boven → onder):
 *   1. Planningsagenda — vandaag + komende 7 dagen, gegroepeerd per dag
 *   2. Het volledige Kanban-bord (live statusoverzicht)
 *
 * De balie plant en coördineert — de agenda is hun primaire tool.
 * Het bord eronder geeft real-time inzicht in de voortgang.
 */

import { useState } from "react";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import WerkplaatsBord from "../WerkplaatsBord";
import NieuweWerkorderModal from "../NieuweWerkorderModal";

// Dag-labels NL
const DAGNAMEN = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const MAANDNAMEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function formatDag(ms: number): string {
    const d = new Date(ms);
    const nu = new Date();
    const isVandaag = d.toDateString() === nu.toDateString();
    const isMorgen = d.toDateString() === new Date(nu.getTime() + 86400000).toDateString();
    if (isVandaag) return "Vandaag";
    if (isMorgen) return "Morgen";
    return `${DAGNAMEN[d.getDay()]} ${d.getDate()} ${MAANDNAMEN[d.getMonth()]}`;
}

function statusKleur(status: string): string {
    switch (status) {
        case "Gepland": return "#8b5cf6";
        case "Aanwezig": return "#0891b2";
        case "Wachtend": return "var(--color-muted)";
        case "Bezig": return "var(--color-primary)";
        case "Wacht op onderdelen": return "var(--color-warning, #d97706)";
        case "Klaar": return "var(--color-success, #16a34a)";
        case "Afgerond": return "#15803d";
        case "Geannuleerd": return "var(--color-error, #dc2626)";
        default: return "var(--color-muted)";
    }
}

function PlanningsAgenda() {
    const [toonNieuw, setToonNieuw] = useState(false);
    const nu = Date.now();
    const beginVandaag = nu - (nu % 86400000);

    const planning = useQuery(api.werkorders.lijstPlanningVoorBalie, {
        vanafMs: beginVandaag,
        totMs: beginVandaag + 8 * 24 * 60 * 60 * 1000,
    });

    // Groepeer op afspraakDatum per dag (afgerond op dag)
    const gegroepeerd = new Map<string, typeof planning>();
    if (planning) {
        for (const order of planning) {
            const dagKey = new Date(order.afspraakDatum).toDateString();
            if (!gegroepeerd.has(dagKey)) gegroepeerd.set(dagKey, []);
            gegroepeerd.get(dagKey)!.push(order);
        }
    }

    const dagEntries = Array.from(gegroepeerd.entries());

    return (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
                <div>
                    <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", margin: 0 }}>
                        📅 Planning — komende week
                    </h2>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: "2px 0 0" }}>
                        {planning?.length ?? "…"} werkorder(s) ingepland
                    </p>
                </div>
                <button onClick={() => setToonNieuw(true)} className="btn btn-primary" style={{ minHeight: "48px" }}>
                    + Nieuwe Werkorder
                </button>
            </div>

            {/* Agenda */}
            {!planning ? (
                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>⏳ Agenda laden…</p>
            ) : dagEntries.length === 0 ? (
                <div className="card" style={{ padding: "var(--space-6)", textAlign: "center" }}>
                    <p style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-2)" }}>🗓️</p>
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>
                        Geen werkorders ingepland voor de komende week.
                    </p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                    {dagEntries.map(([dagKey, orders]) => {
                        const eersteDatum = orders![0].afspraakDatum;
                        const isVandaag = new Date(eersteDatum).toDateString() === new Date().toDateString();
                        return (
                            <div key={dagKey}>
                                {/* Dag-label */}
                                <div style={{
                                    display: "inline-flex", alignItems: "center", gap: "var(--space-2)",
                                    marginBottom: "var(--space-2)",
                                }}>
                                    <span style={{
                                        fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)",
                                        color: isVandaag ? "var(--color-primary)" : "var(--color-heading)",
                                        borderBottom: isVandaag ? "2px solid var(--color-primary)" : "none",
                                        paddingBottom: "1px",
                                    }}>
                                        {formatDag(eersteDatum)}
                                    </span>
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                        ({orders!.length})
                                    </span>
                                </div>

                                {/* Rijen */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                                    {orders!.map((order) => (
                                        <div key={order._id} className="card" style={{
                                            padding: "var(--space-3) var(--space-4)",
                                            display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap",
                                        }}>
                                            {/* Kenteken */}
                                            <span style={{
                                                fontFamily: "var(--font-mono)", fontWeight: 700,
                                                fontSize: "var(--text-base)", color: "var(--color-heading)",
                                                minWidth: "80px",
                                            }}>
                                                {order.voertuig?.kenteken ?? "–"}
                                            </span>

                                            {/* Klant */}
                                            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-body)", flex: 1 }}>
                                                {order.klant
                                                    ? `${order.klant.voornaam} ${order.klant.achternaam}`
                                                    : "Onbekende klant"}
                                            </span>

                                            {/* Klacht */}
                                            <span style={{
                                                fontSize: "var(--text-xs)", color: "var(--color-muted)",
                                                flex: 2, fontStyle: "italic", overflow: "hidden",
                                                whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "240px",
                                            }}>
                                                {order.klacht}
                                            </span>

                                            {/* Status badge */}
                                            <span style={{
                                                fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                                                color: statusKleur(order.status), whiteSpace: "nowrap",
                                            }}>
                                                {order.status}
                                            </span>

                                            {/* Bellen */}
                                            {order.klant?.telefoonnummer && (
                                                <a
                                                    href={`tel:${order.klant.telefoonnummer}`}
                                                    style={{
                                                        fontSize: "var(--text-xs)", color: "var(--color-primary)",
                                                        textDecoration: "none", whiteSpace: "nowrap",
                                                        minHeight: "36px", display: "flex", alignItems: "center",
                                                    }}
                                                    aria-label={`Bel ${order.klant.voornaam}`}
                                                >
                                                    📞 {order.klant.telefoonnummer}
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {toonNieuw && <NieuweWerkorderModal onSluit={() => setToonNieuw(false)} />}
        </section>
    );
}

// ---------------------------------------------------------------------------
// Hoofd-export
// ---------------------------------------------------------------------------

export default function BalieWerkplaatsView() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
            {/* 1. Planningsagenda */}
            <PlanningsAgenda />

            {/* Scheider */}
            <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: 0 }} />

            {/* 2. Live Kanban (read-only voor balie — geen archiveer-knop) */}
            <section>
                <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", margin: "0 0 var(--space-4)" }}>
                    🏭 Live Werkplaatsbord
                </h2>
                <WerkplaatsBord />
            </section>
        </div>
    );
}
