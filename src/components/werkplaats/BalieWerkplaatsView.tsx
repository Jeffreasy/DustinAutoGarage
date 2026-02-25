/**
 * src/components/werkplaats/BalieWerkplaatsView.tsx
 *
 * Balie / Receptie weergave voor de Werkplaats.
 * ui-ux-pro-max: SVG icons, skeleton loader, geen emojis.
 */

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import WerkplaatsBord from "./WerkplaatsBord";
import NieuweWerkorderModal from "../modals/NieuweWerkorderModal";
import { useAfgerondNietOpgehaald, useBevestigOphalen } from "../../hooks/useWerkplaats";

const DAGNAMEN = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const MAANDNAMEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function formatDag(ms: number): string {
    const d = new Date(ms);
    const nu = new Date();
    if (d.toDateString() === nu.toDateString()) return "Vandaag";
    if (d.toDateString() === new Date(nu.getTime() + 86400000).toDateString()) return "Morgen";
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

// ---------------------------------------------------------------------------
// SVG icons
// ---------------------------------------------------------------------------

function IconCalendar() {
    return (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

function IconLayoutDashboard() {
    return (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
        </svg>
    );
}

function IconPhone() {
    return (
        <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    );
}

function IconCheck() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function IconPackage() {
    return (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
    );
}

function AgendaSkeleton() {
    return (
        <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{
                    padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-xl)",
                    background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                    display: "flex", gap: "var(--space-4)", alignItems: "center",
                }}>
                    <div style={{ width: "80px", height: "16px", borderRadius: "var(--radius-sm)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
                    <div style={{ flex: 1, height: "14px", borderRadius: "var(--radius-sm)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
                    <div style={{ width: "60px", height: "20px", borderRadius: "9999px", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// PlanningsAgenda
// ---------------------------------------------------------------------------

function PlanningsAgenda() {
    const [toonNieuw, setToonNieuw] = useState(false);
    const nu = Date.now();
    const beginVandaag = nu - (nu % 86400000);

    const planning = useQuery(api.werkorders.lijstPlanningVoorBalie, {
        vanafMs: beginVandaag,
        totMs: beginVandaag + 8 * 24 * 60 * 60 * 1000,
    });

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
                    <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <IconCalendar /> Planning — komende week
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
                <AgendaSkeleton />
            ) : dagEntries.length === 0 ? (
                <div style={{
                    padding: "var(--space-8)", textAlign: "center",
                    background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-xl)", backdropFilter: "blur(12px)",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)",
                }}>
                    <span style={{ color: "var(--color-muted)" }}><IconCalendar /></span>
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", margin: 0 }}>
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
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                                    <span style={{
                                        fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)",
                                        color: isVandaag ? "var(--color-primary)" : "var(--color-heading)",
                                        borderBottom: isVandaag ? "2px solid var(--color-primary)" : "none",
                                        paddingBottom: "1px",
                                    }}>
                                        {formatDag(eersteDatum)}
                                    </span>
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>({orders!.length})</span>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                                    {orders!.map((order) => (
                                        <div key={order._id} style={{
                                            padding: "var(--space-3) var(--space-4)",
                                            background: "var(--glass-bg)", backdropFilter: "blur(8px)",
                                            border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
                                            display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap",
                                        }}>
                                            <span style={{
                                                fontFamily: "var(--font-mono)", fontWeight: 700,
                                                fontSize: "var(--text-base)", color: "var(--color-heading)",
                                                minWidth: "80px",
                                            }}>
                                                {order.voertuig?.kenteken ?? "–"}
                                            </span>

                                            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-body)", flex: 1 }}>
                                                {order.klant
                                                    ? `${order.klant.voornaam} ${order.klant.achternaam}`
                                                    : "Onbekende klant"}
                                            </span>

                                            <span style={{
                                                fontSize: "var(--text-xs)", color: "var(--color-muted)",
                                                flex: 2, fontStyle: "italic", overflow: "hidden",
                                                whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "240px",
                                            }}>
                                                {order.klacht}
                                            </span>

                                            <span style={{
                                                fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                                                color: statusKleur(order.status), whiteSpace: "nowrap",
                                            }}>
                                                {order.status}
                                            </span>

                                            {order.klant?.telefoonnummer && (
                                                <a
                                                    href={`tel:${order.klant.telefoonnummer}`}
                                                    style={{
                                                        fontSize: "var(--text-xs)", color: "var(--color-primary)",
                                                        textDecoration: "none", whiteSpace: "nowrap",
                                                        minHeight: "36px", display: "inline-flex", alignItems: "center", gap: "4px",
                                                    }}
                                                    aria-label={`Bel ${order.klant.voornaam}`}
                                                >
                                                    <IconPhone /> {order.klant.telefoonnummer}
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
// WachtOpOphalenWidget — balie overzicht "klaar maar niet opgehaald"
// ---------------------------------------------------------------------------

function WachtOpOphalenWidget() {
    const orders = useAfgerondNietOpgehaald();
    const bevestig = useBevestigOphalen();
    const [bezigId, setBezigId] = useState<Id<"werkorders"> | null>(null);

    if (!orders || orders.length === 0) return null;

    async function handleOphalen(werkorderId: Id<"werkorders">) {
        setBezigId(werkorderId);
        try { await bevestig({ werkorderId }); }
        finally { setBezigId(null); }
    }

    return (
        <section style={{
            padding: "var(--space-4)", borderRadius: "var(--radius-lg)",
            background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.25)",
            display: "flex", flexDirection: "column", gap: "var(--space-3)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ color: "#16a34a" }}><IconPackage /></span>
                <span style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>
                    Wacht op ophalen
                </span>
                <span style={{
                    background: "#16a34a", color: "#fff",
                    fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)",
                    borderRadius: "9999px", padding: "1px 8px", minWidth: "24px", textAlign: "center",
                }}>{orders.length}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {orders.map((order) => (
                    <div key={order._id} style={{
                        display: "flex", alignItems: "center", gap: "var(--space-3)",
                        padding: "var(--space-2) var(--space-3)",
                        background: "var(--color-surface-2)", borderRadius: "var(--radius-md)",
                        border: "1px solid var(--color-border)", flexWrap: "wrap",
                    }}>
                        <span style={{
                            fontFamily: "var(--font-mono)", fontWeight: 700,
                            fontSize: "var(--text-sm)", color: "var(--color-heading)",
                            background: "var(--color-surface-4)", padding: "1px 6px",
                            borderRadius: "var(--radius-xs)", border: "1px solid var(--color-border)",
                        }}>{order.voertuig?.kenteken ?? "–"}</span>

                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-body)", flex: 1 }}>
                            {order.klant
                                ? `${order.klant.voornaam} ${order.klant.achternaam}`
                                : "Onbekende klant"}
                        </span>

                        {order.klant?.telefoonnummer && (
                            <a href={`tel:${order.klant.telefoonnummer}`}
                                style={{ fontSize: "var(--text-xs)", color: "var(--color-accent-text)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                aria-label={`Bel ${order.klant.voornaam}`}>
                                <IconPhone /> {order.klant.telefoonnummer}
                            </a>
                        )}

                        <button
                            onClick={() => handleOphalen(order._id)}
                            disabled={bezigId === order._id}
                            className="btn btn-sm"
                            style={{
                                minHeight: "36px", background: "#16a34a", color: "#fff",
                                border: "none", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)",
                                fontWeight: "var(--weight-semibold)", cursor: "pointer",
                                display: "inline-flex", alignItems: "center", gap: "4px",
                            }}
                            aria-label={`Bevestig ophalen ${order.voertuig?.kenteken ?? ""}`}
                        >
                            <IconCheck /> {bezigId === order._id ? "…" : "Opgehaald"}
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// Hoofd-export
// ---------------------------------------------------------------------------

export default function BalieWerkplaatsView() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
            <PlanningsAgenda />
            <WachtOpOphalenWidget />
            <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: 0 }} />
            <section>
                <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", margin: "0 0 var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <IconLayoutDashboard /> Live Werkplaatsbord
                </h2>
                <WerkplaatsBord />
            </section>
        </div>
    );
}
