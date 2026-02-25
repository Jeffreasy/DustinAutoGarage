/**
 * src/components/werkplaats/EigenaarWerkplaatsView.tsx
 *
 * Eigenaar / Admin weergave.
 * ui-ux-pro-max: SVG icons, glassmorphism ArchivePanel, ChevronUp/Down SVG toggles.
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import WerkplaatsBord from "./WerkplaatsBord";
import WerkplekkenBeheer from "./WerkplekkenBeheer";
import type { Id } from "../../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// SVG icons
// ---------------------------------------------------------------------------

function IconTrophy() {
    return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    );
}

function IconArchive() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
        </svg>
    );
}

function IconSettings() {
    return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    );
}

function IconChevronUp() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="18 15 12 9 6 15" />
        </svg>
    );
}

function IconChevronDown() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// ArchivePanel
// ---------------------------------------------------------------------------

function ArchivePanel() {
    const archiveer = useMutation(api.werkorders.archiveerWerkorder);
    const werkorders = useQuery(api.werkorders.lijstWerkordersVoorBord);
    const [bezig, setBezig] = useState<Id<"werkorders"> | null>(null);

    const klaarOrders = werkorders?.filter(
        (o) => o.status === "Afgerond" && !o.gearchiveerd
    ) ?? [];

    if (klaarOrders.length === 0) return null;

    async function handleArchiveer(werkorderId: Id<"werkorders">) {
        setBezig(werkorderId);
        try { await archiveer({ werkorderId }); }
        finally { setBezig(null); }
    }

    return (
        <section style={{
            padding: "var(--space-4)", borderRadius: "var(--radius-xl)",
            background: "var(--glass-bg)", backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(22,163,74,0.3)",
            boxShadow: "var(--glass-shadow)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                <span style={{ color: "#16a34a" }}><IconTrophy /></span>
                <p style={{ margin: 0, fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", fontSize: "var(--text-sm)" }}>
                    Afgerond — klaar voor archivering ({klaarOrders.length})
                </p>
            </div>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginBottom: "var(--space-4)", marginTop: 0 }}>
                Archiveer afgeronde werkorders — ze verdwijnen van het bord maar blijven bewaard in de historiek.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {klaarOrders.map((order) => (
                    <div key={order._id} style={{
                        display: "flex", alignItems: "center", gap: "var(--space-4)",
                        padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                        background: "var(--color-surface)", border: "1px solid var(--color-border)",
                        flexWrap: "wrap",
                    }}>
                        <span style={{
                            fontFamily: "var(--font-mono)", fontWeight: 700,
                            fontSize: "var(--text-base)", color: "var(--color-heading)", minWidth: "80px",
                        }}>
                            {order.voertuig?.kenteken ?? "–"}
                        </span>
                        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-body)", flex: 1 }}>
                            {order.klant ? `${order.klant.voornaam} ${order.klant.achternaam}` : "Onbekende klant"}
                        </span>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontStyle: "italic", maxWidth: "180px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                            {order.klacht}
                        </span>
                        <button
                            onClick={() => handleArchiveer(order._id)}
                            disabled={bezig === order._id}
                            className="btn btn-ghost btn-sm"
                            style={{ minHeight: "36px", color: "var(--color-muted)", display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}
                            aria-label={`Archiveer werkorder ${order.voertuig?.kenteken ?? order._id}`}
                        >
                            <IconArchive />
                            {bezig === order._id ? "…" : "Archiveer"}
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// EigenaarWerkplaatsView
// ---------------------------------------------------------------------------

export default function EigenaarWerkplaatsView() {
    const [toonWerkplekken, setToonWerkplekken] = useState(false);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <div>
                <button
                    onClick={() => setToonWerkplekken((v) => !v)}
                    className="btn btn-ghost btn-sm"
                    style={{ minHeight: "40px", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                >
                    <IconSettings />
                    Werkplekken beheren
                    {toonWerkplekken ? <IconChevronUp /> : <IconChevronDown />}
                </button>
            </div>

            {toonWerkplekken && <WerkplekkenBeheer />}

            <ArchivePanel />

            <WerkplaatsBord />
        </div>
    );
}
