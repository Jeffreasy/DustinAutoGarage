/**
 * src/components/modals/RecenteBeurtenModal.tsx
 *
 * Professionele modal — Recente Onderhoudsbeurten feed.
 *
 * Toont de laatste beurten van de garage inclusief:
 *   - Kenteken (klikbaar → opent voertuig dossier)
 *   - Klantnaam
 *   - Type werk + datum + km
 *   - Werknotities (collapsed)
 *
 * Gebruikt getRecenteBeurtenVerrijkt (dubbele JOIN: voertuig + klant).
 */

import { useState } from "react";
import { useRecenteBeurtenVerrijkt } from "../../hooks/useOnderhoud";
import ModalShell from "./ModalShell";
import type { Doc } from "../../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

type BeurtVerrijkt = NonNullable<ReturnType<typeof useRecenteBeurtenVerrijkt>>[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_ICOON: Record<string, string> = {
    "Grote Beurt": "GB", "Kleine Beurt": "KB", "APK": "APK",
    "Reparatie": "REP", "Bandenwisseling": "BW", "Schadeherstel": "SCH",
    "Diagnostiek": "DIA", "Overig": "OVR",
};

const TYPE_KLEUR: Record<string, string> = {
    "Grote Beurt": "var(--color-error)",
    "Kleine Beurt": "var(--color-success)",
    "APK": "var(--color-info)",
    "Reparatie": "var(--color-warning)",
};

function formatDatum(ms: number) {
    return new Date(ms).toLocaleDateString("nl-NL", {
        day: "2-digit", month: "short", year: "numeric",
    });
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function BeurtSkeleton() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {[...Array(6)].map((_, i) => (
                <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "var(--space-3)",
                    padding: "var(--space-4)",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    minHeight: "68px",
                }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "var(--radius-sm)", background: "var(--skeleton-base)", flexShrink: 0, animation: "pulse 1.5s ease infinite" }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        <div style={{ width: "35%", height: "12px", borderRadius: "var(--radius-sm)", background: "var(--skeleton-base)", animation: "pulse 1.5s ease infinite" }} />
                        <div style={{ width: "55%", height: "10px", borderRadius: "var(--radius-sm)", background: "var(--skeleton-shine)", animation: "pulse 1.5s ease infinite" }} />
                    </div>
                    <div style={{ width: "80px", height: "10px", borderRadius: "var(--radius-sm)", background: "var(--skeleton-shine)", animation: "pulse 1.5s ease infinite" }} />
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Beurt kaart
// ---------------------------------------------------------------------------

function BeurtKaart({
    beurt,
    onOpenVoertuig,
}: {
    beurt: BeurtVerrijkt;
    onOpenVoertuig: (v: NonNullable<BeurtVerrijkt["voertuig"]>) => void;
}) {
    const [open, setOpen] = useState(false);
    const kleur = TYPE_KLEUR[beurt.typeWerk] ?? "var(--color-muted)";

    return (
        <div
            style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderLeft: `3px solid ${kleur}`,
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
            }}
        >
            {/* Hoofdrij */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "36px 1fr auto",
                gap: "var(--space-3)",
                alignItems: "center",
                padding: "var(--space-3) var(--space-4)",
            }}>
                {/* Type icoon */}
                <div style={{
                    width: "36px", height: "36px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "var(--color-surface-2)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--text-lg)", flexShrink: 0,
                }}>
                    {TYPE_ICOON[beurt.typeWerk] ?? "🔧"}
                </div>

                {/* Content */}
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                        {/* Type */}
                        <span style={{
                            fontWeight: "var(--weight-semibold)",
                            fontSize: "var(--text-sm)",
                            color: kleur,
                        }}>
                            {beurt.typeWerk}
                        </span>

                        {/* Kenteken — klikbaar */}
                        {beurt.voertuig && (
                            <button
                                onClick={() => onOpenVoertuig(beurt.voertuig!)}
                                style={{
                                    fontFamily: "var(--font-mono)", fontWeight: 700,
                                    fontSize: "11px", letterSpacing: "0.06em",
                                    color: "var(--color-heading)",
                                    background: "var(--color-surface-3)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "var(--radius-xs)",
                                    padding: "1px 7px",
                                    cursor: "pointer",
                                    transition: "background var(--transition-fast)",
                                }}
                                title="Open voertuigdossier"
                                aria-label={`Open dossier ${beurt.voertuig.kenteken}`}
                            >
                                {beurt.voertuig.kenteken}
                            </button>
                        )}

                        {/* Klant */}
                        {beurt.klant ? (
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                {beurt.klant.voornaam} {beurt.klant.achternaam}
                            </span>
                        ) : (
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-border)", fontStyle: "italic" }}>
                                geen klant
                            </span>
                        )}
                    </div>

                    {/* Datum + km */}
                    <div style={{
                        display: "flex", alignItems: "center", gap: "var(--space-3)",
                        marginTop: "3px", flexWrap: "wrap",
                    }}>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                            {formatDatum(beurt.datumUitgevoerd)}
                        </span>
                        <span style={{
                            fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)",
                            color: "var(--color-body)",
                        }}>
                            {beurt.kmStandOnderhoud.toLocaleString("nl-NL")} km
                        </span>
                        {beurt.voertuig && (
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                {beurt.voertuig.merk} {beurt.voertuig.model}
                            </span>
                        )}
                    </div>
                </div>

                {/* Rechts: notities toggle + document */}
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}>
                    {beurt.documentUrl && (
                        <a
                            href={beurt.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                fontSize: "var(--text-xs)", color: "var(--color-accent-text)",
                                display: "inline-flex", alignItems: "center", gap: "3px",
                                textDecoration: "none",
                            }}
                            title="Bekijk document"
                            aria-label="Document bekijken">
                            <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        </a>
                    )}
                    {beurt.werkNotities && (
                        <button
                            onClick={() => setOpen(o => !o)}
                            style={{
                                background: "none", border: "none", cursor: "pointer",
                                fontSize: "var(--text-xs)", color: "var(--color-muted)",
                                padding: "var(--space-1)", borderRadius: "var(--radius-sm)",
                                transition: "color var(--transition-fast)",
                                lineHeight: 1,
                            }}
                            aria-label="Toon werknotities"
                            title="Werknotities"
                        >
                            {open ? "▲" : "▼"}
                        </button>
                    )}
                </div>
            </div>

            {/* Werknotities — uitklapbaar */}
            {open && beurt.werkNotities && (
                <div style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderTop: "1px solid var(--color-border)",
                    background: "var(--glass-bg-subtle)",
                    fontSize: "var(--text-xs)", color: "var(--color-body)",
                    fontStyle: "italic", lineHeight: 1.6,
                }}>
                    {beurt.werkNotities}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// RecenteBeurtenModal
