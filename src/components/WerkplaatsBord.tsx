/**
 * src/components/WerkplaatsBord.tsx
 *
 * Het Digitaal Werkplaatsbord — het Kanban-hoofd component.
 *
 * Kolom-structuur (links → rechts):
 *   [Wachtend/Buiten]  →  [Brug 1]  →  [Brug 2]  →  ...  →  [Klaar voor ophalen]
 *   (impliciete kolom)    (werkplekken, gesorteerd op volgorde)   (impliciete kolom)
 *
 * Real-time: Convex subscriptions updaten automatisch — alle tablets zien
 * hetzelfde bord. Geen refresh nodig.
 *
 * Rol-gating:
 *   balie+ → ziet "+ Nieuwe Werkorder" knop + seed-prompt
 *   monteur → ziet alleen het bord + logboek
 */

import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import {
    useWerkplekken,
    useWerkorders,
    useSeedDefaultWerkplekken,
    type WerkorderVerrijkt,
    type WerkplekDoc,
} from "../hooks/useWerkplaats";
import { useRol } from "../hooks/useRol";
import WerkorderKaart from "./WerkorderKaart";
import WerkorderLogboek from "./WerkorderLogboek";
import NieuweWerkorderModal from "./NieuweWerkorderModal";

// ---------------------------------------------------------------------------
// KolomHeader helper
// ---------------------------------------------------------------------------

const WERKPLEK_ICOON: Record<string, string> = {
    Brug: "🔩",
    Uitlijnbrug: "📐",
    Wasplaats: "🚿",
    Buiten: "🅿️",
    Overig: "🔲",
};

function KolomHeader({ naam, type, teller }: { naam: string; type: string; teller: number }) {
    const icoon = WERKPLEK_ICOON[type] ?? "🔲";
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "1px solid var(--color-border)",
            marginBottom: "var(--space-3)",
        }}>
            <h2 style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-semibold)",
                color: "var(--color-heading)",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
            }}>
                <span>{icoon}</span>
                <span>{naam}</span>
            </h2>
            <span style={{
                fontSize: "var(--text-xs)",
                fontWeight: "var(--weight-semibold)",
                color: teller > 0 ? "var(--color-heading)" : "var(--color-muted)",
                background: teller > 0 ? "var(--gradient-accent-subtle)" : "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-full, 9999px)",
                padding: "0.15em 0.55em",
                minWidth: "1.6em",
                textAlign: "center",
            }}>
                {teller}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Kolom component
// ---------------------------------------------------------------------------

interface KolomProps {
    naam: string;
    type: string;
    orders: WerkorderVerrijkt[];
    werkplekken: WerkplekDoc[];
    domeinRol: ReturnType<typeof useRol>["domeinRol"];
    onOpenLogboek: (id: Id<"werkorders">) => void;
}

