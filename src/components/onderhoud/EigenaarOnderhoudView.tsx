/**
 * src/components/onderhoud/EigenaarOnderhoudView.tsx
 *
 * Eigenaar — Onderhoudshistorie Dashboard
 *
 * Tabs:
 *   1. Overzicht   — correcte KPI's (totaalStatistieken), recente activiteitsfeed
 *   2. Voertuig    — dossier per kenteken zoeken
 *   3. Activiteit  — garage-brede audit trail (werkorderLogs)
 */

import { useState, useMemo, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import {
    useVoertuigHistorie,
    useRecenteBeurtenVerrijkt,
    useTotaalStatistieken,
    useGarageActiviteit,
} from "../../hooks/useOnderhoud";
import BeurtenOverzichtModal from "../modals/BeurtenOverzichtModal";
import NieuweBeurtModal from "../modals/NieuweBeurtModal";
import RecenteBeurtenModal from "../modals/RecenteBeurtenModal";
import WerkorderDetailModal from "../modals/WerkorderDetailModal";
import type { WerkorderVerrijkt } from "../../hooks/useWerkplaats";
import { TYPE_ICOON, SOORT_CONFIG, formatDatum } from "./utils";
import type { TypeWerk } from "./utils";

// ---------------------------------------------------------------------------
// SVG Icons (geen emoji's — ui-ux-pro-max regel)
// ---------------------------------------------------------------------------

const IconWrench = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
);

const IconClipboard = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2h6l1 3H8z" /><rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" />
    </svg>
);

const IconActivity = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);

const IconCar = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2" />
        <circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
);

const IconSearch = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const IconTrash = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
        <path d="M9 6V4h6v2" />
    </svg>
);

const IconPlus = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const IconChevronLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

// ---------------------------------------------------------------------------
// KPI Blokken — correcte data via useTotaalStatistieken
// ---------------------------------------------------------------------------

// Inline SVG icon helper (data-only SOORT_CONFIG in utils.ts)
function SoortSvg({ type, size = 16 }: { type: string; size?: number }) {
    const cfg = SOORT_CONFIG[type];
    if (!cfg) return null;
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={cfg.iconPath} />
        </svg>
    );
}

