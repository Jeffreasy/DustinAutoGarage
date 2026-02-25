/**
 * src/components/werkplaats/WerkorderKaart.tsx
 *
 * Het werkorder-kaartje op het Werkplaatsbord.
 * ui-ux-pro-max: alle emoji's vervangen door SVG icons, window.confirm → inline confirm UI.
 */

import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import type { WerkorderVerrijkt, WerkplekDoc } from "../../hooks/useWerkplaats";
import { useVerplaatsNaarWerkplek, useUpdateStatus, useWijsMonteurtoe } from "../../hooks/useWerkplaats";
import type { DomeinRol } from "../../../convex/helpers";
import WerkorderAfsluitenModal from "../modals/WerkorderAfsluitenModal";
import WerkorderDetailModal from "../modals/WerkorderDetailModal";

// ---------------------------------------------------------------------------
// Avatar helpers
// ---------------------------------------------------------------------------

const AVATAR_KLEUREN = [
    "#0d7a5f", "#2563eb", "#d97706", "#dc2626",
    "#0891b2", "#65a30d", "#9333ea", "#db2777",
];

function avatarInitialen(naam: string): string {
    const delen = naam.trim().split(/\s+/);
    if (delen.length === 1) return delen[0].slice(0, 2).toUpperCase();
    return (delen[0][0] + delen[delen.length - 1][0]).toUpperCase();
}

function avatarKleur(naam: string): string {
    let hash = 0;
    for (const c of naam) hash = (hash + c.charCodeAt(0)) % AVATAR_KLEUREN.length;
    return AVATAR_KLEUREN[hash];
}

// ---------------------------------------------------------------------------
// Status config — emoji labels verwijderd, kleur geeft de context al
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, {
    label: string;
    accentKleur: string;
    badgeBg: string;
    badgeBorder: string;
    badgeTekst: string;
}> = {
    "Gepland": { label: "Gepland", accentKleur: "#8b5cf6", badgeBg: "#f5f3ff", badgeBorder: "#c4b5fd", badgeTekst: "#5b21b6" },
    "Aanwezig": { label: "Aanwezig", accentKleur: "#0891b2", badgeBg: "#ecfeff", badgeBorder: "#67e8f9", badgeTekst: "#164e63" },
    "Wachtend": { label: "Wachtend", accentKleur: "#6b7280", badgeBg: "var(--color-surface)", badgeBorder: "var(--color-border)", badgeTekst: "var(--color-muted)" },
    "Bezig": { label: "Bezig", accentKleur: "#f59e0b", badgeBg: "#fffbeb", badgeBorder: "#fcd34d", badgeTekst: "#92400e" },
    "Wacht op onderdelen": { label: "Wacht op onderdelen", accentKleur: "#3b82f6", badgeBg: "#eff6ff", badgeBorder: "#93c5fd", badgeTekst: "#1e3a5f" },
    "Klaar": { label: "Klaar", accentKleur: "#22c55e", badgeBg: "#f0fdf4", badgeBorder: "#86efac", badgeTekst: "#14532d" },
    "Afgerond": { label: "Afgerond", accentKleur: "#16a34a", badgeBg: "#f0fdf4", badgeBorder: "#4ade80", badgeTekst: "#14532d" },
    "Geannuleerd": { label: "Geannuleerd", accentKleur: "#dc2626", badgeBg: "#fef2f2", badgeBorder: "#fca5a5", badgeTekst: "#7f1d1d" },
};

function getStatusCfg(status: string) {
    return STATUS_CONFIG[status] ?? {
        label: status, accentKleur: "#6b7280",
        badgeBg: "var(--color-surface)", badgeBorder: "var(--color-border)", badgeTekst: "var(--color-muted)",
    };
}

// ---------------------------------------------------------------------------
// SVG icons
// ---------------------------------------------------------------------------

function IconCalendar() {
    return <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}
function IconAlertCircle() {
    return <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
}
function IconArrowRight() {
    return <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
}
function IconClock() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}
function IconClipboard() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>;
}
function IconFlag() {
    return <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>;
}
function IconChevronsRight() {
    return <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>;
}
function IconCheckCircle() {
    return <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
}
function IconXCircle() {
    return <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>;
}
function IconArrowLeft() {
    return <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
}

