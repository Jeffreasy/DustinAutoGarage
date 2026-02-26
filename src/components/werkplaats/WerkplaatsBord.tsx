/**
 * src/components/werkplaats/WerkplaatsBord.tsx
 *
 * Het Digitaal Werkplaatsbord — Kanban-hoofdcomponent.
 * Icons geïmporteerd uit gedeelde Icons.tsx (geen lokale duplicaten).
 */

import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import {
    useWerkplekken, useWerkorders, useSeedDefaultWerkplekken,
    type WerkorderVerrijkt, type WerkplekDoc, type WerkplekStatus,
} from "../../hooks/useWerkplaats";
import { useRol } from "../../hooks/useRol";
import WerkorderKaart from "./WerkorderKaart";
import WerkorderLogboek from "./WerkorderLogboek";
import NieuweWerkorderModal from "../modals/NieuweWerkorderModal";
import {
    IconWrench, IconPlus, IconCheckCircle,
    getWerkplekIcon,
    type WerkplekType,
} from "../ui/Icons";


// ---------------------------------------------------------------------------
// KolomHeader
// ---------------------------------------------------------------------------

function KolomHeader({ naam, type, teller, status }: { naam: string; type: string; teller: number; status?: WerkplekStatus }) {
    const icon = getWerkplekIcon((type as WerkplekType) ?? "Overig");
    const isGeblokkeerd = status === "In onderhoud" || status === "Buiten gebruik";
    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "1px solid var(--color-border)",
            marginBottom: "var(--space-3)",
        }}>
            <h2 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: isGeblokkeerd ? "var(--color-muted)" : "var(--color-heading)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ color: "var(--color-muted)" }}>{icon}</span>
                <span>{naam}</span>
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                {/* Status badge — alleen tonen als niet Beschikbaar */}
                {status && status !== "Beschikbaar" && (
                    <span style={{
                        fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                        color: status === "In onderhoud" ? "var(--color-warning-text)" : "var(--color-body)",
                        background: status === "In onderhoud" ? "var(--color-warning-bg)" : "var(--color-surface)",
                        border: `1px solid ${status === "In onderhoud" ? "var(--color-warning-border)" : "var(--color-border)"}`,
                        borderRadius: "var(--radius-full)", padding: "1px 8px", whiteSpace: "nowrap",
                    }}>
                        {status}
                    </span>
                )}
                <span style={{
                    fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                    color: teller > 0 ? "var(--color-heading)" : "var(--color-muted)",
                    background: teller > 0 ? "var(--gradient-accent-subtle)" : "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-full)", padding: "0.15em 0.55em",
                    minWidth: "1.6em", textAlign: "center",
                }}>
                    {teller}
                </span>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// WerkplekKolom
// ---------------------------------------------------------------------------

interface KolomProps {
    naam: string;
    type: string;
    status?: WerkplekStatus;
    orders: WerkorderVerrijkt[];
    werkplekken: WerkplekDoc[];
    domeinRol: ReturnType<typeof useRol>["domeinRol"];
    mijnId: ReturnType<typeof useRol>["mijnId"];
    onOpenLogboek: (id: Id<"werkorders">) => void;
}

