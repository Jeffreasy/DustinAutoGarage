/**
 * src/components/modals/WerkorderDetailModal.tsx
 *
 * Read-only detail-paneel voor een werkorder.
 * Beschikbaar voor: balie + eigenaar (isBalie).
 *
 * Design system: dezelfde structuur als NieuweKlantModal —
 *   - Sticky header met titel + ✕ sluitknop
 *   - Scrollbare body (overflowY: auto)
 *   - Vaste footer met actie-knoppen
 */

import React from "react";
import ModalShell from "./ModalShell";
import type { WerkorderVerrijkt } from "../../hooks/useWerkplaats";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDatum(ms: number): string {
    return new Date(ms).toLocaleDateString("nl-NL", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
}

function formatEuro(bedrag: number): string {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(bedrag);
}

const STATUS_KLEUR: Record<string, string> = {
    "Gepland": "#8b5cf6",
    "Aanwezig": "#0891b2",
    "Wachtend": "#6b7280",
    "Bezig": "#f59e0b",
    "Wacht op onderdelen": "#3b82f6",
    "Klaar": "#22c55e",
    "Afgerond": "#16a34a",
    "Geannuleerd": "#dc2626",
};

// ---------------------------------------------------------------------------
// InfoRij helper
// ---------------------------------------------------------------------------

function InfoRij({ label, waarde, mono = false }: { label: string; waarde: React.ReactNode; mono?: boolean }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{
                fontSize: "var(--text-xs)", color: "var(--color-muted)",
                fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
                {label}
            </span>
            <span style={{
                fontSize: "var(--text-sm)", color: "var(--color-heading)",
                fontWeight: "var(--weight-medium)",
                fontFamily: mono ? "var(--font-mono)" : undefined,
            }}>
                {waarde ?? "—"}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sectie
// ---------------------------------------------------------------------------

function Sectie({ titel, children }: { titel: string; children: React.ReactNode }) {
    return (
        <div>
            <p style={{
                margin: "0 0 var(--space-3)",
                fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.07em",
                borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-2)",
            }}>
                {titel}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                {children}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

interface Props {
    order: WerkorderVerrijkt;
    onSluit: () => void;
}

export default function WerkorderDetailModal({ order, onSluit }: Props) {
    const statusKleur = STATUS_KLEUR[order.status] ?? "#6b7280";
    const kenteken = order.voertuig?.kenteken ?? "—";

    return (
        <ModalShell ariaLabel={`Werkorder ${kenteken}`} onSluit={onSluit} maxWidth="620px">

            {/* ── Sticky header ── */}
            <div style={{
                padding: "var(--space-4) var(--space-5)",
                borderBottom: "1px solid var(--color-border)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                flexShrink: 0, gap: "var(--space-2)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0, flexWrap: "wrap" }}>
                    <span style={{
                        fontFamily: "var(--font-mono)", fontWeight: 900,
                        fontSize: "var(--text-lg)", letterSpacing: "0.06em", color: "var(--color-heading)",
                    }}>
                        {kenteken}
                    </span>
                    {order.voertuig && (
                        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {order.voertuig.merk} {order.voertuig.model}
                        </span>
                    )}
                    <span style={{
                        fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                        color: statusKleur, background: `${statusKleur}18`,
                        border: `1px solid ${statusKleur}44`,
                        borderRadius: "var(--radius-full, 9999px)", padding: "0.2em 0.65em", whiteSpace: "nowrap",
                    }}>
                        {order.status}
                    </span>
                </div>
                <button
                    onClick={onSluit}
                    className="btn btn-ghost btn-sm"
                    style={{ minHeight: "40px", flexShrink: 0 }}
                    aria-label="Modal sluiten"
                >
                    ✕
                </button>
            </div>

            {/* ── Scrollbare body ── */}
            <div style={{
                padding: "var(--space-5)",
                display: "flex", flexDirection: "column", gap: "var(--space-5)",
                overflowY: "auto", flex: 1,
            }}>
                {/* Klacht — prominent */}
                <div style={{
                    background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: "var(--radius-lg)", padding: "var(--space-4)",
                }}>
                    <p style={{ margin: "0 0 4px", fontSize: "var(--text-xs)", color: "#dc2626", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        🔴 Klacht / opdracht
                    </p>
                    <p style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--color-heading)", fontWeight: "var(--weight-medium)", lineHeight: 1.5 }}>
                        {order.klacht}
                    </p>
                </div>

                {/* Klant */}
                <Sectie titel="👤 Klant">
                    <InfoRij
                        label="Naam"
                        waarde={order.klant ? `${order.klant.voornaam} ${order.klant.achternaam}` : null}
                    />
                    <InfoRij
                        label="Telefoon"
                        waarde={
                            order.klant?.telefoonnummer
                                ? (
                                    <a href={`tel:${order.klant.telefoonnummer}`}
                                        style={{ color: "var(--color-accent-text)", textDecoration: "none" }}>
                                        {order.klant.telefoonnummer}
                                    </a>
                                )
                                : null
                        }
                    />
                </Sectie>

                {/* Planning */}
                <Sectie titel="📅 Planning & uitvoering">
                    <InfoRij label="Afspraakdatum" waarde={formatDatum(order.afspraakDatum)} />
                    <InfoRij label="Monteur" waarde={order.monteur?.naam ?? "Niet toegewezen"} />
                </Sectie>

                {/* Financieel */}
                {order.totaalKosten !== undefined && (
                    <Sectie titel="💶 Financieel">
                        <InfoRij label="Totaal (excl. BTW)" waarde={formatEuro(order.totaalKosten)} />
                        <InfoRij label="BTW (21%)" waarde={formatEuro(order.totaalKosten * 0.21)} />
                    </Sectie>
                )}
            </div>

            {/* ── Vaste footer ── */}
            <div style={{
                padding: "var(--space-4) var(--space-5)",
                borderTop: "1px solid var(--color-border)",
                display: "flex", gap: "var(--space-3)", flexWrap: "wrap",
                flexShrink: 0,
            }}>
                <button onClick={onSluit} className="btn btn-ghost btn-sm" style={{ minHeight: "44px" }}>
                    Sluiten
                </button>
                <a
                    href="/onderhoud"
                    className="btn btn-ghost btn-sm"
                    style={{ minHeight: "44px", color: "var(--color-accent-text)", textDecoration: "none" }}
                    title="Onderhoudsdossier bekijken"
                >
                    📋 Onderhoudsdossier →
                </a>
            </div>

        </ModalShell>
    );
}