// Werkplek-type SVGs voor de action sheet
function IconWrench() {
    return <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>;
}
function IconRuler() {
    return <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7l4-4 14 14-4 4z" /><line x1="8" y1="12" x2="12" y2="8" /><line x1="12" y1="16" x2="16" y2="12" /></svg>;
}
function IconDroplets() {
    return <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" /><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" /></svg>;
}
function IconParking() {
    return <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></svg>;
}
function IconGrid() {
    return <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>;
}
// Monteur self-assign icons
function IconUserCheck() {
    return <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>;
}
function IconUserMinus() {
    return <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="23" y1="11" x2="17" y2="11" /></svg>;
}

const WERKPLEK_TYPE_SVG: Record<string, React.ReactNode> = {
    Brug: <IconWrench />, Uitlijnbrug: <IconRuler />, Wasplaats: <IconDroplets />,
    Buiten: <IconParking />, Overig: <IconGrid />,
};

// ---------------------------------------------------------------------------
// WerkorderKaart
// ---------------------------------------------------------------------------

interface WerkorderKaartProps {
    order: WerkorderVerrijkt;
    werkplekken: WerkplekDoc[];
    domeinRol: DomeinRol | null;
    /** _id van het eigen medewerkers-record — voor eigenaar/balie self-assign */
    mijnId: Id<"medewerkers"> | null;
    onOpenLogboek: (orderId: Id<"werkorders">) => void;
}

