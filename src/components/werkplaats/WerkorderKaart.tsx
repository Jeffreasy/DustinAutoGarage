/**
 * src/components/werkplaats/WerkorderKaart.tsx
 *
 * Werkorder-kaart op het Kanban-bord.
 *
 * Architectuur:
 *  – Card body    : info (klik → DetailModal of Rapport)
 *  – Primary bar  : 1–2 prominente acties voor de HUIDIGE status
 *  – Secondary    : Verplaatsen-sheet + overflow-menu voor util-acties
 *
 * Design: glassmorphism dark, geen layout-shift, 44px min touch targets.
 */

import { useState } from "react";
import { createPortal } from "react-dom";
import type React from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import type { WerkorderVerrijkt, WerkplekDoc, AfsluitingReden } from "../../hooks/useWerkplaats";
import { useVerplaatsNaarWerkplek, useUpdateStatus, useWijsMonteurtoe, useAnnuleerWerkorder } from "../../hooks/useWerkplaats";
import type { DomeinRol } from "../../../convex/helpers";
import WerkorderAfsluitenModal from "../modals/WerkorderAfsluitenModal";
import WerkorderDetailModal from "../modals/WerkorderDetailModal";
import WerkorderRapportPanel from "./WerkorderRapportPanel";

// ---------------------------------------------------------------------------
// Avatar helpers
// ---------------------------------------------------------------------------

const AVATAR_KLEUREN = [
    "#0d7a5f", "#2563eb", "#d97706", "#dc2626",
    "#0891b2", "#65a30d", "#7c3aed", "#db2777",
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
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, {
    label: string;
    accent: string;
    badgeBg: string;
    badgeBorder: string;
    badgeTekst: string;
}> = {
    "Gepland": { label: "Gepland", accent: "var(--color-info)", badgeBg: "var(--color-info-bg)", badgeBorder: "var(--color-info-border)", badgeTekst: "var(--color-info-text)" },
    "Aanwezig": { label: "Aanwezig", accent: "var(--color-muted)", badgeBg: "var(--color-surface)", badgeBorder: "var(--color-border)", badgeTekst: "var(--color-muted)" },
    "Wachtend": { label: "Wachtend", accent: "var(--color-muted)", badgeBg: "var(--color-surface)", badgeBorder: "var(--color-border)", badgeTekst: "var(--color-muted)" },
    "Bezig": { label: "Bezig", accent: "var(--color-warning)", badgeBg: "var(--color-warning-bg)", badgeBorder: "var(--color-warning-border)", badgeTekst: "var(--color-warning-text)" },
    "Wacht op onderdelen": { label: "Wacht op onderdelen", accent: "var(--color-info)", badgeBg: "var(--color-info-bg)", badgeBorder: "var(--color-info-border)", badgeTekst: "var(--color-info-text)" },
    "Klaar": { label: "Klaar", accent: "var(--color-success)", badgeBg: "var(--color-success-bg)", badgeBorder: "var(--color-success-border)", badgeTekst: "var(--color-success-text)" },
    "Afgerond": { label: "Afgerond", accent: "var(--color-success)", badgeBg: "var(--color-success-bg)", badgeBorder: "var(--color-success-border)", badgeTekst: "var(--color-success-text)" },
    "Geannuleerd": { label: "Geannuleerd", accent: "var(--color-error)", badgeBg: "var(--color-error-bg)", badgeBorder: "var(--color-error-border)", badgeTekst: "var(--color-error-text)" },
};

function getStatusCfg(status: string) {
    return STATUS_CONFIG[status] ?? {
        label: status, accent: "#6b7280",
        badgeBg: "var(--color-surface)", badgeBorder: "var(--color-border)", badgeTekst: "var(--color-muted)",
    };
}

// ---------------------------------------------------------------------------
// Icons (inline SVG — geen externe deps)
// ---------------------------------------------------------------------------

const I = {
    Calendar: () => <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    Alert: () => <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
    ArrowRight: () => <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
    ArrowLeft: () => <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
    Clock: () => <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    Clipboard: () => <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>,
    Flag: () => <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>,
    Chevrons: () => <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>,
    Check: () => <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
    XCircle: () => <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>,
    Wrench: () => <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>,
    Ruler: () => <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7l4-4 14 14-4 4z" /><line x1="8" y1="12" x2="12" y2="8" /><line x1="12" y1="16" x2="16" y2="12" /></svg>,
    Droplets: () => <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" /><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" /></svg>,
    Parking: () => <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></svg>,
    Grid: () => <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
    UserCheck: () => <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></svg>,
    UserMinus: () => <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="23" y1="11" x2="17" y2="11" /></svg>,
    MoreHoriz: () => <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="19" cy="12" r="1.5" fill="currentColor" /></svg>,
};

const WERKPLEK_TYPE_SVG: Record<string, React.ReactNode> = {
    Brug: <I.Wrench />, Uitlijnbrug: <I.Ruler />, Wasplaats: <I.Droplets />,
    Buiten: <I.Parking />, Overig: <I.Grid />,
};

// ---------------------------------------------------------------------------
// Kleine herbruikbare Button
// ---------------------------------------------------------------------------

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "success" | "info" | "ghost" | "error";
    size?: "sm" | "md";
    full?: boolean;
}