function KPIDashboard() {
    const stats = useTotaalStatistieken();
    const [toonBeurtenModal, setToonBeurtenModal] = useState(false);
    const [modalFilter, setModalFilter]           = useState("Alle");

    function openGefilterd(filter: string) {
        setModalFilter(filter);
        setToonBeurtenModal(true);
    }

    const kpis = [
        {
            label: "Totaal beurten",
            waarde: stats?.totaal ?? "—",
            iconType: "Grote Beurt",
            color: "var(--color-accent-text)",
            bg: "var(--color-accent-dim)",
            filter: "Alle",
        },
        {
            label: "APK's deze maand",
            waarde: stats?.apksDezeMaand ?? "—",
            iconType: "APK",
            color: "var(--color-accent-text)",
            bg: "var(--color-accent-dim)",
            filter: "APK",
        },
        {
            label: "Grote beurten",
            waarde: stats?.groteBeurten ?? "—",
            iconType: "Grote Beurt",
            color: "var(--color-warning)",
            bg: "var(--color-warning-bg)",
            filter: "Grote Beurt",
        },
        {
            label: "Kleine beurten",
            waarde: stats?.kleineBeurten ?? "—",
            iconType: "Kleine Beurt",
            color: "var(--color-info)",
            bg: "var(--color-info-bg)",
            filter: "Kleine Beurt",
        },
        {
            label: "Reparaties",
            waarde: stats?.reparaties ?? "—",
            iconType: "Reparatie",
            color: "var(--color-error)",
            bg: "var(--color-error-bg)",
            filter: "Reparatie",
        },
    ];

    return (
        <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "var(--space-3)" }}>
                {kpis.map(({ label, waarde, iconType, color, bg, filter }) => (
                    <button
                        key={label}
                        onClick={() => openGefilterd(filter)}
                        style={{
                            all: "unset",
                            display: "flex", flexDirection: "column", gap: "var(--space-3)",
                            padding: "var(--space-4) var(--space-5)",
                            borderLeft: `3px solid ${color}`,
                            borderRadius: "var(--radius-md)",
                            background: "var(--color-surface)",
                            border: `1px solid var(--color-border)`,
                            borderLeftWidth: "3px", borderLeftColor: color,
                            position: "relative", overflow: "hidden",
                            cursor: "pointer", boxSizing: "border-box", width: "100%",
                            textAlign: "left", transition: "background var(--transition-fast)",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--color-surface-2)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "var(--color-surface)"; }}
                        aria-label={`${label} bekijken: ${waarde}`}
                    >
                        <div style={{ position: "absolute", top: "var(--space-3)", right: "var(--space-3)", color, background: bg, borderRadius: "var(--radius-sm)", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <SoortSvg type={iconType} />
                        </div>
                        <div style={{ fontSize: "var(--text-3xl)", fontWeight: "var(--weight-bold)", color: stats ? "var(--color-heading)" : "var(--color-muted)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                            {stats === undefined ? (
                                <span style={{ display: "inline-block", width: "3ch", height: "1em", background: "var(--skeleton-base)", borderRadius: "var(--radius-xs)", animation: "pulse 1.5s ease infinite" }} />
                            ) : waarde}
                        </div>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontWeight: "var(--weight-medium)", textTransform: "uppercase", letterSpacing: "var(--tracking-wider)" }}>
                            {label}
                        </div>
                        <div style={{ fontSize: "9px", color, fontWeight: "var(--weight-semibold)", marginTop: "auto" }}>
                            bekijk →
                        </div>
                    </button>
                ))}
            </div>

            {toonBeurtenModal && (
                <BeurtenOverzichtModal onSluit={() => setToonBeurtenModal(false)} initieelFilter={modalFilter} />
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// Recente Activiteitsfeed (onderhoudshistorie verrijkt)
// ---------------------------------------------------------------------------

type BeurtVerrijkt = NonNullable<ReturnType<typeof useRecenteBeurtenVerrijkt>>[number];

function ActiviteitsFeed({ onOpenDossier }: { onOpenDossier: (v: Doc<"voertuigen">) => void }) {
    const beurten = useRecenteBeurtenVerrijkt(25);

    if (beurten === undefined) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="card" style={{ padding: "var(--space-4)", height: "68px", background: "var(--skeleton-base)", animation: "pulse 1.5s ease infinite" }} />
                ))}
            </div>
        );
    }

    if (beurten.length === 0) {
        return (
            <div className="card" style={{ padding: "var(--space-10)", textAlign: "center" }}>
                <svg viewBox="0 0 24 24" width={40} height={40} fill="none" stroke="var(--color-border)" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true" style={{ margin: "0 auto var(--space-3)", display: "block" }}>
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                <div style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Nog geen onderhoudsbeurten geregistreerd.</div>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {beurten.map((b: BeurtVerrijkt) => {
                const soort = SOORT_CONFIG[b.typeWerk] ?? SOORT_CONFIG["Overig"];
                return (
                    <button
                        key={b._id}
                        onClick={() => b.voertuig && onOpenDossier(b.voertuig as Doc<"voertuigen">)}
                        disabled={!b.voertuig}
                        className="card card-interactive"
                        style={{
                            textAlign: "left", width: "100%", cursor: b.voertuig ? "pointer" : "default",
                            padding: "var(--space-3) var(--space-4)",
                            display: "grid", gridTemplateColumns: "auto 1fr auto",
                            gap: "var(--space-3)", alignItems: "center",
                            transition: "var(--transition-base)",
                            borderLeft: `3px solid ${soort.kleur}`,
                            touchAction: "manipulation",
                        }}
                        aria-label={b.voertuig ? `Open dossier ${b.voertuig.kenteken}` : b.typeWerk}
                    >
                        {/* Type icoon — SOORT_CONFIG kleuren */}
                        <div style={{
                            width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center",
                            background: soort.bg, borderRadius: "var(--radius-sm)",
                            color: soort.kleur, flexShrink: 0,
                        }}>
                            <SoortSvg type={b.typeWerk} />
                        </div>

                        {/* Content */}
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                                <span style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>
                                    {b.typeWerk}
                                </span>
                                {b.voertuig && (
                                    <span style={{
                                        fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)",
                                        background: "var(--color-surface-3)", border: "1px solid var(--color-border)",
                                        borderRadius: "var(--radius-xs)", padding: "1px 6px",
                                        color: "var(--color-heading)", fontWeight: "var(--weight-bold)",
                                        letterSpacing: "var(--tracking-wide)",
                                    }}>
                                        {b.voertuig.kenteken}
                                    </span>
                                )}
                                {b.klant && (
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                        {b.klant.voornaam} {b.klant.achternaam}
                                    </span>
                                )}
                            </div>
                            {b.voertuig && (
                                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginTop: "2px" }}>
                                    {b.voertuig.merk} {b.voertuig.model} · {b.kmStandOnderhoud.toLocaleString("nl-NL")} km
                                </div>
                            )}
                        </div>

                        {/* Datum + pijl */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{formatDatum(b.datumUitgevoerd)}</span>
                            {b.voertuig && (
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-accent-text)", fontWeight: "var(--weight-semibold)" }}>dossier →</span>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Garage Audit Trail (werkorderLogs — alle acties van het team)
// ---------------------------------------------------------------------------

type GarageLogRegel = NonNullable<ReturnType<typeof useGarageActiviteit>>[number];

// Kleur per actie-type
function actieBadge(actie: string): { bg: string; kleur: string } {
    const a = actie.toLowerCase();
    if (a.includes("aangemaakt") || a.includes("registreer"))
        return { bg: "var(--color-info-bg)", kleur: "var(--color-info)" };
    if (a.includes("bezig") || a.includes("opgepakt"))
        return { bg: "var(--color-warning-bg)", kleur: "var(--color-warning)" };
    if (a.includes("klaar") || a.includes("afgerond") || a.includes("voltooid"))
        return { bg: "var(--color-success-bg)", kleur: "var(--color-success)" };
    if (a.includes("geannuleerd") || a.includes("verwijder"))
        return { bg: "var(--color-error-bg)", kleur: "var(--color-error)" };
    if (a.includes("notitie") || a.includes("opmerking"))
        return { bg: "var(--color-surface-3)", kleur: "var(--color-muted)" };
    if (a.includes("wacht") || a.includes("onderdeel"))
        return { bg: "var(--color-info-bg)", kleur: "var(--color-info-text)" };
    return { bg: "var(--color-surface-2)", kleur: "var(--color-body)" };
}

function avatarKleurVoor(naam: string): string {
    const KLEUREN = ["#0d7a5f", "#2563eb", "#d97706", "#dc2626", "#0891b2", "#65a30d", "#7c3aed", "#db2777"];
    let h = 0;
    for (const c of naam) h = (h + c.charCodeAt(0)) % KLEUREN.length;
    return KLEUREN[h];
}

// Datum range
type DatumRange = "vandaag" | "week" | "maand" | "alles";
const RANGE_LABELS: Record<DatumRange, string> = {
    vandaag: "Vandaag",
    week: "Deze week",
    maand: "Deze maand",
    alles: "Alles",
};

function vanafMsVoor(range: DatumRange): number | undefined {
    const nu = new Date();
    if (range === "vandaag") { const d = new Date(nu); d.setHours(0, 0, 0, 0); return d.getTime(); }
    if (range === "week")    { const d = new Date(nu); d.setDate(nu.getDate() - 7); d.setHours(0, 0, 0, 0); return d.getTime(); }
    if (range === "maand")   { const d = new Date(nu); d.setDate(nu.getDate() - 30); d.setHours(0, 0, 0, 0); return d.getTime(); }
    return undefined;
}

const LIMIET_STAP = 50;

// Sub-component: lazy-loaded WerkorderDetailModal opener
function WerkorderOpener({ werkorderId, onSluit }: { werkorderId: Id<"werkorders">; onSluit: () => void }) {
    const order = useQuery(api.werkorders.getWerkorderById, { werkorderId });

    if (order === undefined) {
        return (
            <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }} onClick={onSluit}>
                <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", padding: "var(--space-8)", display: "flex", alignItems: "center", gap: "var(--space-3)", fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }} aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>
                    Werkorder laden…
                </div>
            </div>
        );
    }

    if (order === null) {
        return (
            <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }} onClick={onSluit}>
                <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", padding: "var(--space-8)", fontSize: "var(--text-sm)", color: "var(--color-error)", maxWidth: "300px", textAlign: "center" }}>
                    Werkorder niet gevonden of geen toegang.<br />
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: "var(--space-3)" }} onClick={onSluit}>Sluiten</button>
                </div>
            </div>
        );
    }

    return <WerkorderDetailModal order={order as WerkorderVerrijkt} onSluit={onSluit} />;
}

