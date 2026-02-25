/**
 * src/components/modals/BeurtenOverzichtModal.tsx
 *
 * Gedeelde modal — overzicht van alle onderhoudsbeurten.
 * Toont een professionele tabel met alle beurten (groot, klein, APK, etc.),
 * sorteerbaar op datum, type en kilometerstand.
 *
 * Gebruikt door:
 *   - EigenaarOnderhoudView (dashboard statistieken knop)
 *
 * Vereisten: binnen een LaventeConvexProvider-tree.
 */

import { useState, useMemo } from "react";
import { useRecenteOnderhoudsbeurten, useVerwijderOnderhoud } from "../../hooks/useOnderhoud";
import ModalShell from "./ModalShell";


// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

import { TYPE_ICOON } from "../onderhoud/utils";
import type { TypeWerk } from "../onderhoud/utils";

const TYPE_BADGE_KLEUR: Record<string, string> = {
    "Grote Beurt": "var(--color-error)",
    "Kleine Beurt": "var(--color-success)",
    "APK": "var(--color-info)",
    "Reparatie": "var(--color-warning)",
    "Bandenwisseling": "var(--color-body)",
    "Schadeherstel": "var(--color-body)",
    "Diagnostiek": "var(--color-body)",
    "Overig": "var(--color-muted)",
};

function IconTrash() {
    return (
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
        </svg>
    );
}

function formatDatum(ms: number) {
    return new Date(ms).toLocaleDateString("nl-NL", {
        day: "2-digit", month: "2-digit", year: "numeric",
    });
}

type SortVeld = "datum" | "type" | "km";
type SortRichting = "asc" | "desc";

// ---------------------------------------------------------------------------
// BeurtenOverzichtModal
// ---------------------------------------------------------------------------