function WerkplekKolom({ naam, type, orders, werkplekken, domeinRol, onOpenLogboek }: KolomProps) {
    return (
        <div style={{
            minWidth: "280px",
            maxWidth: "320px",
            flex: "0 0 auto",
            background: "var(--glass-bg)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-xl)",
            display: "flex",
            flexDirection: "column",
            maxHeight: "calc(100vh - 180px)",
            overflow: "hidden",
        }}>
            <KolomHeader naam={naam} type={type} teller={orders.length} />

            {/* Kaartjes */}
            <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "0 var(--space-3) var(--space-3)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
            }}>
                {orders.length === 0 ? (
                    <div style={{
                        textAlign: "center",
                        padding: "var(--space-8) var(--space-4)",
                        color: "var(--color-muted)",
                        fontSize: "var(--text-sm)",
                    }}>
                        <span style={{ fontSize: "1.5em" }}>🟢</span>
                        <p style={{ margin: "var(--space-2) 0 0" }}>Vrij</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <WerkorderKaart
                            key={order._id}
                            order={order}
                            werkplekken={werkplekken}
                            domeinRol={domeinRol}
                            onOpenLogboek={onOpenLogboek}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// WerkplaatsBord (hoofd-component)
// ---------------------------------------------------------------------------

export default function WerkplaatsBord() {
    const werkplekken = useWerkplekken();
    const werkorders = useWerkorders();
    const { domeinRol, isBalie, isLoading: rolLaden } = useRol();
    const seedWerkplekken = useSeedDefaultWerkplekken();

    const [logboekOrderId, setLogboekOrderId] = useState<Id<"werkorders"> | null>(null);
    const [seeding, setSeeding] = useState(false);
    const [toonNieuweWerkorderModal, setToonNieuweWerkorderModal] = useState(false);

    // Laden state
    if (werkplekken === undefined || werkorders === undefined) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <div style={{ textAlign: "center", color: "var(--color-muted)" }}>
                    <p style={{ fontSize: "var(--text-xl, 1.5rem)", marginBottom: "var(--space-2)" }}>⚙️</p>
                    <p style={{ fontSize: "var(--text-sm)" }}>Werkplaatsbord laden…</p>
                </div>
            </div>
        );
    }

    // Seed prompt: als balie+ en nog geen werkplekken
    if (werkplekken.length === 0 && isBalie && !rolLaden) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <div style={{
                    textAlign: "center",
                    padding: "var(--space-8)",
                    background: "var(--glass-bg)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-xl)",
                    maxWidth: "420px",
                }}>
                    <p style={{ fontSize: "2rem", marginBottom: "var(--space-4)" }}>🔧</p>
                    <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", marginBottom: "var(--space-2)" }}>
                        Werkplaats instellen
                    </h2>
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--space-6)" }}>
                        Er zijn nog geen werkplekken geconfigureerd. Klik hieronder om Brug 1, Brug 2 en Uitlijnbrug als standaard aan te maken.
                    </p>
                    <button
                        onClick={async () => {
                            setSeeding(true);
                            await seedWerkplekken({});
                            setSeeding(false);
                        }}
                        disabled={seeding}
                        className="btn btn-primary"
                        style={{ minHeight: "48px", width: "100%" }}
                    >
                        {seeding ? "Aanmaken…" : "🏗️ Standaard werkplekken aanmaken"}
                    </button>
                </div>
            </div>
        );
    }

    // Groepeer werkorders per kolom
    const wachtend = werkorders.filter((o) => !o.werkplekId && o.status !== "Klaar");
    const klaar = werkorders.filter((o) => o.status === "Klaar");
    const perWerkplek = (plekId: Id<"werkplekken">) =>
        werkorders.filter((o) => o.werkplekId === plekId && o.status !== "Klaar");

    return (
        <div>
            {/* Toolbar: alleen acties — paginatitel zit in werkplaats.astro page-kop */}
            {isBalie && (
                <div style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: "var(--space-4)",
                }}>
                    <button
                        className="btn btn-primary btn-sm"
                        id="nieuwe-werkorder-btn"
                        aria-label="Nieuwe werkorder aanmaken"
                        onClick={() => setToonNieuweWerkorderModal(true)}
                        style={{ minHeight: "44px" }}
                    >
                        + Nieuwe werkorder
                    </button>
                </div>
            )}

            {/* Kanban bord — horizontaal scrollbaar */}
            <div style={{
                display: "flex",
                gap: "var(--space-4)",
                overflowX: "auto",
                paddingBottom: "var(--space-4)",
                alignItems: "flex-start",
            }}>
                {/* Kolom 1: Wachtend (Buiten) */}
                <WerkplekKolom
                    naam="Wachtend / Buiten"
                    type="Buiten"
                    orders={wachtend}
                    werkplekken={werkplekken}
                    domeinRol={domeinRol}
                    onOpenLogboek={setLogboekOrderId}
                />

                {/* Dynamische werkplek-kolommen */}
                {werkplekken.map((plek) => (
                    <WerkplekKolom
                        key={plek._id}
                        naam={plek.naam}
                        type={plek.type}
                        orders={perWerkplek(plek._id)}
                        werkplekken={werkplekken}
                        domeinRol={domeinRol}
                        onOpenLogboek={setLogboekOrderId}
                    />
                ))}

                {/* Laatste kolom: Klaar voor ophalen */}
                <WerkplekKolom
                    naam="Klaar voor ophalen"
                    type="Overig"
                    orders={klaar}
                    werkplekken={werkplekken}
                    domeinRol={domeinRol}
                    onOpenLogboek={setLogboekOrderId}
                />
            </div>

            {/* Logboek modal */}
            {logboekOrderId && (
                <WerkorderLogboek
                    werkorderId={logboekOrderId}
                    onSluit={() => setLogboekOrderId(null)}
                />
            )}

            {toonNieuweWerkorderModal && (
                <NieuweWerkorderModal
                    onSluit={() => setToonNieuweWerkorderModal(false)}
                />
            )}
        </div>
    );
}