// Team KPI mini-balk (client-side berekend uit geladen logs)
function TeamKPIBalk({ logs }: { logs: GarageLogRegel[] }) {
    const telPerMedewerker: Record<string, number> = {};
    for (const l of logs) {
        if (l.medewerkerNaam) telPerMedewerker[l.medewerkerNaam] = (telPerMedewerker[l.medewerkerNaam] ?? 0) + 1;
    }
    const topEntry = Object.entries(telPerMedewerker).sort(([, a], [, b]) => b - a)[0];
    const aangemaakt = logs.filter(l => l.actie.toLowerCase().includes("aangemaakt")).length;
    const afgerond   = logs.filter(l => l.actie.toLowerCase().includes("afgerond")).length;

    if (logs.length === 0) return null;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
            {topEntry && (
                <div style={{ background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)", display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted)", fontWeight: "600" }}>Meest actief</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <span style={{ width: "18px", height: "18px", borderRadius: "var(--radius-full)", background: avatarKleurVoor(topEntry[0]), color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "700", flexShrink: 0 }}>{topEntry[0].charAt(0).toUpperCase()}</span>
                        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topEntry[0]}</span>
                        <span style={{ fontSize: "10px", color: "var(--color-muted)", flexShrink: 0 }}>{topEntry[1]}x</span>
                    </div>
                </div>
            )}
            <div style={{ background: "var(--color-info-bg)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)", display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-info)", fontWeight: "600" }}>WO aangemaakt</span>
                <span style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-info)", fontVariantNumeric: "tabular-nums" }}>{aangemaakt}</span>
            </div>
            <div style={{ background: "var(--color-success-bg)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)", display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-success)", fontWeight: "600" }}>WO afgerond</span>
                <span style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-success)", fontVariantNumeric: "tabular-nums" }}>{afgerond}</span>
            </div>
        </div>
    );
}