export default function WerkorderKaart({ order, werkplekken, domeinRol, mijnId, onOpenLogboek }: WerkorderKaartProps) {
    const [toonVerplaatsSheet, setToonVerplaatsSheet] = useState(false);
    const [toonWachtInput, setToonWachtInput] = useState(false);
    const [wachtNotitie, setWachtNotitie] = useState("");
    const [toonAfsluitenModal, setToonAfsluitenModal] = useState(false);
    const [toonDetail, setToonDetail] = useState(false);
    const [bezig, setBezig] = useState(false);
    const [toonAnnuleerConfirm, setToonAnnuleerConfirm] = useState(false);

    const verplaats = useVerplaatsNaarWerkplek();
    const updateStatus = useUpdateStatus();
    const wijsMonteur = useWijsMonteurtoe();

    const isMonteur = domeinRol === "monteur" || domeinRol === "balie" || domeinRol === "eigenaar";
    const isBalie = domeinRol === "balie" || domeinRol === "eigenaar";
    const isEigenaar = domeinRol === "eigenaar";

    // Bepaal of de eigenaar/balie zichzelf heeft ingeschreven als monteur
    const ikBenIngeschreven = mijnId !== null && order.monteursId === mijnId;

    const statusCfg = getStatusCfg(order.status);
    // Klaar orders mogen terug naar een brug (bijv. aanvullend werk nodig)
    const beschikbarePlekken = werkplekken.filter((p) => p._id !== order.werkplekId);

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------

    async function handleVerplaats(werkplekId: Id<"werkplekken"> | undefined) {
        setBezig(true);
        setToonVerplaatsSheet(false);
        try {
            await verplaats({ werkorderId: order._id, werkplekId, nieuweStatus: werkplekId ? "Bezig" : "Wachtend" });
        } finally { setBezig(false); }
    }

    async function handleAanwezig() {
        setBezig(true);
        try { await updateStatus({ werkorderId: order._id, nieuweStatus: "Aanwezig", notitie: "Auto aanwezig op terrein" }); }
        finally { setBezig(false); }
    }

    async function handleNaarWachtend() {
        setBezig(true);
        try { await updateStatus({ werkorderId: order._id, nieuweStatus: "Wachtend", notitie: "Auto klaargezet voor brug" }); }
        finally { setBezig(false); }
    }

    async function handleAutoKlaar() {
        setBezig(true);
        try { await updateStatus({ werkorderId: order._id, nieuweStatus: "Klaar", notitie: "Auto gereed voor ophalen" }); }
        finally { setBezig(false); }
    }

    /** Eigenaar/balie schrijft zichzelf in als monteur — volledig gelogged via wijsMonteurtoe */
    async function handleInschrijven() {
        if (!mijnId) return;
        setBezig(true);
        try { await wijsMonteur({ werkorderId: order._id, monteursId: mijnId }); }
        finally { setBezig(false); }
    }

    /** Eigenaar/balie meldt zichzelf af als monteur */
    async function handleAfmelden() {
        setBezig(true);
        try { await wijsMonteur({ werkorderId: order._id, monteursId: undefined }); }
        finally { setBezig(false); }
    }

    async function handleGeannuleerd() {
        setBezig(true);
        setToonAnnuleerConfirm(false);
        try { await updateStatus({ werkorderId: order._id, nieuweStatus: "Geannuleerd", notitie: "Geannuleerd door balie" }); }
        finally { setBezig(false); }
    }

    async function handleWachtOpOnderdelen() {
        setBezig(true);
        setToonWachtInput(false);
        try {
            await updateStatus({ werkorderId: order._id, nieuweStatus: "Wacht op onderdelen", notitie: wachtNotitie.trim() || undefined });
            setWachtNotitie("");
        } finally { setBezig(false); }
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <>
            <div style={{
                borderRadius: "var(--radius-xl)",
                background: "var(--glass-bg)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: `1px solid ${statusCfg.accentKleur}44`,
                boxShadow: "var(--glass-shadow)",
                display: "flex", flexDirection: "column", gap: "var(--space-3)",
                position: "relative", overflow: "hidden",
                transition: "border-color var(--transition-base)",
            }}>
                {/* Accent streep */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: statusCfg.accentKleur }} />

                {/* Klikbare kaart-inhoud */}
                <div
                    style={{ padding: "calc(var(--space-4) + 3px) var(--space-4) 0", cursor: isBalie ? "pointer" : "default" }}
                    onClick={isBalie ? () => setToonDetail(true) : undefined}
                    role={isBalie ? "button" : undefined}
                    aria-label={isBalie ? `Werkorder details ${order.voertuig?.kenteken ?? ""}` : undefined}
                    tabIndex={isBalie ? 0 : undefined}
                    onKeyDown={isBalie ? (e) => { if (e.key === "Enter" || e.key === " ") setToonDetail(true); } : undefined}
                >
                    {/* 1. Kenteken + Status */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-2)", flexWrap: "wrap" }}>
                        <span
                            style={{
                                fontFamily: "var(--font-mono)", fontWeight: 900,
                                fontSize: "clamp(1.5rem, 3.5vw, 2rem)", letterSpacing: "0.08em",
                                color: "var(--color-heading)",
                                background: "var(--gradient-accent-subtle)",
                                border: "2px solid var(--color-border-luminous)",
                                borderRadius: "var(--radius-md)", padding: "0.1em 0.4em", lineHeight: 1.2,
                            }}
                            aria-label={`Kenteken ${order.voertuig?.kenteken ?? "onbekend"}`}
                        >
                            {order.voertuig?.kenteken ?? "—"}
                        </span>

                        <span style={{
                            fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                            color: statusCfg.badgeTekst, background: statusCfg.badgeBg,
                            border: `1px solid ${statusCfg.badgeBorder}`,
                            borderRadius: "9999px", padding: "0.2em 0.65em", whiteSpace: "nowrap", marginTop: "4px",
                        }}>
                            {statusCfg.label}
                        </span>
                    </div>

                    {/* 2. Merk + Model */}
                    <p style={{ color: "var(--color-heading)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", margin: "var(--space-2) 0 0", lineHeight: 1.3 }}>
                        {order.voertuig ? `${order.voertuig.merk} ${order.voertuig.model}` : "Voertuig onbekend"}
                    </p>

                    {/* 3. Klacht — rood blok met SVG icon */}
                    <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)", marginTop: "var(--space-2)", display: "flex", alignItems: "flex-start", gap: "var(--space-1)" }}>
                        <span style={{ flexShrink: 0, marginTop: "1px" }}><IconAlertCircle /></span>
                        <p style={{ color: "#dc2626", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", margin: 0, lineHeight: 1.4 }}>
                            {order.klacht}
                        </p>
                    </div>

                    {/* 4. Datum + Monteur */}
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-2)", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <IconCalendar />
                            {new Date(order.afspraakDatum).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
                        </span>

                        {order.monteur ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                <span
                                    aria-label={`Monteur: ${order.monteur.naam}`}
                                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "50%", background: avatarKleur(order.monteur.naam), color: "#fff", fontSize: "10px", fontWeight: 700, flexShrink: 0, letterSpacing: "0.03em" }}
                                >
                                    {avatarInitialen(order.monteur.naam)}
                                </span>
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{order.monteur.naam}</span>
                            </div>
                        ) : (
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontStyle: "italic" }}>Geen monteur</span>
                        )}
                    </div>
                </div>

                {/* Actiezone */}
                {isMonteur && (
                    <div
                        style={{ padding: "0 var(--space-4) var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Rij 1: Verplaatsen + Wacht + Logboek */}
                        <div style={{ display: "flex", gap: "var(--space-2)" }}>
                            {/* Verplaatsen: altijd zichtbaar behalve bij definitief gesloten statussen */}
                            {!["Afgerond", "Geannuleerd"].includes(order.status) && (
                                <button
                                    onClick={() => { setToonVerplaatsSheet(!toonVerplaatsSheet); setToonWachtInput(false); }}
                                    disabled={bezig}
                                    className="btn btn-primary btn-sm"
                                    aria-expanded={toonVerplaatsSheet}
                                    aria-label="Verplaatsen"
                                    style={{ flex: 1, minHeight: "48px", fontSize: "var(--text-sm)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--space-1)" }}
                                >
                                    {toonVerplaatsSheet ? "Annuleren" : <><IconArrowRight /> Verplaatsen</>}
                                </button>
                            )}

                            {isMonteur && order.status === "Bezig" && (
                                <button
                                    onClick={() => { setToonWachtInput(!toonWachtInput); setToonVerplaatsSheet(false); }}
                                    disabled={bezig}
                                    className="btn btn-ghost btn-sm"
                                    title="Wacht op onderdelen"
                                    aria-label="Wacht op onderdelen"
                                    style={{ minHeight: "48px", minWidth: "48px", padding: "0 var(--space-2)", display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                    <IconClock />
                                </button>
                            )}

                            <button
                                onClick={() => onOpenLogboek(order._id)}
                                className="btn btn-ghost btn-sm"
                                title="Logboek bekijken"
                                aria-label="Logboek bekijken"
                                style={{ minHeight: "48px", minWidth: "48px", padding: "0 var(--space-2)", display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                                <IconClipboard />
                            </button>
                        </div>

                        {/* Gepland → Aanwezig */}
                        {isBalie && order.status === "Gepland" && (
                            <button onClick={handleAanwezig} disabled={bezig} className="btn btn-sm" aria-label="Markeer als aanwezig"
                                style={{ minHeight: "48px", width: "100%", background: "linear-gradient(135deg, #0891b2, #0e7490)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}>
                                <IconFlag /> {bezig ? "…" : "Auto aanwezig"}
                            </button>
                        )}

                        {/* Aanwezig → Wachtend */}
                        {isBalie && order.status === "Aanwezig" && (
                            <button onClick={handleNaarWachtend} disabled={bezig} className="btn btn-ghost btn-sm" aria-label="Klaarzetten voor brug"
                                style={{ minHeight: "48px", width: "100%", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}>
                                <IconChevronsRight /> {bezig ? "…" : "Klaarzetten voor brug"}
                            </button>
                        )}

                        {/* Monteur: Auto klaar — zet op Klaar voor ophalen */}
                        {isMonteur && (order.status === "Bezig" || order.status === "Wacht op onderdelen") && (
                            <button
                                onClick={handleAutoKlaar}
                                disabled={bezig}
                                className="btn btn-sm"
                                aria-label="Auto klaar voor ophalen"
                                style={{ minHeight: "48px", width: "100%", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}
                            >
                                <IconCheckCircle /> {bezig ? "…" : "Auto klaar"}
                            </button>
                        )}

                        {/* Afsluiten */}
                        {isBalie && order.status === "Klaar" && (
                            <button onClick={() => setToonAfsluitenModal(true)} className="btn btn-sm"
                                style={{ minHeight: "48px", width: "100%", background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}
                                aria-label="Werkorder definitief afsluiten">
                                <IconCheckCircle /> Doorsturen
                            </button>
                        )}

                        {/* Eigenaar/balie: zichzelf aanmelden als monteur op deze werkorder */}
                        {isEigenaar && !['Afgerond', 'Geannuleerd'].includes(order.status) && (
                            ikBenIngeschreven ? (
                                <button
                                    onClick={handleAfmelden}
                                    disabled={bezig}
                                    className="btn btn-ghost btn-sm"
                                    aria-label="Zichzelf als monteur afmelden"
                                    style={{ minHeight: "40px", width: "100%", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--space-1)" }}
                                >
                                    <IconUserMinus /> Afmelden als monteur
                                </button>
                            ) : (
                                <button
                                    onClick={handleInschrijven}
                                    disabled={bezig || !mijnId}
                                    className="btn btn-ghost btn-sm"
                                    aria-label="Zichzelf als monteur aanmelden"
                                    style={{ minHeight: "40px", width: "100%", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-accent-text, #0891b2)", borderColor: "rgba(8,145,178,0.3)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--space-1)" }}
                                >
                                    <IconUserCheck /> Aanmelden als monteur
                                </button>
                            )
                        )}

                        {/* Annuleer-knop + inline confirm (vervangt window.confirm) */}
                        {isBalie && !["Klaar", "Afgerond", "Geannuleerd"].includes(order.status) && !toonAnnuleerConfirm && (
                            <button onClick={() => setToonAnnuleerConfirm(true)} disabled={bezig} className="btn btn-ghost btn-sm"
                                aria-label="Werkorder annuleren"
                                style={{ minHeight: "40px", width: "100%", color: "var(--color-error, #dc2626)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", borderColor: "rgba(220,38,38,0.3)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--space-1)" }}>
                                <IconXCircle /> Afspraak annuleren
                            </button>
                        )}

                        {/* Inline confirm banner */}
                        {toonAnnuleerConfirm && (
                            <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#991b1b", fontWeight: "var(--weight-semibold)" }}>
                                    Werkorder voor {order.voertuig?.kenteken ?? "dit voertuig"} annuleren?
                                </p>
                                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                                    <button onClick={handleGeannuleerd} disabled={bezig} className="btn btn-sm"
                                        style={{ flex: 1, minHeight: "36px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-xs)", cursor: "pointer" }}>
                                        {bezig ? "…" : "Ja, annuleren"}
                                    </button>
                                    <button onClick={() => setToonAnnuleerConfirm(false)} className="btn btn-ghost btn-sm"
                                        style={{ flex: 1, minHeight: "36px", fontSize: "var(--text-xs)" }}>
                                        Nee
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Verplaats action sheet */}
                        {toonVerplaatsSheet && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", padding: "var(--space-3)", borderRadius: "var(--radius-lg)", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                                {beschikbarePlekken.map((plek) => (
                                    <button key={plek._id} onClick={() => handleVerplaats(plek._id)} disabled={bezig}
                                        style={{ minHeight: "56px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "var(--glass-bg)", color: "var(--color-heading)", cursor: "pointer", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px", transition: "border-color var(--transition-base)" }}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-primary, #0d7a5f)"; }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; }}
                                        aria-label={`Verplaats naar ${plek.naam}`}
                                    >
                                        <span style={{ color: "var(--color-muted)" }}>{WERKPLEK_TYPE_SVG[plek.type] ?? <IconGrid />}</span>
                                        <span style={{ fontSize: "var(--text-xs)" }}>{plek.naam}</span>
                                    </button>
                                ))}

                                {order.werkplekId && (
                                    <button onClick={() => handleVerplaats(undefined)} disabled={bezig}
                                        style={{ minHeight: "56px", borderRadius: "var(--radius-md)", border: "1px dashed var(--color-border)", background: "transparent", color: "var(--color-muted)", cursor: "pointer", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px" }}
                                        aria-label="Terug naar Wachtend / Buiten">
                                        <IconArrowLeft />
                                        <span>Buiten</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Wacht op onderdelen invoer */}
                        {toonWachtInput && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", padding: "var(--space-3)", borderRadius: "var(--radius-lg)", background: "#eff6ff", border: "1px solid #93c5fd" }}>
                                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#1e3a5f", fontWeight: "var(--weight-semibold)", display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                                    <IconClock /> Wacht op onderdelen — voeg notitie toe:
                                </p>
                                <input
                                    type="text" value={wachtNotitie} onChange={(e) => setWachtNotitie(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleWachtOpOnderdelen(); }}
                                    placeholder="bijv. Draagarmrubber bestellen bij Van Mossel"
                                    aria-label="Notitie voor wacht op onderdelen"
                                    style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid #93c5fd", background: "#fff", color: "#1e3a5f", fontSize: "var(--text-sm)", minHeight: "44px" }}
                                    autoFocus
                                />
                                <button onClick={handleWachtOpOnderdelen} disabled={bezig}
                                    style={{ minHeight: "44px", borderRadius: "var(--radius-md)", background: "#3b82f6", color: "#fff", border: "none", cursor: "pointer", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}
                                    aria-label="Bevestigen: wacht op onderdelen">
                                    <IconClock /> {bezig ? "…" : "Bevestig — Wacht op onderdelen"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {toonAfsluitenModal && (
                <WerkorderAfsluitenModal werkorderId={order._id} kenteken={order.voertuig?.kenteken ?? "—"} klacht={order.klacht} onSluit={() => setToonAfsluitenModal(false)} />
            )}
            {toonDetail && (
                <WerkorderDetailModal order={order} onSluit={() => setToonDetail(false)} />
            )}
        </>
    );
}