function Btn({ variant = "ghost", size = "md", full, children, style, ...rest }: BtnProps) {
    const h = size === "sm" ? "40px" : "44px";
    const fs = size === "sm" ? "var(--text-xs)" : "var(--text-sm)";
    const base: React.CSSProperties = {
        minHeight: h, display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: "var(--space-1)", borderRadius: "var(--radius-md)", cursor: "pointer",
        fontWeight: "var(--weight-semibold)", fontSize: fs, transition: "opacity 150ms, box-shadow 150ms",
        width: full ? "100%" : undefined, border: "none", padding: "0 var(--space-3)",
        touchAction: "manipulation",
    };
    const variants: Record<string, React.CSSProperties> = {
        primary: { background: "var(--color-primary, #0d7a5f)", color: "#fff" },
        success: { background: "var(--color-success)", color: "#fff" },
        info: { background: "var(--color-info, #2563eb)", color: "#fff" },
        ghost: { background: "transparent", color: "var(--color-body)", border: "1px solid var(--color-border)" },
        error: { background: "var(--color-error-bg)", color: "var(--color-error)", border: "1px solid var(--color-error-border)" },
    };
    return (
        <button {...rest} style={{ ...base, ...variants[variant], ...style }}>
            {children}
        </button>
    );
}

// ---------------------------------------------------------------------------
// WerkorderKaart
// ---------------------------------------------------------------------------

interface WerkorderKaartProps {
    order: WerkorderVerrijkt;
    werkplekken: WerkplekDoc[];
    domeinRol: DomeinRol | null;
    mijnId: Id<"medewerkers"> | null;
    onOpenLogboek: (id: Id<"werkorders">) => void;
}