function GarageAuditTrail() {
    const [limiet, setLimiet]                     = useState(LIMIET_STAP);
    const [zoek, setZoek]                         = useState("");
    const [filterMedewerker, setFilterMedewerker] = useState<string>("Alle");
    const [datumRange, setDatumRange]             = useState<DatumRange>("week");
    const [geopendWerkorderId, setGeopendWerkorderId] = useState<Id<"werkorders"> | null>(null);

    const vanafMs = vanafMsVoor(datumRange);
    const logs    = useGarageActiviteit(limiet, vanafMs);

    const medewerkers = useMemo(
        () => logs ? Array.from(new Set(logs.map((l: GarageLogRegel) => l.medewerkerNaam).filter(Boolean))).sort() as string[] : [],
        [logs]
    );

    const vandaag      = new Date().toDateString();
    const vandaagAantal = logs?.filter((l: GarageLogRegel) => new Date(l.tijdstip).toDateString() === vandaag).length ?? 0;

    const gefilterd = useMemo(() => (logs ?? []).filter((log: GarageLogRegel) => {
        if (filterMedewerker !== "Alle" && log.medewerkerNaam !== filterMedewerker) return false;
        if (zoek.trim()) {
            const q = zoek.toLowerCase();
            return (
                log.medewerkerNaam?.toLowerCase().includes(q) ||
                log.actie?.toLowerCase().includes(q) ||
                log.voertuigKenteken?.toLowerCase().includes(q) ||
                log.notitie?.toLowerCase().includes(q) ||
                `${log.voertuigMerk ?? ""} ${log.voertuigModel ?? ""}`.toLowerCase().includes(q)
            );
        }
        return true;
    }), [logs, filterMedewerker, zoek]);

    const groepen = useMemo(() => {
        const g: Record<string, GarageLogRegel[]> = {};
        gefilterd.forEach((log: GarageLogRegel) => {
            const d  = new Date(log.tijdstip);
            const nu = new Date();
            let sleutel: string;
            if (d.toDateString()      === nu.toDateString())                                      sleutel = "Vandaag";
            else if (d.toDateString() === new Date(nu.getTime() - 86400000).toDateString())       sleutel = "Gisteren";
            else                                                                                   sleutel = d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
            if (!g[sleutel]) g[sleutel] = [];
            g[sleutel].push(log);
        });
        return g;
    }, [gefilterd]);

    if (logs === undefined) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {[...Array(6)].map((_, i) => (
                    <div key={i} style={{ height: "56px", background: "var(--skeleton-base)", borderRadius: "var(--radius-md)", animation: "pulse 1.5s ease infinite" }} />
                ))}
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

            {/* ── Datum range filter + Live indicator ── */}
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
                {(Object.keys(RANGE_LABELS) as DatumRange[]).map((range) => (
                    <button
                        key={range}
                        onClick={() => { setDatumRange(range); setLimiet(LIMIET_STAP); }}
                        className={`btn btn-sm ${datumRange === range ? "btn-primary" : "btn-ghost"}`}
                        style={{ minHeight: "30px", fontSize: "var(--text-xs)", padding: "0 var(--space-3)" }}
                    >
                        {RANGE_LABELS[range]}
                    </button>
                ))}
                <div style={{ flex: 1 }} />
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--color-success)", display: "inline-block", animation: "pulse 2s ease infinite", flexShrink: 0 }} />
                    Live
                </div>
            </div>

            {/* ── Team KPI balk ── */}
            {logs.length > 0 && <TeamKPIBalk logs={logs} />}

            {/* ── Zoek + tellers ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                {datumRange !== "vandaag" && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", background: "var(--color-accent-dim)", borderRadius: "var(--radius-full)", padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-accent-text)", flexShrink: 0 }}>
                        <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                        {vandaagAantal} acties vandaag
                    </div>
                )}
                <div style={{ position: "relative", flex: "1 1 200px", minWidth: "160px" }}>
                    <div style={{ position: "absolute", left: "var(--space-3)", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", pointerEvents: "none" }}>
                        <IconSearch />
                    </div>
                    <input
                        type="search"
                        value={zoek}
                        onChange={(e) => setZoek(e.target.value)}
                        placeholder="Zoek op medewerker, actie, kenteken…"
                        className="input"
                        style={{ paddingLeft: "2.25rem", minHeight: "36px", fontSize: "var(--text-xs)" }}
                    />
                </div>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", flexShrink: 0 }}>
                    {gefilterd.length} {gefilterd.length === 1 ? "log" : "logs"}
                    {logs.length > gefilterd.length && ` (van ${logs.length})`}
                </span>
            </div>

            {/* ── Medewerker filter chips ── */}
            {medewerkers.length > 1 && (
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
                    {["Alle", ...medewerkers].map((naam) => (
                        <button
                            key={naam}
                            onClick={() => setFilterMedewerker(naam)}
                            className={`btn btn-sm ${filterMedewerker === naam ? "btn-primary" : "btn-ghost"}`}
                            style={{ minHeight: "28px", fontSize: "var(--text-xs)", gap: "var(--space-2)", padding: "0 var(--space-3)" }}
                        >
                            {naam !== "Alle" && (
                                <span style={{ width: "16px", height: "16px", borderRadius: "var(--radius-full)", background: avatarKleurVoor(naam), color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "700", flexShrink: 0 }}>
                                    {naam.charAt(0).toUpperCase()}
                                </span>
                            )}
                            {naam}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Lege staat ── */}
            {gefilterd.length === 0 && (
                <div className="card" style={{ padding: "var(--space-10)", textAlign: "center", color: "var(--color-muted)" }}>
                    <svg viewBox="0 0 24 24" width={36} height={36} fill="none" stroke="var(--color-border)" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true" style={{ margin: "0 auto var(--space-3)", display: "block" }}>
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    <div style={{ fontSize: "var(--text-sm)" }}>
                        {zoek || filterMedewerker !== "Alle"
                            ? "Geen resultaten — pas de filters aan."
                            : `Geen activiteit in ${RANGE_LABELS[datumRange].toLowerCase()}.`}
                    </div>
                </div>
            )}

            {/* ── Tijdlijn per datum ── */}
            {Object.entries(groepen).map(([datum, regels]) => (
                <div key={datum}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                        <div style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: datum === "Vandaag" ? "var(--color-accent-text)" : "var(--color-muted)", textTransform: "uppercase", letterSpacing: "var(--tracking-wider)", whiteSpace: "nowrap" }}>{datum}</div>
                        <div style={{ flex: 1, height: "1px", background: datum === "Vandaag" ? "var(--color-accent)" : "var(--color-border)", opacity: datum === "Vandaag" ? 0.4 : 1 }} />
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", flexShrink: 0 }}>{regels.length}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                        {regels.map((log: GarageLogRegel) => {
                            const badge        = actieBadge(log.actie);
                            const kleur        = avatarKleurVoor(log.medewerkerNaam ?? "?");
                            const heeftOrder   = !!log.werkorderId;

                            return (
                                <button
                                    key={log._id}
                                    onClick={heeftOrder ? () => setGeopendWerkorderId(log.werkorderId as Id<"werkorders">) : undefined}
                                    disabled={!heeftOrder}
                                    style={{
                                        all: "unset",
                                        display: "grid",
                                        gridTemplateColumns: "auto 1fr auto",
                                        gap: "var(--space-3)",
                                        padding: "var(--space-3)",
                                        borderRadius: "var(--radius-md)",
                                        background: "var(--color-surface-2)",
                                        borderLeft: `3px solid ${badge.kleur}`,
                                        alignItems: "flex-start",
                                        cursor: heeftOrder ? "pointer" : "default",
                                        transition: "background var(--transition-fast)",
                                        boxSizing: "border-box",
                                        width: "100%",
                                        textAlign: "left",
                                    }}
                                    onMouseEnter={(e) => { if (heeftOrder) e.currentTarget.style.background = "var(--color-surface-3)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-surface-2)"; }}
                                    aria-label={heeftOrder ? `Werkorder openen: ${log.actie}${log.voertuigKenteken ? ` — ${log.voertuigKenteken}` : ""}` : log.actie}
                                >
                                    {/* Avatar */}
                                    <div style={{ width: "30px", height: "30px", borderRadius: "var(--radius-full)", background: kleur, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", flexShrink: 0, marginTop: "1px" }}>
                                        {log.medewerkerNaam?.charAt(0).toUpperCase() ?? "?"}
                                    </div>

                                    {/* Content */}
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                                            <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)" }}>{log.medewerkerNaam}</span>
                                            <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", color: badge.kleur, background: badge.bg, borderRadius: "var(--radius-full)", padding: "1px var(--space-2)" }}>{log.actie}</span>
                                            {log.voertuigKenteken && (
                                                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", background: "var(--color-surface-4)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xs)", padding: "1px 6px", color: "var(--color-heading)", fontWeight: "var(--weight-bold)", letterSpacing: "0.08em" }}>
                                                    {log.voertuigKenteken}
                                                </span>
                                            )}
                                        </div>
                                        {(log.voertuigMerk || log.voertuigModel) && (
                                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginTop: "2px" }}>{log.voertuigMerk} {log.voertuigModel}</div>
                                        )}
                                        {log.notitie && (
                                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-body)", fontStyle: "italic", marginTop: "var(--space-1)", paddingLeft: "var(--space-2)", borderLeft: "2px solid var(--color-border)" }}>
                                                {log.notitie}
                                            </div>
                                        )}
                                    </div>

                                    {/* Tijdstip + pijl */}
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
                                        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                                            {new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit" }).format(new Date(log.tijdstip))}
                                        </div>
                                        {heeftOrder && (
                                            <span style={{ fontSize: "9px", color: "var(--color-accent-text)", fontWeight: "var(--weight-semibold)" }}>detail →</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* ── Meer laden ── */}
            {logs.length >= limiet && gefilterd.length > 0 && (
                <button
                    onClick={() => setLimiet(l => l + LIMIET_STAP)}
                    className="btn btn-ghost"
                    style={{ width: "100%", minHeight: "40px", fontSize: "var(--text-sm)", marginTop: "var(--space-2)" }}
                >
                    Meer laden ({limiet} geladen — klik voor volgende {LIMIET_STAP})
                </button>
            )}

            {/* ── WerkorderDetailModal via lazy WerkorderOpener ── */}
            {geopendWerkorderId && (
                <WerkorderOpener werkorderId={geopendWerkorderId} onSluit={() => setGeopendWerkorderId(null)} />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Voertuig Dossier + Zoeken (eigenaar)
// ---------------------------------------------------------------------------

// SOORT_CONFIG via utils.ts import

const SORTEER_OPTIES = ["Nieuwste eerst", "Oudste eerst"] as const;
type SorteerOptie = typeof SORTEER_OPTIES[number];
const FILTER_TYPES = ["Alle", "Grote Beurt", "Kleine Beurt", "APK", "Reparatie", "Bandenwisseling", "Schadeherstel", "Diagnostiek", "Overig"] as const;

function EigenaarDossier({ voertuig, onTerug }: { voertuig: Doc<"voertuigen">; onTerug: () => void }) {
    const historie        = useVoertuigHistorie(voertuig._id);
    const klant           = useQuery(api.klanten.getById, voertuig.klantId ? { klantId: voertuig.klantId } : "skip");
    const verwijder       = useMutation(api.onderhoudshistorie.verwijder);

    const [toonNieuw, setToonNieuw]               = useState(false);
    const [verwijderBezig, setVerwijderBezig]      = useState<Id<"onderhoudshistorie"> | null>(null);
    const [verwijderConfirm, setVerwijderConfirm]  = useState<Id<"onderhoudshistorie"> | null>(null);
    const [expandedId, setExpandedId]              = useState<Id<"onderhoudshistorie"> | null>(null);
    const [filterType, setFilterType]              = useState<string>("Alle");
    const [sorteer, setSorteer]                    = useState<SorteerOptie>("Nieuwste eerst");

    async function handleVerwijder(id: Id<"onderhoudshistorie">) {
        setVerwijderConfirm(null);
        setVerwijderBezig(id);
        try { await verwijder({ historieId: id }); } finally { setVerwijderBezig(null); }
    }

    const gefilterd = useMemo(() => {
        if (!historie) return [];
        let lijst = filterType === "Alle" ? [...historie] : historie.filter(b => b.typeWerk === filterType);
        if (sorteer === "Nieuwste eerst") lijst.sort((a, b) => b.datumUitgevoerd - a.datumUitgevoerd);
        else                              lijst.sort((a, b) => a.datumUitgevoerd - b.datumUitgevoerd);
        return lijst;
    }, [historie, filterType, sorteer]);

    // APK vervaldatum uit meest recente APK-beurt (approximatie)
    const apkBeurt = useMemo(() =>
        [...(historie ?? [])].filter(b => b.typeWerk === "APK").sort((a, b) => b.datumUitgevoerd - a.datumUitgevoerd)[0],
        [historie]
    );

    // KPI's
    const totaalBeurten = historie?.length ?? 0;
    const kmTotaal = useMemo(() => {
        if (!historie || historie.length < 2) return null;
        const sort = [...historie].sort((a, b) => a.datumUitgevoerd - b.datumUitgevoerd);
        return sort[sort.length - 1].kmStandOnderhoud - sort[0].kmStandOnderhoud;
    }, [historie]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

            {/* ── Dossier header ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-4)", background: "var(--color-surface-2)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", borderLeft: "4px solid var(--color-accent)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                    <button onClick={onTerug} className="btn btn-ghost btn-sm" style={{ minHeight: "36px", gap: "var(--space-1)", flexShrink: 0 }}>
                        <IconChevronLeft /> Terug
                    </button>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", letterSpacing: "var(--tracking-wider)", background: "var(--color-surface-4)", padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)" }}>
                                {voertuig.kenteken}
                            </span>
                            <span style={{ fontSize: "var(--text-base)", color: "var(--color-body)", fontWeight: "var(--weight-medium)" }}>
                                {voertuig.merk} {voertuig.model}
                            </span>
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                {voertuig.bouwjaar} · {voertuig.brandstof}
                            </span>
                        </div>
                        {/* Klant-koppeling */}
                        {klant && (
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginTop: "var(--space-1)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                {klant.voornaam} {klant.achternaam}
                                {klant.telefoonnummer && <span>· {klant.telefoonnummer}</span>}
                            </div>
                        )}
                    </div>
                    <button onClick={() => setToonNieuw(true)} className="btn btn-primary" style={{ minHeight: "40px", gap: "var(--space-1)", flexShrink: 0 }}>
                        <IconPlus /> Beurt registreren
                    </button>
                </div>

                {/* KPI row */}
                {historie !== undefined && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "var(--space-2)" }}>
                        <div style={{ background: "var(--color-surface-3)", borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)" }}>
                            <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted)", fontWeight: "600" }}>Beurten</div>
                            <div style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", fontVariantNumeric: "tabular-nums" }}>{totaalBeurten}</div>
                        </div>
                        {kmTotaal !== null && (
                            <div style={{ background: "var(--color-surface-3)", borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)" }}>
                                <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted)", fontWeight: "600" }}>Km doorgereden</div>
                                <div style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", fontVariantNumeric: "tabular-nums" }}>+{kmTotaal.toLocaleString("nl-NL")}</div>
                            </div>
                        )}
                        {apkBeurt && (
                            <div style={{ background: "var(--color-accent-dim)", borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)" }}>
                                <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-accent-text)", fontWeight: "600" }}>Laatste APK</div>
                                <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-accent-text)" }}>{new Date(apkBeurt.datumUitgevoerd).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" })}</div>
                            </div>
                        )}
                        {voertuig.kilometerstand !== undefined && (
                            <div style={{ background: "var(--color-surface-3)", borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)" }}>
                                <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted)", fontWeight: "600" }}>Huidige km</div>
                                <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", fontVariantNumeric: "tabular-nums" }}>{voertuig.kilometerstand.toLocaleString("nl-NL")}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Filter + Sortering ── */}
            {(historie?.length ?? 0) > 0 && (
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
                    {FILTER_TYPES.map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`btn btn-sm ${filterType === type ? "btn-primary" : "btn-ghost"}`}
                            style={{ minHeight: "28px", fontSize: "var(--text-xs)", padding: "0 var(--space-3)" }}
                        >
                            {type}
                        </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button
                        onClick={() => setSorteer(s => s === "Nieuwste eerst" ? "Oudste eerst" : "Nieuwste eerst")}
                        className="btn btn-ghost btn-sm"
                        style={{ minHeight: "28px", fontSize: "var(--text-xs)", gap: "var(--space-1)" }}
                    >
                        <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path d="M3 6h18M7 12h10M11 18h2" /></svg>
                        {sorteer}
                    </button>
                </div>
            )}

            {/* ── Dossier entries ── */}
            {historie === undefined ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="card" style={{ height: "76px", background: "var(--skeleton-base)", animation: "pulse 1.5s ease infinite" }} />
                    ))}
                </div>
            ) : gefilterd.length === 0 ? (
                <div className="card" style={{ padding: "var(--space-10)", textAlign: "center" }}>
                    <div style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>
                        {filterType !== "Alle" ? `Geen ${filterType} beurten gevonden.` : "Geen beurten gevonden."}
                    </div>
                    {filterType === "Alle" && (
                        <button onClick={() => setToonNieuw(true)} className="btn btn-primary" style={{ marginTop: "var(--space-4)", minHeight: "44px" }}>
                            <IconPlus /> Eerste beurt toevoegen
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {gefilterd.map((beurt, idx) => {
                        const soort    = SOORT_CONFIG[beurt.typeWerk] ?? SOORT_CONFIG["Overig"];
                        const isOpen   = expandedId === beurt._id;
                        // km delta tov vorige (in gesorteerde volgorde)
                        const vorigeKm = gefilterd[idx + 1]?.kmStandOnderhoud;
                        const kmDelta  = vorigeKm !== undefined ? beurt.kmStandOnderhoud - vorigeKm : null;

                        return (
                            <div key={beurt._id} className="card" style={{ overflow: "hidden", borderLeft: `3px solid ${soort.kleur}` }}>
                                {/* Hoofd rij — klikbaar voor expand */}
                                <button
                                    onClick={() => setExpandedId(isOpen ? null : beurt._id)}
                                    style={{ all: "unset", display: "flex", width: "100%", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)", cursor: "pointer", boxSizing: "border-box", transition: "background var(--transition-fast)" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "var(--color-surface-2)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                                    aria-expanded={isOpen}
                                    aria-label={`${beurt.typeWerk} — ${new Date(beurt.datumUitgevoerd).toLocaleDateString("nl-NL")} — klik voor details`}
                                >
                                    {/* Type icon */}
                                    <div style={{ width: "36px", height: "36px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: soort.bg, borderRadius: "var(--radius-sm)", color: soort.kleur }}>
                                        <SoortSvg type={beurt.typeWerk} />
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                                            <span style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>{beurt.typeWerk}</span>
                                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontVariantNumeric: "tabular-nums" }}>
                                                {beurt.kmStandOnderhoud.toLocaleString("nl-NL")} km
                                                {kmDelta !== null && kmDelta > 0 && (
                                                    <span style={{ marginLeft: "4px", color: "var(--color-success)", fontWeight: "var(--weight-semibold)" }}>
                                                        +{kmDelta.toLocaleString("nl-NL")}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginTop: "2px" }}>
                                            {new Date(beurt.datumUitgevoerd).toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" })}
                                        </div>
                                    </div>

                                    {/* Expand chevron + verwijder */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}>
                                        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="var(--color-muted)" strokeWidth={2.5} aria-hidden="true" style={{ transition: "transform var(--transition-fast)", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </div>
                                </button>

                                {/* Expanded details */}
                                {isOpen && (
                                    <div style={{ padding: "0 var(--space-4) var(--space-4)", borderTop: "1px solid var(--color-border)", marginTop: "-1px", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                                        {beurt.werkNotities && (
                                            <div style={{ marginTop: "var(--space-3)" }}>
                                                <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted)", fontWeight: "600", marginBottom: "var(--space-1)" }}>Werknotities</div>
                                                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-body)", fontStyle: "italic", padding: "var(--space-2) var(--space-3)", background: "var(--color-surface-2)", borderRadius: "var(--radius-sm)", borderLeft: "2px solid var(--color-border)" }}>
                                                    {beurt.werkNotities}
                                                </div>
                                            </div>
                                        )}
                                        {beurt.documentUrl && (
                                            <a href={beurt.documentUrl} target="_blank" rel="noreferrer"
                                                style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-accent-text)", fontWeight: "var(--weight-semibold)", width: "fit-content" }}
                                                aria-label="Factuur/document bekijken">
                                                <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                                Document bekijken
                                            </a>
                                        )}
                                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                            {verwijderConfirm === beurt._id ? (
                                                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)", borderRadius: "var(--radius-sm)", padding: "var(--space-2) var(--space-3)" }}>
                                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error-text)", fontWeight: "var(--weight-semibold)" }}>Definitief verwijderen?</span>
                                                    <button onClick={() => handleVerwijder(beurt._id)} disabled={verwijderBezig === beurt._id} style={{ minHeight: "26px", padding: "0 var(--space-2)", background: "var(--color-error)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)" }} aria-label="Definitief verwijderen">
                                                        {verwijderBezig === beurt._id ? "…" : "Ja"}
                                                    </button>
                                                    <button onClick={() => setVerwijderConfirm(null)} className="btn btn-ghost" style={{ minHeight: "26px", padding: "0 var(--space-2)", fontSize: "var(--text-xs)" }} aria-label="Annuleren">Nee</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setVerwijderConfirm(beurt._id)} disabled={!!verwijderBezig} className="btn btn-ghost btn-sm" aria-label="Beurt verwijderen" style={{ color: "var(--color-error)", minHeight: "32px", padding: "0 var(--space-2)" }}>
                                                    <IconTrash />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {toonNieuw && <NieuweBeurtModal voertuig={voertuig} onSluit={() => setToonNieuw(false)} />}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Voertuig Zoeken Tab — met "recent bekeken"
// ---------------------------------------------------------------------------

function VoertuigZoekenTab({
    onOpenDossier,
    recentBekeken,
}: {
    onOpenDossier: (v: Doc<"voertuigen">) => void;
    recentBekeken: Doc<"voertuigen">[];
}) {
    const [zoek, setZoek] = useState("");
    const resultaten = useQuery(api.voertuigen.zoekOpKenteken, zoek.length >= 2 ? { term: zoek } : "skip");

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* Zoekbalk */}
            <div style={{ position: "relative", maxWidth: "420px" }}>
                <div style={{ position: "absolute", left: "var(--space-3)", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", pointerEvents: "none" }}>
                    <IconSearch />
                </div>
                <input
                    type="search"
                    value={zoek}
                    onChange={(e) => setZoek(e.target.value)}
                    placeholder="Kenteken zoeken… bijv. AB-123-C"
                    className="input"
                    style={{ paddingLeft: "2.5rem", minHeight: "48px", fontSize: "var(--text-base)" }}
                    autoComplete="off"
                    spellCheck={false}
                />
            </div>

            {/* Zoekresultaten */}
            {zoek.length >= 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {resultaten === undefined ? (
                        // Skeleton loader
                        [...Array(3)].map((_, i) => (
                            <div key={i} style={{ height: "60px", background: "var(--skeleton-base)", borderRadius: "var(--radius-md)", animation: "pulse 1.5s ease infinite" }} />
                        ))
                    ) : resultaten.length === 0 ? (
                        <div style={{ padding: "var(--space-6)", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", marginBottom: "var(--space-2)" }}>
                                Geen voertuig gevonden voor “{zoek}”
                            </div>
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                Probeer een gedeeltelijk kenteken, bijv. “AB12”
                            </div>
                        </div>
                    ) : resultaten.map((v) => (
                        <VoertuigKaart key={v._id} voertuig={v} onClick={() => onOpenDossier(v)} />
                    ))}
                </div>
            )}

            {/* Onboarding — geen zoekterm */}
            {zoek.length === 0 && recentBekeken.length === 0 && (
                <div style={{ padding: "var(--space-8)", background: "var(--color-surface-2)", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
                    <svg viewBox="0 0 24 24" width={40} height={40} fill="none" stroke="var(--color-border)" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true" style={{ margin: "0 auto var(--space-3)", display: "block" }}>
                        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2" />
                        <circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
                    </svg>
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--color-body)", fontWeight: "var(--weight-medium)", marginBottom: "var(--space-2)" }}>
                        Zoek op kenteken om het dossier te openen
                    </div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                        Minimaal 2 tekens — bijv. “AB” of “AB123”
                    </div>
                </div>
            )}

            {/* Recent bekeken */}
            {zoek.length === 0 && recentBekeken.length > 0 && (
                <div>
                    <div style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "var(--tracking-wider)", marginBottom: "var(--space-2)" }}>
                        Recent bekeken
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        {recentBekeken.map(v => (
                            <VoertuigKaart key={v._id} voertuig={v} onClick={() => onOpenDossier(v)} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Voertuig kaart — herbruikbaar in zoekresultaten en recent bekeken
function VoertuigKaart({ voertuig: v, onClick }: { voertuig: Doc<"voertuigen">; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="card card-interactive"
            style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", width: "100%", cursor: "pointer", display: "flex", alignItems: "center", gap: "var(--space-4)", touchAction: "manipulation" }}
            aria-label={`Open dossier ${v.kenteken}`}
        >
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--weight-bold)", fontSize: "var(--text-base)", color: "var(--color-heading)", letterSpacing: "var(--tracking-wide)", background: "var(--color-surface-3)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-xs)", border: "1px solid var(--color-border)", flexShrink: 0 }}>
                {v.kenteken}
            </span>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {v.merk} {v.model} · {v.bouwjaar} · {v.brandstof}
            </span>
            {v.kilometerstand !== undefined && (
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                    {v.kilometerstand.toLocaleString("nl-NL")} km
                </span>
            )}
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-accent-text)", fontWeight: "var(--weight-semibold)", flexShrink: 0 }}>dossier →</span>
        </button>
    );
}

// ---------------------------------------------------------------------------
// Export — Tabbed Layout
// ---------------------------------------------------------------------------

type Tab = "overzicht" | "voertuig" | "activiteit";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overzicht",  label: "Overzicht",       icon: <IconActivity /> },
    { id: "voertuig",  label: "Voertuigdossier",  icon: <IconCar /> },
    { id: "activiteit", label: "Teamactiviteit",   icon: <IconClipboard /> },
];

const MAX_RECENT = 5;

export default function EigenaarOnderhoudView() {
    const [actieveTab, setActieveTab]               = useState<Tab>("overzicht");
    const [geselecteerdVoertuig, setGeselecteerdVoertuig] = useState<Doc<"voertuigen"> | null>(null);
    const [toonRecenteModal, setToonRecenteModal]   = useState(false);
    const [recentBekeken, setRecentBekeken]         = useState<Doc<"voertuigen">[]>([]);

    const handleOpenDossier = useCallback((v: Doc<"voertuigen">) => {
        setGeselecteerdVoertuig(v);
        setActieveTab("voertuig");
        // Voeg toe aan recent bekeken (dedup + max 5)
        setRecentBekeken(prev => {
            const filtered = prev.filter(r => r._id !== v._id);
            return [v, ...filtered].slice(0, MAX_RECENT);
        });
    }, []);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* Tab navigatie */}
            <div style={{
                display: "flex", gap: "var(--space-1)",
                borderBottom: "2px solid var(--color-border)",
                overflowX: "auto",
                scrollbarWidth: "none",
                WebkitOverflowScrolling: "touch" as never,
                paddingBottom: "0",
            }}>
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActieveTab(tab.id); if (tab.id !== "voertuig") setGeselecteerdVoertuig(null); }}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: "var(--space-2)",
                            padding: "var(--space-2) var(--space-3)",
                            fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)",
                            border: "none", background: "transparent", cursor: "pointer",
                            color: actieveTab === tab.id ? "var(--color-accent-text)" : "var(--color-muted)",
                            borderBottom: actieveTab === tab.id ? "2px solid var(--color-accent)" : "2px solid transparent",
                            marginBottom: "-2px",
                            transition: "var(--transition-base)",
                            borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                        }}
                        aria-selected={actieveTab === tab.id}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div>
                {actieveTab === "overzicht" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                        <section>
                            <h2 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "var(--tracking-wider)" }}>
                                Garage statistieken
                            </h2>
                            <KPIDashboard />
                        </section>
                        <section>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                                <h2 style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "var(--tracking-wider)" }}>
                                    Recente onderhoudsbeurten
                                </h2>
                                <button
                                    onClick={() => setToonRecenteModal(true)}
                                    className="btn btn-ghost btn-sm"
                                    style={{ fontSize: "var(--text-xs)", minHeight: "30px", gap: "var(--space-1)" }}
                                >
                                    <IconWrench /> Bekijk alle
                                </button>
                            </div>
                            <ActiviteitsFeed onOpenDossier={handleOpenDossier} />
                        </section>
                    </div>
                )}

                {actieveTab === "voertuig" && (
                    geselecteerdVoertuig
                        ? <EigenaarDossier voertuig={geselecteerdVoertuig} onTerug={() => setGeselecteerdVoertuig(null)} />
                        : <VoertuigZoekenTab onOpenDossier={handleOpenDossier} recentBekeken={recentBekeken} />
                )}

                {toonRecenteModal && (
                    <RecenteBeurtenModal
                        onSluit={() => setToonRecenteModal(false)}
                        onOpenVoertuig={handleOpenDossier}
                    />
                )}

                {actieveTab === "activiteit" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                            Alle acties van het team — gecombineerd chronologisch werkorderlogboek.
                        </p>
                        <GarageAuditTrail />
                    </div>
                )}
            </div>
        </div>
    );
}
