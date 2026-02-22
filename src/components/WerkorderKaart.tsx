/**
 * src/components/WerkorderKaart.tsx
 *
 * Het individuele kaartje op het Werkplaatsbord.
 *
 * Prioriteit van leesbaarheid:
 *   1. Kenteken — GIGA, onmiddellijk herkenbaar van 3 meter afstand (tablet!)
 *   2. Merk + Model — subtitel
 *   3. Klacht — rood/oranje highlighted — "wat is er stuk?"
 *   4. Status badge + monteur
 *   5. Touch-friendly actieknop: min 48px hoogte
 *
 * Design: glassmorphism conform bestaande design tokens.
 *   Geen hardcoded kleuren — alleen var(--token).
 */

import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import type { WerkorderVerrijkt, WerkplekDoc } from "../hooks/useWerkplaats";
import { useVerplaatsNaarWerkplek } from "../hooks/useWerkplaats";
import type { DomeinRol } from "../../convex/helpers";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
    "Wachtend": {
        label: "Wachtend",
        color: "var(--color-muted)",
        bg: "var(--color-surface)",
        border: "var(--color-border)",
        dot: "#6b7280",
    },
    "Bezig": {
        label: "🔧 Bezig",
        color: "#92400e",
        bg: "#fffbeb",
        border: "#fcd34d",
        dot: "#f59e0b",
    },
    "Wacht op onderdelen": {
        label: "⏳ Wacht op onderdelen",
        color: "#1e3a5f",
        bg: "#eff6ff",
        border: "#93c5fd",
        dot: "#3b82f6",
    },
    "Klaar": {
        label: "✅ Klaar",
        color: "#14532d",
        bg: "#f0fdf4",
        border: "#86efac",
        dot: "#22c55e",
    },
} as const;

// ---------------------------------------------------------------------------
// WerkorderKaart
// ---------------------------------------------------------------------------

interface WerkorderKaartProps {
    order: WerkorderVerrijkt;
    werkplekken: WerkplekDoc[];
    domeinRol: DomeinRol | null;
    onOpenLogboek: (orderId: Id<"werkorders">) => void;
}

export default function WerkorderKaart({
    order,
    werkplekken,
    domeinRol,
    onOpenLogboek,
}: WerkorderKaartProps) {
    const [bezig, setBezig] = useState(false);
    const verplaats = useVerplaatsNaarWerkplek();

    const statusCfg = STATUS_CONFIG[order.status];
    const isMonteur = domeinRol === "monteur" || domeinRol === "balie" || domeinRol === "eigenaar";

    // De werkplekken voor het actie-menu (exclusief huidige plek)
    const beschikbarePlekken = werkplekken.filter((p) => p._id !== order.werkplekId);

    async function verplaatsNaar(werkplekId: Id<"werkplekken"> | undefined) {
        setBezig(true);
        try {
            await verplaats({
                werkorderId: order._id,
                werkplekId,
                nieuweStatus: werkplekId ? "Bezig" : "Wachtend",
            });
        } finally {
            setBezig(false);
        }
    }

    return (
        <div
            style={{
                padding: "var(--space-4)",
                borderRadius: "var(--radius-xl)",
                background: "var(--glass-bg)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: `1px solid ${statusCfg.border}`,
                boxShadow: "var(--glass-shadow)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
                position: "relative",
                overflow: "hidden",
                transition: "border-color var(--transition-base), box-shadow var(--transition-base)",
            }}
        >
            {/* Status glow accent line */}
            <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                background: statusCfg.dot,
                opacity: 0.8,
            }} />

            {/* === 1. KENTEKEN — GIGA ========================================= */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
                <span
                    style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: "var(--weight-black, 900)",
                        fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
                        letterSpacing: "var(--tracking-wider)",
                        color: "var(--color-heading)",
                        background: "var(--gradient-accent-subtle)",
                        border: "2px solid var(--color-border-luminous)",
                        borderRadius: "var(--radius-md)",
                        padding: "0.15em 0.5em",
                        lineHeight: 1.2,
                    }}
                    aria-label={`Kenteken ${order.voertuig?.kenteken ?? "onbekend"}`}
                >
                    {order.voertuig?.kenteken ?? "—"}
                </span>

                {/* Status badge */}
                <span
                    style={{
                        fontSize: "var(--text-xs)",
                        fontWeight: "var(--weight-semibold)",
                        color: statusCfg.color,
                        background: statusCfg.bg,
                        border: `1px solid ${statusCfg.border}`,
                        borderRadius: "var(--radius-full, 9999px)",
                        padding: "0.2em 0.6em",
                        whiteSpace: "nowrap",
                    }}
                >
                    {statusCfg.label}
                </span>
            </div>

            {/* === 2. MERK + MODEL ============================================ */}
            <p style={{
                color: "var(--color-heading)",
                fontWeight: "var(--weight-semibold)",
                fontSize: "var(--text-sm)",
                margin: 0,
                lineHeight: 1.3,
            }}>
                {order.voertuig
                    ? `${order.voertuig.merk} ${order.voertuig.model}`
                    : "Voertuig onbekend"}
            </p>

            {/* === 3. KLACHT — rood highlighted =============================== */}
            <div style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-3)",
            }}>
                <p style={{
                    color: "#dc2626",
                    fontWeight: "var(--weight-semibold)",
                    fontSize: "var(--text-sm)",
                    margin: 0,
                    lineHeight: 1.4,
                }}>
                    🔴 {order.klacht}
                </p>
            </div>

            {/* === 4. MONTEUR ================================================= */}
            {order.monteur && (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: 0 }}>
                    👤 {order.monteur.naam}
                </p>
            )}

            {/* === 5. ACTIES — alleen voor monteur+ =========================== */}
            {isMonteur && (
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-1)" }}>
                    {/* Verplaats-knoppen */}
                    {beschikbarePlekken.map((plek) => (
                        <button
                            key={plek._id}
                            onClick={() => verplaatsNaar(plek._id)}
                            disabled={bezig}
                            className="btn btn-primary btn-sm"
                            style={{ minHeight: "48px", flex: "1 1 auto", fontSize: "var(--text-xs)" }}
                            aria-label={`Verplaats naar ${plek.naam}`}
                        >
                            → {plek.naam}
                        </button>
                    ))}

                    {/* Terug naar buiten als de auto op een brug staat */}
                    {order.werkplekId && (
                        <button
                            onClick={() => verplaatsNaar(undefined)}
                            disabled={bezig}
                            className="btn btn-ghost btn-sm"
                            style={{ minHeight: "48px", fontSize: "var(--text-xs)" }}
                            aria-label="Terug naar Wachtend"
                        >
                            ← Buiten
                        </button>
                    )}

                    {/* Logboek knop */}
                    <button
                        onClick={() => onOpenLogboek(order._id)}
                        className="btn btn-ghost btn-sm"
                        style={{ minHeight: "48px", fontSize: "var(--text-xs)" }}
                        aria-label="Logboek bekijken"
                    >
                        📋 Log
                    </button>
                </div>
            )}
        </div>
    );
}
