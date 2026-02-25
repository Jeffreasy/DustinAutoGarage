/**
 * src/components/werkplaats/EigenaarWerkplaatsView.tsx
 *
 * Eigenaar / Admin weergave.
 * Icons geïmporteerd uit gedeelde Icons.tsx (geen lokale duplicaten).
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import WerkplaatsBord from "./WerkplaatsBord";
import WerkplekkenBeheer from "./WerkplekkenBeheer";
import {
    IconTrophy, IconArchive, IconSettings,
    IconChevronUp, IconChevronDown,
} from "../ui/Icons";

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
            border: "1px solid var(--color-success-border)",
            boxShadow: "var(--glass-shadow)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                <span style={{ color: "var(--color-success)" }}><IconTrophy /></span>
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
                            fontFamily: "var(--font-mono)", fontWeight: "var(--weight-bold)",
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
                    <IconSettings size={16} />
                    Werkplekken beheren
                    {toonWerkplekken ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                </button>
            </div>

            {toonWerkplekken && <WerkplekkenBeheer />}

            <ArchivePanel />

            <WerkplaatsBord />
        </div>
    );
}