// ---------------------------------------------------------------------------

interface Props {
    onSluit: () => void;
    onOpenVoertuig?: (voertuig: Doc<"voertuigen">) => void;
}

export default function RecenteBeurtenModal({ onSluit, onOpenVoertuig }: Props) {
    const beurten = useRecenteBeurtenVerrijkt(50);
    const [filterType, setFilterType] = useState("Alle");

    const gefilterd = !beurten
        ? []
        : filterType === "Alle"
            ? beurten
            : beurten.filter((b: BeurtVerrijkt) => b.typeWerk === filterType);

    const beschikbareTypes = beurten
        ? Array.from(new Set(beurten.map((b: BeurtVerrijkt) => b.typeWerk))).sort()
        : [];

    function handleOpenVoertuig(v: NonNullable<BeurtVerrijkt["voertuig"]>) {
        if (onOpenVoertuig) {
            // Cast naar Doc<"voertuigen"> — partial object vanuit de JOIN
            onOpenVoertuig(v as unknown as Doc<"voertuigen">);
        }
        onSluit();
    }

    return (
        <ModalShell onSluit={onSluit} ariaLabel="Recente onderhoudsbeurten" maxWidth="720px">

            {/* ── Header ── */}
            <div style={{
                padding: "var(--space-4) var(--space-5)",
                borderBottom: "1px solid var(--color-border)",
                display: "flex", justifyContent: "space-between",
                alignItems: "flex-start", gap: "var(--space-4)", flexShrink: 0,
            }}>
                <div>
                    <h2 style={{
                        margin: 0, fontSize: "var(--text-lg)",
                        fontWeight: "var(--weight-bold)", color: "var(--color-heading)",
                        display: "flex", alignItems: "center", gap: "var(--space-2)",
                    }}>
                        🔧 Recente onderhoudsbeurten
                    </h2>
                    <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                        {beurten === undefined
                            ? "Laden…"
                            : `${gefilterd.length} van ${beurten.length} beurten`}
                    </p>
                </div>
                <button
                    onClick={onSluit}
                    className="btn btn-ghost btn-sm"
                    style={{ minHeight: "40px", minWidth: "40px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                    aria-label="Sluiten"
                >
                    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
            </div>

            {/* ── Filter ── */}
            {beurten && beschikbareTypes.length > 0 && (
                <div style={{
                    padding: "var(--space-3) var(--space-5)",
                    borderBottom: "1px solid var(--color-border)",
                    display: "flex", gap: "var(--space-2)", flexWrap: "wrap",
                    alignItems: "center", flexShrink: 0,
                    background: "var(--glass-bg-subtle)",
                }}>
                    {["Alle", ...beschikbareTypes].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`btn btn-sm ${filterType === type ? "btn-primary" : "btn-ghost"}`}
                            style={{ minHeight: "30px", fontSize: "var(--text-xs)", gap: "3px" }}
                        >
                            {type !== "Alle" && (TYPE_ICOON[type] ?? "🔧")} {type}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Lijst ── */}
            <div style={{
                flex: 1, overflowY: "auto",
                padding: "var(--space-4) var(--space-5)",
                display: "flex", flexDirection: "column", gap: "var(--space-2)",
            }}>
                {beurten === undefined ? (
                    <BeurtSkeleton />
                ) : gefilterd.length === 0 ? (
                    <div style={{ padding: "var(--space-12)", textAlign: "center", color: "var(--color-muted)" }}>
                        <svg viewBox="0 0 24 24" width={40} height={40} fill="none" stroke="var(--color-border)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ margin: "0 auto var(--space-3)", display: "block" }}><path d="M9 2h6l1 3H8z" /><rect x="3" y="5" width="18" height="16" rx="2" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></svg>
                        <p style={{ fontSize: "var(--text-sm)", margin: 0 }}>
                            {filterType === "Alle"
                                ? "Nog geen beurten geregistreerd."
                                : `Geen "${filterType}" beurten gevonden.`}
                        </p>
                    </div>
                ) : (
                    gefilterd.map((beurt: BeurtVerrijkt) => (
                        <BeurtKaart
                            key={beurt._id}
                            beurt={beurt}
                            onOpenVoertuig={handleOpenVoertuig}
                        />
                    ))
                )}
            </div>

            {/* ── Footer ── */}
            <div style={{
                padding: "var(--space-3) var(--space-5)",
                borderTop: "1px solid var(--color-border)",
                display: "flex", justifyContent: "flex-end",
                flexShrink: 0, background: "var(--glass-bg-subtle)",
            }}>
                <button onClick={onSluit} className="btn btn-ghost" style={{ minHeight: "40px" }}>
                    Sluiten
                </button>
            </div>
        </ModalShell>
    );
}