export default function WerkorderKaart({ order, werkplekken, domeinRol, mijnId, onOpenLogboek }: WerkorderKaartProps) {
    const [toonVerplaats, setToonVerplaats] = useState(false);
    const [toonWacht, setToonWacht] = useState(false);
    const [wachtNotitie, setWachtNotitie] = useState("");
    const [toonAfsluiten, setToonAfsluiten] = useState(false);
    const [toonDetail, setToonDetail] = useState(false);
    const [toonRapport, setToonRapport] = useState(false);
    const [toonAnnuleer, setToonAnnuleer] = useState(false);
    const [annuleerReden, setAnnuleerReden] = useState<AfsluitingReden>("Klant geannuleerd");
    const [bezig, setBezig] = useState(false);
    const [toonMenu, setToonMenu] = useState(false);

    const verplaats = useVerplaatsNaarWerkplek();
    const updateStatus = useUpdateStatus();
    const wijsMonteur = useWijsMonteurtoe();
    const annuleer = useAnnuleerWerkorder();

    const isBalie = domeinRol === "balie" || domeinRol === "eigenaar";
    const isMonteur = domeinRol === "monteur" || isBalie;
    const isEigenaar = domeinRol === "eigenaar";
    const ikBenIngeschreven = mijnId !== null && order.monteursId === mijnId;
    const isGesloten = order.status === "Afgerond" || order.status === "Geannuleerd";

    const statusCfg = getStatusCfg(order.status);
    const beschikbarePlekken = werkplekken.filter(
        (p) => p._id !== order.werkplekId && (p.status === undefined || p.status === "Beschikbaar")
    );

    // -----------------------------------------------------------------------
    // Handlers
    // -----------------------------------------------------------------------

    async function act<T>(fn: () => Promise<T>) {
        setBezig(true);
        try { await fn(); }
        finally { setBezig(false); }
    }

    const handleVerplaats = (werkplekId: Id<"werkplekken"> | undefined) =>
        act(() => verplaats({ werkorderId: order._id, werkplekId, nieuweStatus: werkplekId ? "Bezig" : "Wachtend" }));

    const handleVerplaatsNaarStatus = (nieuweStatus: "Gepland" | "Aanwezig") =>
        act(() => { setToonVerplaats(false); return verplaats({ werkorderId: order._id, werkplekId: undefined, nieuweStatus }); });

    const handleAanwezig = () => act(() => updateStatus({ werkorderId: order._id, nieuweStatus: "Aanwezig", notitie: "Auto aanwezig op terrein" }));
    const handleNaarWachtend = () => act(() => updateStatus({ werkorderId: order._id, nieuweStatus: "Wachtend", notitie: "Auto klaargezet voor brug" }));
    const handleAutoKlaar = () => act(() => updateStatus({ werkorderId: order._id, nieuweStatus: "Klaar", notitie: "Auto gereed voor ophalen" }));
    const handleInschrijven = () => { if (!mijnId) return; act(() => wijsMonteur({ werkorderId: order._id, monteursId: mijnId })); };
    const handleAfmelden = () => act(() => wijsMonteur({ werkorderId: order._id, monteursId: undefined }));
    const handleAnnuleer = () => act(() => { setToonAnnuleer(false); return annuleer({ werkorderId: order._id, afsluitingReden: annuleerReden }); });
    const handleWacht = () => act(async () => {
        setToonWacht(false);
        await updateStatus({ werkorderId: order._id, nieuweStatus: "Wacht op onderdelen", notitie: wachtNotitie.trim() || undefined });
        setWachtNotitie("");
    });

    // -----------------------------------------------------------------------
    // Render helpers — primaire actie per status
    // -----------------------------------------------------------------------

    function PrimaryActions() {
        if (isGesloten) return null;

        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>

                {/* Status-specifieke primaire knop (balie) */}
                {isBalie && order.status === "Gepland" && (
                    <Btn variant="info" full disabled={bezig} onClick={handleAanwezig}>
                        <I.Flag /> {bezig ? "…" : "Auto aanwezig"}
                    </Btn>
                )}
                {isBalie && order.status === "Aanwezig" && (
                    <Btn variant="ghost" full disabled={bezig} onClick={handleNaarWachtend}>
                        <I.Chevrons /> {bezig ? "…" : "Klaarzetten voor brug"}
                    </Btn>
                )}
                {isMonteur && (order.status === "Bezig" || order.status === "Wacht op onderdelen") && (
                    <Btn variant="success" full disabled={bezig} onClick={handleAutoKlaar}>
                        <I.Check /> {bezig ? "…" : "Auto klaar"}
                    </Btn>
                )}
                {isBalie && order.status === "Klaar" && (
                    <Btn variant="success" full onClick={() => setToonAfsluiten(true)}>
                        <I.Check /> Doorsturen
                    </Btn>
                )}

                {/* Knoppenrij 2: Rapport + Verplaatsen side-by-side */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                    {isMonteur && (
                        <Btn variant="ghost" size="sm" full onClick={() => setToonRapport(true)}>
                            <I.Wrench /> Rapport
                        </Btn>
                    )}
                    {isMonteur && (
                        <Btn
                            variant="ghost" size="sm" full
                            onClick={() => { setToonVerplaats(v => !v); setToonWacht(false); setToonMenu(false); }}
                            style={toonVerplaats ? { background: "var(--color-surface)", borderColor: "var(--color-primary)" } : undefined}
                        >
                            <I.ArrowRight /> Verplaatsen
                        </Btn>
                    )}
                </div>

                {/* Wacht op onderdelen (Bezig only) — compact inline */}
                {isMonteur && order.status === "Bezig" && (
                    <Btn variant="ghost" size="sm" full
                        onClick={() => { setToonWacht(v => !v); setToonVerplaats(false); setToonMenu(false); }}
                        style={{ color: "var(--color-info-text)", borderColor: "var(--color-info-border)" }}>
                        <I.Clock /> Wacht op onderdelen
                    </Btn>
                )}
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <>
            <style>{`
                .wk-btn:hover:not(:disabled) { opacity: 0.85; }
                .wk-btn:active:not(:disabled) { opacity: 0.7; }
                .werkplek-opt:hover:not(:disabled) {
                    border-color: var(--color-primary, #0d7a5f) !important;
                    background: var(--glass-bg) !important;
                }
            `}</style>

            <div style={{
                borderRadius: "var(--radius-xl)",
                background: "var(--glass-bg)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: `1px solid ${statusCfg.accent}44`,
                boxShadow: "var(--glass-shadow)",
                display: "flex", flexDirection: "column",
                position: "relative",
            }}>
                {/* Status accent streep */}
                <div style={{ position: "absolute", inset: "0 0 auto 0", height: "3px", background: statusCfg.accent }} />

                {/* ── Card header (klikbaar voor detail) ── */}
                <div
                    style={{ padding: "calc(var(--space-4) + 3px) var(--space-4) var(--space-3)", cursor: (isBalie || isMonteur) ? "pointer" : "default" }}
                    onClick={isBalie ? () => setToonDetail(true) : isMonteur ? () => setToonRapport(true) : undefined}
                    role={(isBalie || isMonteur) ? "button" : undefined}
                    tabIndex={(isBalie || isMonteur) ? 0 : undefined}
                    aria-label={isBalie ? `Details ${order.voertuig?.kenteken}` : isMonteur ? `Rapport ${order.voertuig?.kenteken}` : undefined}
                    onKeyDown={(isBalie || isMonteur) ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            if (isBalie) setToonDetail(true);
                            else if (isMonteur) setToonRapport(true);
                        }
                    } : undefined}
                >
                    {/* Kenteken + status badge */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-2)" }}>
                        <span style={{
                            fontFamily: "var(--font-mono)", fontWeight: "var(--weight-black)",
                            fontSize: "clamp(1.4rem, 3vw, 1.9rem)", letterSpacing: "0.07em",
                            color: "var(--color-heading)",
                            background: "var(--gradient-accent-subtle)",
                            border: "2px solid var(--color-border-luminous)",
                            borderRadius: "var(--radius-md)", padding: "0.05em 0.35em", lineHeight: 1.25,
                        }}>
                            {order.voertuig?.kenteken ?? "—"}
                        </span>
                        <span style={{
                            fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                            color: statusCfg.badgeTekst, background: statusCfg.badgeBg,
                            border: `1px solid ${statusCfg.badgeBorder}`,
                            borderRadius: "var(--radius-full)", padding: "0.25em 0.65em",
                            whiteSpace: "nowrap", marginTop: "4px", flexShrink: 0,
                        }}>
                            {statusCfg.label}
                        </span>
                    </div>

                    {/* Merk + model */}
                    <p style={{ color: "var(--color-heading)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", margin: "var(--space-2) 0 0", lineHeight: 1.3 }}>
                        {order.voertuig ? `${order.voertuig.merk} ${order.voertuig.model}` : "Voertuig onbekend"}
                    </p>

                    {/* Klacht */}
                    <div style={{
                        background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)",
                        borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)",
                        marginTop: "var(--space-2)", display: "flex", alignItems: "flex-start", gap: "var(--space-1)",
                    }}>
                        <span style={{ flexShrink: 0, marginTop: "1px" }}><I.Alert /></span>
                        <p style={{ color: "var(--color-error)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-xs)", margin: 0, lineHeight: 1.4 }}>
                            {order.klacht}
                        </p>
                    </div>

                    {/* Datum + monteur */}
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-2)", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <I.Calendar />
                            {new Date(order.afspraakDatum).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
                        </span>
                        {order.monteur ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                                <span aria-label={`Monteur: ${order.monteur.naam}`} style={{
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    width: "22px", height: "22px", borderRadius: "50%",
                                    background: avatarKleur(order.monteur.naam), color: "#fff",
                                    fontSize: "9px", fontWeight: "var(--weight-bold)", flexShrink: 0,
                                }}>
                                    {avatarInitialen(order.monteur.naam)}
                                </span>
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{order.monteur.naam}</span>
                            </div>
                        ) : (
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontStyle: "italic" }}>Geen monteur</span>
                        )}
                    </div>
                </div>

                {/* ── Divider ── */}
                <div style={{ height: "1px", background: "var(--color-border)", margin: "0 var(--space-4)" }} />

                {/* ── Actiezone ── */}
                {isMonteur && (
                    <div
                        style={{ padding: "var(--space-3) var(--space-4) var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <PrimaryActions />

                        {/* ── Overflow menu trigger (Logboek / Zichzelf in/afmelden / Annuleren / Terug naar status) ── */}
                        {!isGesloten && (
                            <div style={{ position: "relative" }}>
                                <Btn
                                    variant="ghost" size="sm" full
                                    onClick={() => { setToonMenu(v => !v); setToonVerplaats(false); setToonWacht(false); }}
                                    aria-label="Meer opties"
                                    aria-expanded={toonMenu}
                                    style={{ color: "var(--color-muted)" }}
                                >
                                    <I.MoreHoriz />
                                    <span style={{ fontSize: "var(--text-xs)" }}>Meer</span>
                                </Btn>

                                {toonMenu && (
                                    <div style={{
                                        background: "var(--color-surface)", border: "1px solid var(--color-border)",
                                        borderRadius: "var(--radius-lg)", padding: "var(--space-2)",
                                        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                                        display: "flex", flexDirection: "column", gap: "var(--space-1)",
                                        marginTop: "var(--space-1)",
                                    }}>
                                        {/* Logboek */}
                                        <MenuRow icon={<I.Clipboard />} label="Logboek bekijken" onClick={() => { setToonMenu(false); onOpenLogboek(order._id); }} />

                                        {/* Eigenaar: zichzelf in/afmelden */}
                                        {isEigenaar && (
                                            ikBenIngeschreven
                                                ? <MenuRow icon={<I.UserMinus />} label="Afmelden als monteur" onClick={() => { setToonMenu(false); handleAfmelden(); }} />
                                                : <MenuRow icon={<I.UserCheck />} label="Aanmelden als monteur" onClick={() => { setToonMenu(false); handleInschrijven(); }} />
                                        )}

                                        {/* Balie+: terugzetten naar Gepland / Aanwezig */}
                                        {isBalie && !["Gepland", "Aanwezig"].includes(order.status) && (
                                            <>
                                                <div style={{ height: "1px", background: "var(--color-border)", margin: "var(--space-1) 0" }} />
                                                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontWeight: "var(--weight-semibold)", padding: "0 var(--space-2)", margin: 0 }}>
                                                    Terugplaatsen (correctie)
                                                </p>
                                                {order.status !== "Gepland" && (
                                                    <MenuRow icon={<I.ArrowLeft />} label="← Gepland" onClick={() => { setToonMenu(false); handleVerplaatsNaarStatus("Gepland"); }} />
                                                )}
                                                {order.status !== "Aanwezig" && (
                                                    <MenuRow icon={<I.ArrowLeft />} label="← Aanwezig" onClick={() => { setToonMenu(false); handleVerplaatsNaarStatus("Aanwezig"); }} />
                                                )}
                                            </>
                                        )}

                                        {/* Annuleren */}
                                        {isBalie && !["Klaar", "Afgerond", "Geannuleerd"].includes(order.status) && (
                                            <>
                                                <div style={{ height: "1px", background: "var(--color-border)", margin: "var(--space-1) 0" }} />
                                                <button
                                                    onClick={() => { setToonMenu(false); setToonAnnuleer(true); }}
                                                    style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-2)", borderRadius: "var(--radius-md)", border: "none", background: "transparent", color: "var(--color-error)", cursor: "pointer", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", width: "100%", textAlign: "left", touchAction: "manipulation" }}
                                                >
                                                    <I.XCircle />
                                                    Afspraak annuleren
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Verplaats sheet ── */}
                        {toonVerplaats && (
                            <VerplaatsSheet
                                beschikbarePlekken={beschikbarePlekken}
                                heeftWerkplek={!!order.werkplekId}
                                isKlaar={order.status === "Klaar"}
                                bezig={bezig}
                                onVerplaats={(id) => { setToonVerplaats(false); handleVerplaats(id); }}
                            />
                        )}

                        {/* ── Wacht op onderdelen invoer ── */}
                        {toonWacht && (
                            <WachtInvoer
                                notitie={wachtNotitie}
                                onChange={setWachtNotitie}
                                onConfirm={handleWacht}
                                bezig={bezig}
                            />
                        )}

                        {/* ── Annuleer confirm ── */}
                        {toonAnnuleer && (
                            <AnnuleerConfirm
                                kenteken={order.voertuig?.kenteken ?? "dit voertuig"}
                                reden={annuleerReden}
                                onRedenChange={setAnnuleerReden}
                                onConfirm={handleAnnuleer}
                                onCancel={() => setToonAnnuleer(false)}
                                bezig={bezig}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* ── Modals / Panels — via portal zodat ze buiten de kolom-scrolllijst vallen ── */}
            {toonAfsluiten && createPortal(
                <WerkorderAfsluitenModal werkorderId={order._id} kenteken={order.voertuig?.kenteken ?? "—"} klacht={order.klacht} onSluit={() => setToonAfsluiten(false)} />,
                document.body
            )}
            {toonDetail && createPortal(
                <WerkorderDetailModal order={order} onSluit={() => setToonDetail(false)} onOpenRapport={() => { setToonDetail(false); setToonRapport(true); }} />,
                document.body
            )}
            {toonRapport && createPortal(
                <WerkorderRapportPanel werkorderId={order._id} domeinRol={domeinRol} onSluit={() => setToonRapport(false)} />,
                document.body
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// MenuRow helper
// ---------------------------------------------------------------------------

function MenuRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: "flex", alignItems: "center", gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-2)", borderRadius: "var(--radius-md)",
                border: "none", background: "transparent", color: "var(--color-body)",
                cursor: "pointer", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)",
                width: "100%", textAlign: "left", touchAction: "manipulation",
            }}
        >
            <span style={{ color: "var(--color-muted)", flexShrink: 0 }}>{icon}</span>
            {label}
        </button>
    );
}

// ---------------------------------------------------------------------------
// VerplaatsSheet sub-component
// ---------------------------------------------------------------------------

interface VerplaatsSheetProps {
    beschikbarePlekken: WerkplekDoc[];
    heeftWerkplek: boolean;
    isKlaar: boolean;
    bezig: boolean;
    onVerplaats: (id: Id<"werkplekken"> | undefined) => void;
}

function VerplaatsSheet({ beschikbarePlekken, heeftWerkplek, isKlaar, bezig, onVerplaats }: VerplaatsSheetProps) {
    return (
        <div style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)", padding: "var(--space-3)",
            display: "flex", flexDirection: "column", gap: "var(--space-2)",
        }}>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-muted)", fontWeight: "var(--weight-semibold)" }}>
                Selecteer doellocatie
            </p>

            {isKlaar && (
                <div style={{
                    display: "flex", alignItems: "center", gap: "var(--space-1)",
                    padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)",
                    background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)",
                    fontSize: "var(--text-xs)", color: "var(--color-warning-text)", fontWeight: "var(--weight-semibold)",
                }}>
                    <I.Clock /> Status wordt teruggezet naar "Bezig"
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                {beschikbarePlekken.map((plek) => (
                    <button
                        key={plek._id}
                        className="werkplek-opt"
                        onClick={() => onVerplaats(plek._id)}
                        disabled={bezig}
                        aria-label={`Verplaats naar ${plek.naam}`}
                        style={{
                            minHeight: "52px", borderRadius: "var(--radius-md)",
                            border: "1px solid var(--color-border)", background: "var(--glass-bg)",
                            color: "var(--color-heading)", cursor: "pointer",
                            fontWeight: "var(--weight-semibold)", fontSize: "var(--text-xs)",
                            display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", gap: "3px",
                            transition: "border-color 150ms, background 150ms",
                            touchAction: "manipulation",
                        }}
                    >
                        <span style={{ color: "var(--color-muted)" }}>{WERKPLEK_TYPE_SVG[plek.type] ?? <I.Grid />}</span>
                        <span>{plek.naam}</span>
                    </button>
                ))}

                {heeftWerkplek && (
                    <button
                        className="werkplek-opt"
                        onClick={() => onVerplaats(undefined)}
                        disabled={bezig}
                        aria-label="Terug naar Wachtend / Buiten"
                        style={{
                            minHeight: "52px", borderRadius: "var(--radius-md)",
                            border: "1px dashed var(--color-border)", background: "transparent",
                            color: "var(--color-muted)", cursor: "pointer",
                            fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                            display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", gap: "3px",
                            touchAction: "manipulation",
                        }}
                    >
                        <I.ArrowLeft />
                        <span>Buiten</span>
                    </button>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// WachtInvoer sub-component
// ---------------------------------------------------------------------------

function WachtInvoer({ notitie, onChange, onConfirm, bezig }: {
    notitie: string; onChange: (v: string) => void; onConfirm: () => void; bezig: boolean;
}) {
    return (
        <div style={{
            background: "var(--color-info-bg)", border: "1px solid var(--color-info-border)",
            borderRadius: "var(--radius-lg)", padding: "var(--space-3)",
            display: "flex", flexDirection: "column", gap: "var(--space-2)",
        }}>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-info-text)", fontWeight: "var(--weight-semibold)", display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                <I.Clock /> Notitie (optioneel)
            </p>
            <input
                type="text" value={notitie} onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onConfirm(); }}
                placeholder="bijv. Draagarmrubber bestellen bij Van Mossel…"
                aria-label="Notitie voor wacht op onderdelen"
                style={{
                    padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-info-border)", background: "var(--color-surface)",
                    color: "var(--color-heading)", fontSize: "var(--text-sm)", minHeight: "44px",
                }}
            />
            <Btn variant="info" full disabled={bezig} onClick={onConfirm}>
                <I.Clock /> {bezig ? "…" : "Bevestig — Wacht op onderdelen"}
            </Btn>
        </div>
    );
}

