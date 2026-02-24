/**
 * src/components/werkplaats/EigenaarWerkplaatsView.tsx
 *
 * Eigenaar / Admin weergave: het volledige Kanban-bord plus
 * een archiveer-knop op kaartjes met status "Klaar"
 * en de WerkplekkenBeheer sectie voor beheer van garage-locaties.
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import WerkplaatsBord from "./WerkplaatsBord";
import WerkplekkenBeheer from "./WerkplekkenBeheer";
import type { Id } from "../../../convex/_generated/dataModel";

function ArchivePanel() {
    const archiveer = useMutation(api.werkorders.archiveerWerkorder);
    const werkorders = useQuery(api.werkorders.lijstWerkordersVoorBord);
    const [bezig, setBezig] = useState<Id<"werkorders"> | null>(null);

    // Filter op Afgerond — sluitWerkorderAf zet status naar Afgerond (niet Klaar)
    // Klaar = klaar voor ophalen (balie > afsluiten knop nog niet ingedrukt)
    // Afgerond = definitief gesloten, klaar voor archivering
    const klaarOrders = werkorders?.filter(
        (o) => o.status === "Afgerond" && !o.gearchiveerd
    ) ?? [];

    if (klaarOrders.length === 0) return null;

    async function handleArchiveer(werkorderId: Id<"werkorders">) {
        setBezig(werkorderId);
        try {
            await archiveer({ werkorderId });
        } finally {
            setBezig(null);
        }
    }

    return (
        <section className="card" style={{ padding: "var(--space-4)", borderColor: "var(--color-success-border, #86efac)" }}>
            <p className="card-title" style={{ marginBottom: "var(--space-3)" }}>
                🏆 Afgerond — klaar voor archivering ({klaarOrders.length})
            </p>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginBottom: "var(--space-4)" }}>
                Archiveer afgeronde werkorders — ze verdwijnen van het bord maar blijven bewaard in de historiek.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {klaarOrders.map((order) => (
                    <div key={order._id} style={{
                        display: "flex", alignItems: "center", gap: "var(--space-4)",
                        padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                        background: "var(--glass-bg-subtle)", border: "1px solid var(--color-border)",
                        flexWrap: "wrap",
                    }}>
                        <span style={{
                            fontFamily: "var(--font-mono)", fontWeight: 700,
                            fontSize: "var(--text-base)", color: "var(--color-heading)", minWidth: "80px",
                        }}>
                            {order.voertuig?.kenteken ?? "–"}
                        </span>
                        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-body)", flex: 1 }}>
                            {order.klant
                                ? `${order.klant.voornaam} ${order.klant.achternaam}`
                                : "Onbekende klant"}
                        </span>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontStyle: "italic", maxWidth: "180px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                            {order.klacht}
                        </span>
                        <button
                            onClick={() => handleArchiveer(order._id)}
                            disabled={bezig === order._id}
                            className="btn btn-ghost btn-sm"
                            style={{ minHeight: "36px", color: "var(--color-muted)" }}
                            aria-label={`Archiveer werkorder ${order.voertuig?.kenteken ?? order._id}`}
                        >
                            {bezig === order._id ? "…" : "🗄️ Archiveer"}
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default function EigenaarWerkplaatsView() {
    const [toonWerkplekken, setToonWerkplekken] = useState(false);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            {/* Werkplekken-beheer toggle */}
            <div>
                <button
                    onClick={() => setToonWerkplekken((v) => !v)}
                    className="btn btn-ghost btn-sm"
                    style={{ minHeight: "40px" }}
                >
                    {toonWerkplekken ? "▲ Werkplekken verbergen" : "🏗️ Werkplekken beheren"}
                </button>
            </div>

            {toonWerkplekken && <WerkplekkenBeheer />}

            {/* Archiveer-paneel — alleen zichtbaar als er "Klaar" orders zijn */}
            <ArchivePanel />

            {/* Volledig Kanban (zelfde als monteur) */}
            <WerkplaatsBord />
        </div>
    );
}