function WerkplekKolom({ naam, type, status, orders, werkplekken, domeinRol, mijnId, onOpenLogboek }: KolomProps) {
    const isBuitenGebruik = status === "Buiten gebruik";
    const isInOnderhoud = status === "In onderhoud";

    return (
        <div style={{
            minWidth: "280px", maxWidth: "320px", flex: "0 0 auto",
            background: "var(--glass-bg)", backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: isBuitenGebruik
                ? "1px solid var(--color-border)"
                : isInOnderhoud
                    ? "1px solid var(--color-warning-border)"
                    : "1px solid var(--glass-border)",
            borderRadius: "var(--radius-xl)",
            display: "flex", flexDirection: "column",
            maxHeight: "calc(100vh - 180px)", overflow: "hidden",
            opacity: isBuitenGebruik ? 0.45 : 1,
            transition: "opacity 200ms ease",
        }}>
            <KolomHeader naam={naam} type={type} teller={orders.length} status={status} />

            {/* Onderhoud-banner: oranje melding bovenin de kolom */}
            {isInOnderhoud && (
                <div style={{
                    margin: "0 var(--space-3) var(--space-2)",
                    padding: "var(--space-2) var(--space-3)",
                    background: "var(--color-warning-bg)",
                    border: "1px solid var(--color-warning-border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--text-xs)",
                    color: "var(--color-warning-text)",
                    fontWeight: "var(--weight-semibold)",
                    display: "flex", alignItems: "center", gap: "var(--space-2)",
                }}>
                    <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Niet beschikbaar voor nieuwe werkorders
                </div>
            )}

            <div style={{ flex: 1, overflowY: "auto", padding: "0 var(--space-3) var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {orders.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "var(--space-8) var(--space-4)", color: "var(--color-muted)", fontSize: "var(--text-sm)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)" }}>
                        {!isInOnderhoud && !isBuitenGebruik && (
                            <>
                                <span style={{ display: "inline-flex", width: "10px", height: "10px", borderRadius: "50%", background: "var(--color-success)", boxShadow: "0 0 6px var(--color-success-border)" }} aria-hidden="true" />
                                <p style={{ margin: 0 }}>Vrij</p>
                            </>
                        )}
                    </div>
                ) : (
                    orders.map((order) => (
                        <WerkorderKaart
                            key={order._id} order={order}
                            werkplekken={werkplekken} domeinRol={domeinRol}
                            mijnId={mijnId}
                            onOpenLogboek={onOpenLogboek}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// WerkplaatsBord
// ---------------------------------------------------------------------------

export default function WerkplaatsBord() {
    const werkplekken = useWerkplekken();
    const werkorders = useWerkorders();
    const { domeinRol, isBalie, isLoading: rolLaden, mijnId } = useRol();
    const seedWerkplekken = useSeedDefaultWerkplekken();

    const [logboekOrderId, setLogboekOrderId] = useState<Id<"werkorders"> | null>(null);
    const [seeding, setSeeding] = useState(false);
    const [toonNieuweWerkorderModal, setToonNieuweWerkorderModal] = useState(false);

    // Laden state — SVG spinner
    if (werkplekken === undefined || werkorders === undefined) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <div style={{ textAlign: "center", color: "var(--color-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
                    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={2} strokeLinecap="round" aria-label="Laden" style={{ animation: "spin 1s linear infinite" }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <p style={{ fontSize: "var(--text-sm)", margin: 0 }}>Werkplaatsbord laden…</p>
                </div>
            </div>
        );
    }

    // Geen werkplekken — toon rol-specifieke lege staat
    if (werkplekken.length === 0 && !rolLaden) {
        if (!isBalie) {
            return (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                    <div style={{
                        textAlign: "center", padding: "var(--space-8)",
                        background: "var(--glass-bg)", backdropFilter: "blur(12px)",
                        border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
                        maxWidth: "380px", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)",
                    }}>
                        <span style={{ color: "var(--color-muted)" }}><IconWrench size={28} /></span>
                        <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", margin: 0 }}>
                            Werkplaats niet geconfigureerd
                        </h2>
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", margin: 0 }}>
                            Er zijn nog geen werkplekken aangemaakt. Neem contact op met de balie of eigenaar.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <div style={{
                    textAlign: "center", padding: "var(--space-8)",
                    background: "var(--glass-bg)", backdropFilter: "blur(12px)",
                    border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
                    maxWidth: "420px", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)",
                }}>
                    <span style={{ color: "var(--color-muted)" }}><IconWrench size={32} /></span>
                    <div>
                        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", marginBottom: "var(--space-2)", marginTop: 0 }}>
                            Werkplaats instellen
                        </h2>
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", margin: 0 }}>
                            Er zijn nog geen werkplekken geconfigureerd. Klik hieronder om Brug 1, Brug 2 en Uitlijnbrug als standaard aan te maken.
                        </p>
                    </div>
                    <button
                        onClick={async () => { setSeeding(true); await seedWerkplekken({}); setSeeding(false); }}
                        disabled={seeding}
                        className="btn btn-primary"
                        style={{ minHeight: "48px", width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}
                    >
                        {seeding ? (
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        ) : <IconCheckCircle />}
                        {seeding ? "Aanmaken…" : "Standaard werkplekken aanmaken"}
                    </button>
                </div>
            </div>
        );
    }

    const actief = werkorders.filter((o) => !o.gearchiveerd && o.status !== "Afgerond" && o.status !== "Geannuleerd");
    const gepland = actief.filter((o) => o.status === "Gepland");
    const aanwezig = actief.filter((o) => o.status === "Aanwezig");
    const wachtend = actief.filter((o) => !o.werkplekId && o.status === "Wachtend");
    const klaar = actief.filter((o) => o.status === "Klaar");
    const perWerkplek = (plekId: Id<"werkplekken">) =>
        actief.filter((o) => o.werkplekId === plekId && o.status !== "Klaar");

    return (
        <div>
            {isBalie && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-4)" }}>
                    <button
                        className="btn btn-primary btn-sm"
                        id="nieuwe-werkorder-btn"
                        aria-label="Nieuwe werkorder aanmaken"
                        onClick={() => setToonNieuweWerkorderModal(true)}
                        style={{ minHeight: "44px", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                    >
                        <IconPlus /> Nieuwe werkorder
                    </button>
                </div>
            )}

            {/* Kanban bord */}
            <div style={{ display: "flex", gap: "var(--space-4)", overflowX: "auto", paddingBottom: "var(--space-4)", alignItems: "flex-start" }}>
                {gepland.length > 0 && (
                    <WerkplekKolom naam="Gepland" type="Overig" orders={gepland} werkplekken={werkplekken} domeinRol={domeinRol} mijnId={mijnId} onOpenLogboek={setLogboekOrderId} />
                )}
                {aanwezig.length > 0 && (
                    <WerkplekKolom naam="Aanwezig" type="Buiten" orders={aanwezig} werkplekken={werkplekken} domeinRol={domeinRol} mijnId={mijnId} onOpenLogboek={setLogboekOrderId} />
                )}
                <WerkplekKolom naam="Wachtend / Buiten" type="Buiten" orders={wachtend} werkplekken={werkplekken} domeinRol={domeinRol} mijnId={mijnId} onOpenLogboek={setLogboekOrderId} />

                {werkplekken.map((plek) => (
                    <WerkplekKolom
                        key={plek._id} naam={plek.naam} type={plek.type}
                        status={plek.status}
                        orders={perWerkplek(plek._id)} werkplekken={werkplekken}
                        domeinRol={domeinRol} mijnId={mijnId} onOpenLogboek={setLogboekOrderId}
                    />
                ))}


                <WerkplekKolom naam="Klaar voor ophalen" type="Overig" orders={klaar} werkplekken={werkplekken} domeinRol={domeinRol} mijnId={mijnId} onOpenLogboek={setLogboekOrderId} />
            </div>

            {logboekOrderId && (
                <WerkorderLogboek werkorderId={logboekOrderId} onSluit={() => setLogboekOrderId(null)} />
            )}
            {toonNieuweWerkorderModal && (
                <NieuweWerkorderModal onSluit={() => setToonNieuweWerkorderModal(false)} />
            )}
        </div>
    );
}
