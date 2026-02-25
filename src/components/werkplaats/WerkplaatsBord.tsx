/**
 * src/components/werkplaats/WerkplaatsBord.tsx
 *
 * Het Digitaal Werkplaatsbord — Kanban-hoofdcomponent.
 * ui-ux-pro-max: SVG icons voor kolommen, laadspinner, seed prompt, lege staat, + knop.
 */

import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import {
    useWerkplekken, useWerkorders, useSeedDefaultWerkplekken,
    type WerkorderVerrijkt, type WerkplekDoc,
} from "../../hooks/useWerkplaats";
import { useRol } from "../../hooks/useRol";
import WerkorderKaart from "./WerkorderKaart";
import WerkorderLogboek from "./WerkorderLogboek";
import NieuweWerkorderModal from "../modals/NieuweWerkorderModal";

// ---------------------------------------------------------------------------
// SVG icons voor werkplek-types
// ---------------------------------------------------------------------------

function IconWrench({ size = 14 }: { size?: number }) {
    return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>;
}
function IconRuler({ size = 14 }: { size?: number }) {
    return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7l4-4 14 14-4 4z" /><line x1="8" y1="12" x2="12" y2="8" /><line x1="12" y1="16" x2="16" y2="12" /></svg>;
}
function IconDroplets({ size = 14 }: { size?: number }) {
    return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" /><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" /></svg>;
}
function IconParking({ size = 14 }: { size?: number }) {
    return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></svg>;
}
function IconGrid({ size = 14 }: { size?: number }) {
    return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>;
}
function IconPlus() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
function IconCheckCircle() {
    return <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#16a34a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
}

// ---------------------------------------------------------------------------
// Type → SVG mapper
// ---------------------------------------------------------------------------

const TYPE_SVG: Record<string, React.ReactNode> = {
    Brug: <IconWrench />,
    Uitlijnbrug: <IconRuler />,
    Wasplaats: <IconDroplets />,
    Buiten: <IconParking />,
    Overig: <IconGrid />,
};

// ---------------------------------------------------------------------------
// KolomHeader
// ---------------------------------------------------------------------------

function KolomHeader({ naam, type, teller }: { naam: string; type: string; teller: number }) {
    const icon = TYPE_SVG[type] ?? <IconGrid />;
    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "1px solid var(--color-border)",
            marginBottom: "var(--space-3)",
        }}>
            <h2 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ color: "var(--color-muted)" }}>{icon}</span>
                <span>{naam}</span>
            </h2>
            <span style={{
                fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                color: teller > 0 ? "var(--color-heading)" : "var(--color-muted)",
                background: teller > 0 ? "var(--gradient-accent-subtle)" : "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "9999px", padding: "0.15em 0.55em",
                minWidth: "1.6em", textAlign: "center",
            }}>
                {teller}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// WerkplekKolom
// ---------------------------------------------------------------------------

interface KolomProps {
    naam: string;
    type: string;
    orders: WerkorderVerrijkt[];
    werkplekken: WerkplekDoc[];
    domeinRol: ReturnType<typeof useRol>["domeinRol"];
    mijnId: ReturnType<typeof useRol>["mijnId"];
    onOpenLogboek: (id: Id<"werkorders">) => void;
}

function WerkplekKolom({ naam, type, orders, werkplekken, domeinRol, mijnId, onOpenLogboek }: KolomProps) {
    return (
        <div style={{
            minWidth: "280px", maxWidth: "320px", flex: "0 0 auto",
            background: "var(--glass-bg)", backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid var(--glass-border)", borderRadius: "var(--radius-xl)",
            display: "flex", flexDirection: "column",
            maxHeight: "calc(100vh - 180px)", overflow: "hidden",
        }}>
            <KolomHeader naam={naam} type={type} teller={orders.length} />

            <div style={{ flex: 1, overflowY: "auto", padding: "0 var(--space-3) var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {orders.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "var(--space-8) var(--space-4)", color: "var(--color-muted)", fontSize: "var(--text-sm)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)" }}>
                        <span style={{ display: "inline-flex", width: "10px", height: "10px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.5)" }} aria-hidden="true" />
                        <p style={{ margin: 0 }}>Vrij</p>
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
            // Monteur kan niet seeden — toon informatieve melding
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

        // Balie/eigenaar kan seeden
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