// ---------------------------------------------------------------------------
// AnnuleerConfirm sub-component
// ---------------------------------------------------------------------------

function AnnuleerConfirm({ kenteken, reden, onRedenChange, onConfirm, onCancel, bezig }: {
    kenteken: string; reden: AfsluitingReden;
    onRedenChange: (r: AfsluitingReden) => void;
    onConfirm: () => void; onCancel: () => void; bezig: boolean;
}) {
    return (
        <div style={{
            background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)",
            borderRadius: "var(--radius-md)", padding: "var(--space-3)",
            display: "flex", flexDirection: "column", gap: "var(--space-2)",
        }}>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-error-text)", fontWeight: "var(--weight-semibold)" }}>
                Werkorder voor {kenteken} annuleren?
            </p>
            <select
                value={reden}
                onChange={(e) => onRedenChange(e.target.value as AfsluitingReden)}
                aria-label="Reden van annulering"
                style={{
                    width: "100%", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-error-border)", background: "var(--color-error-bg)",
                    color: "var(--color-error-text)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                    cursor: "pointer", minHeight: "44px",
                }}
            >
                {(["Klant geannuleerd", "Klant niet verschenen", "Geen toestemming klant", "Onderdelen niet leverbaar", "Dubbele boeking", "Overig"] as AfsluitingReden[]).map(
                    (r) => <option key={r} value={r}>{r}</option>
                )}
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                <Btn variant="error" full disabled={bezig} onClick={onConfirm}>
                    {bezig ? "…" : "Ja, annuleren"}
                </Btn>
                <Btn variant="ghost" full onClick={onCancel}>Nee</Btn>
            </div>
        </div>
    );
}