export default function BeurtenOverzichtModal({ onSluit }: { onSluit: () => void }) {
    const beurten = useRecenteOnderhoudsbeurten(200);
    const verwijder = useVerwijderOnderhoud();
    const [sortVeld, setSortVeld] = useState<SortVeld>("datum");
    const [sortRichting, setSortRichting] = useState<SortRichting>("desc");
    const [filterType, setFilterType] = useState<string>("Alle");
    const [verwijderConfirm, setVerwijderConfirm] = useState<string | null>(null);
    const [verwijderBezig, setVerwijderBezig] = useState<string | null>(null);

    async function handleVerwijder(id: string) {
        setVerwijderConfirm(null);
        setVerwijderBezig(id);
        try { await verwijder({ historieId: id as never }); }
        finally { setVerwijderBezig(null); }
    }

    // Beschikbare types uit de geladen data
    const beschikbareTypes = useMemo(() => {
        if (!beurten) return [];
        const set = new Set(beurten.map((b) => b.typeWerk));
        return Array.from(set).sort();
    }, [beurten]);

    // Sorteren + filteren
    const gesorteerd = useMemo(() => {
        if (!beurten) return [];
        let result = filterType === "Alle" ? beurten : beurten.filter((b) => b.typeWerk === filterType);
        return [...result].sort((a, b) => {
            let cmp = 0;
            if (sortVeld === "datum") cmp = a.datumUitgevoerd - b.datumUitgevoerd;
            if (sortVeld === "km") cmp = (a.kmStandOnderhoud ?? 0) - (b.kmStandOnderhoud ?? 0);
            if (sortVeld === "type") cmp = a.typeWerk.localeCompare(b.typeWerk, "nl");
            return sortRichting === "asc" ? cmp : -cmp;
        });
    }, [beurten, sortVeld, sortRichting, filterType]);

    // Statistieken voor de header
    const stats = useMemo(() => {
        if (!beurten) return null;
        const nu = Date.now();
        const startMaand = new Date(nu);
        startMaand.setDate(1);
        startMaand.setHours(0, 0, 0, 0);
        return {
            totaal: beurten.length,
            apkDezeMaand: beurten.filter((b) => b.typeWerk === "APK" && b.datumUitgevoerd >= startMaand.getTime()).length,
            groteBeurten: beurten.filter((b) => b.typeWerk === "Grote Beurt").length,
            kleineBeurten: beurten.filter((b) => b.typeWerk === "Kleine Beurt").length,
        };
    }, [beurten]);

    function toggleSort(veld: SortVeld) {
        if (sortVeld === veld) {
            setSortRichting((r) => (r === "asc" ? "desc" : "asc"));
        } else {
            setSortVeld(veld);
            setSortRichting("desc");
        }
    }

    const sortPijl = (veld: SortVeld) =>
        sortVeld === veld ? (sortRichting === "desc" ? " ↓" : " ↑") : "";

    const thStyle: React.CSSProperties = {
        padding: "var(--space-2) var(--space-3)",
        textAlign: "left",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--weight-semibold)",
        color: "var(--color-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
        borderBottom: "2px solid var(--color-border)",
        background: "var(--color-surface)",
        position: "sticky" as const,
        top: 0,
        zIndex: 1,
    };

    const tdStyle: React.CSSProperties = {
        padding: "var(--space-3)",
        fontSize: "var(--text-sm)",
        color: "var(--color-body)",
        borderBottom: "1px solid var(--color-border)",
        verticalAlign: "middle",
    };

    return (
        <ModalShell onSluit={onSluit} ariaLabel="Beurten overzicht" maxWidth="900px">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div style={{
                padding: "var(--space-4) var(--space-5)",
                borderBottom: "1px solid var(--color-border)",
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                gap: "var(--space-4)", flexShrink: 0,
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)" }}>
                        🔧 Beurten overzicht
                    </h2>
                    {stats && (
                        <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                            {stats.totaal} totaal
                            {" · "}<span style={{ color: "var(--color-error)" }}>{stats.groteBeurten} grote</span>
                            {" · "}<span style={{ color: "var(--color-success)" }}>{stats.kleineBeurten} kleine</span>
                            {" · "}<span style={{ color: "var(--color-info)" }}>{stats.apkDezeMaand} APK deze maand</span>
                        </p>
                    )}
                </div>
                <button
                    onClick={onSluit}
                    className="btn btn-ghost btn-sm"
                    style={{ minHeight: "40px", flexShrink: 0 }}
                    aria-label="Sluiten"
                >
                    ✕
                </button>
            </div>

            {/* ── Filter balk ────────────────────────────────────────── */}
            <div style={{
                padding: "var(--space-3) var(--space-5)",
                borderBottom: "1px solid var(--color-border)",
                display: "flex", gap: "var(--space-2)", flexWrap: "wrap",
                alignItems: "center", flexShrink: 0,
                background: "var(--glass-bg-subtle)",
            }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontWeight: "var(--weight-medium)", marginRight: "var(--space-1)" }}>
                    Filter:
                </span>
                {["Alle", ...beschikbareTypes].map((type) => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`btn btn-sm ${filterType === type ? "btn-primary" : "btn-ghost"}`}
                        style={{ minHeight: "32px", fontSize: "var(--text-xs)", gap: "var(--space-1)" }}
                    >
                        {type !== "Alle" && (TYPE_ICOON[type as TypeWerk] ?? "🔧")} {type}
                    </button>
                ))}
                <span style={{ marginLeft: "auto", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                    {gesorteerd.length} {gesorteerd.length === 1 ? "beurt" : "beurten"}
                </span>
            </div>

            {/* ── Tabel ──────────────────────────────────────────────── */}
            <div style={{ overflowY: "auto", flex: 1 }}>
                {beurten === undefined ? (
                    <div style={{ padding: "var(--space-12)", textAlign: "center", color: "var(--color-muted)" }}>
                        <p style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-2)" }}>⏳</p>
                        <p style={{ fontSize: "var(--text-sm)" }}>Beurten laden…</p>
                    </div>
                ) : gesorteerd.length === 0 ? (
                    <div style={{ padding: "var(--space-12)", textAlign: "center", color: "var(--color-muted)" }}>
                        <p style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-2)" }}>📋</p>
                        <p style={{ fontSize: "var(--text-sm)" }}>
                            {filterType === "Alle" ? "Nog geen beurten geregistreerd." : `Geen "${filterType}" beurten gevonden.`}
                        </p>
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>#</th>
                                <th
                                    style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
                                    onClick={() => toggleSort("type")}
                                >
                                    Type werk{sortPijl("type")}
                                </th>
                                <th
                                    style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
                                    onClick={() => toggleSort("datum")}
                                >
                                    Datum{sortPijl("datum")}
                                </th>
                                <th
                                    style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
                                    onClick={() => toggleSort("km")}
                                >
                                    Kilometerstand{sortPijl("km")}
                                </th>
                                <th style={thStyle}>Notities</th>
                                <th style={thStyle}>Document</th>
                                <th style={{ ...thStyle, width: "64px", textAlign: "center" }}>Del.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {gesorteerd.map((beurt, idx) => (
                                <tr
                                    key={beurt._id}
                                    style={{
                                        background: idx % 2 === 0 ? "transparent" : "var(--glass-bg-subtle)",
                                        transition: "background 0.15s",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-bg)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "var(--glass-bg-subtle)")}
                                >
                                    {/* Rijnummer */}
                                    <td style={{ ...tdStyle, color: "var(--color-muted)", fontSize: "var(--text-xs)", width: "40px" }}>
                                        {idx + 1}
                                    </td>

                                    {/* Type werk + icoon */}
                                    <td style={tdStyle}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                            <span style={{ fontSize: "var(--text-base)" }}>
                                                {TYPE_ICOON[beurt.typeWerk] ?? "🔧"}
                                            </span>
                                            <span
                                                style={{
                                                    fontWeight: "var(--weight-semibold)",
                                                    color: TYPE_BADGE_KLEUR[beurt.typeWerk] ?? "var(--color-body)",
                                                    fontSize: "var(--text-xs)",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {beurt.typeWerk}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Datum */}
                                    <td style={{ ...tdStyle, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", whiteSpace: "nowrap" }}>
                                        {formatDatum(beurt.datumUitgevoerd)}
                                    </td>

                                    {/* Kilometerstand */}
                                    <td style={{ ...tdStyle, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", whiteSpace: "nowrap" }}>
                                        {beurt.kmStandOnderhoud.toLocaleString("nl-NL")} km
                                    </td>

                                    {/* Notities */}
                                    <td style={{ ...tdStyle, maxWidth: "260px" }}>
                                        {beurt.werkNotities ? (
                                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                                {beurt.werkNotities}
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-border)" }}>—</span>
                                        )}
                                    </td>

                                    {/* Document link */}
                                    <td style={tdStyle}>
                                        {beurt.documentUrl ? (
                                            <a
                                                href={beurt.documentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ fontSize: "var(--text-xs)", color: "var(--color-accent-text)", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}
                                            >
                                                📄 Bekijk
                                            </a>
                                        ) : (
                                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-border)" }}>—</span>
                                        )}
                                    </td>

                                    {/* Verwijder — inline confirm */}
                                    <td style={{ ...tdStyle, textAlign: "center", padding: "var(--space-2)", width: "64px" }}>
                                        {verwijderConfirm === beurt._id ? (
                                            <div style={{ display: "flex", gap: "2px", justifyContent: "center" }}>
                                                <button
                                                    onClick={() => handleVerwijder(beurt._id)}
                                                    disabled={verwijderBezig === beurt._id}
                                                    style={{
                                                        minHeight: "26px", padding: "0 var(--space-2)",
                                                        background: "var(--color-error)", color: "var(--color-on-accent)", border: "none",
                                                        borderRadius: "var(--radius-sm)", cursor: "pointer",
                                                        fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                                                    }}
                                                    aria-label="Definitief verwijderen"
                                                >
                                                    {verwijderBezig === beurt._id ? "…" : "Ja"}
                                                </button>
                                                <button
                                                    onClick={() => setVerwijderConfirm(null)}
                                                    style={{
                                                        minHeight: "26px", padding: "0 var(--space-1)",
                                                        background: "transparent", border: "1px solid var(--color-border)",
                                                        borderRadius: "var(--radius-sm)", cursor: "pointer",
                                                        fontSize: "var(--text-xs)", color: "var(--color-muted)",
                                                    }}
                                                    aria-label="Annuleren"
                                                >
                                                    Nee
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setVerwijderConfirm(beurt._id)}
                                                disabled={!!verwijderBezig}
                                                style={{
                                                    background: "none", border: "none", cursor: "pointer",
                                                    color: "var(--color-error, #dc2626)", padding: "var(--space-1)",
                                                    borderRadius: "var(--radius-sm)", display: "inline-flex",
                                                    alignItems: "center", justifyContent: "center",
                                                    minHeight: "32px", minWidth: "32px",
                                                    opacity: verwijderBezig ? 0.4 : 1,
                                                }}
                                                aria-label="Verwijder beurt"
                                                title="Verwijder"
                                            >
                                                <IconTrash />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Footer ─────────────────────────────────────────────── */}
            <div style={{
                padding: "var(--space-3) var(--space-5)",
                borderTop: "1px solid var(--color-border)",
                display: "flex", justifyContent: "flex-end", flexShrink: 0,
                background: "var(--glass-bg-subtle)",
            }}>
                <button onClick={onSluit} className="btn btn-ghost" style={{ minHeight: "40px" }}>
                    Sluiten
                </button>
            </div>
        </ModalShell>
    );
}
