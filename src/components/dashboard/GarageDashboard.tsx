/**
 * src/components/dashboard/GarageDashboard.tsx
 *
 * Garage Command Center — volledig responsief:
 *   xs  < 640     mobiel   : 1 kolom, gestapeld
 *   sm  640–1023  tablet   : 1 kolom breed, 2-col KPI
 *   lg  1024–1279 laptop   : 2-col layout (main 2/3 + side 1/3)
 *   xl  ≥ 1280   desktop  : full layout, sticky sidebar
 */

import { useState } from "react";
import { useRol } from "../../hooks/useRol";
import { useResponsive } from "../../hooks/useResponsive";
import { useTotaalStatistieken, useRecenteBeurtenVerrijkt } from "../../hooks/useOnderhoud";
import { useWerkorders, useAfgerondNietOpgehaald, useBevestigOphalen } from "../../hooks/useWerkplaats";
import { useApkWaarschuwingen, useVoertuigenLijst } from "../../hooks/useVoertuigen";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import NieuwVoertuigModal from "../modals/NieuwVoertuigModal";
import NieuweKlantModal from "../modals/NieuweKlantModal";
import NieuweWerkorderModal from "../modals/NieuweWerkorderModal";
import VoertuigDetailPanel from "../modals/VoertuigDetailPanel";

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

const IconWrench = ({ size = 16 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>;
const IconCar = ({ size = 16 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>;
const IconCalendar = ({ size = 16 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const IconPackage = ({ size = 16 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>;
const IconAlertTriangle = ({ size = 16 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
const IconCheck = ({ size = 14 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>;
const IconPlus = ({ size = 14 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IconActivity = ({ size = 14 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
const IconArrowRight = ({ size = 12 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
const IconPhone = ({ size = 12 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDatum(ms: number): string {
    const d = new Date(ms);
    const nu = new Date();
    if (d.toDateString() === nu.toDateString()) return "Vandaag";
    const diff = Math.ceil((ms - Date.now()) / 86400000);
    if (diff === 1) return "Morgen";
    if (diff > 0 && diff <= 6) return d.toLocaleDateString("nl-NL", { weekday: "short" });
    return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

const STATUS_KLEUR: Record<string, string> = {
    "Gepland": "#8b5cf6", "Aanwezig": "#0891b2", "Wachtend": "#6b7280",
    "Bezig": "#f59e0b", "Wacht op onderdelen": "#3b82f6",
    "Klaar": "#22c55e", "Afgerond": "#16a34a", "Geannuleerd": "#dc2626",
};

// Label voor compacte sectie-headers
function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <h2 style={{
            margin: 0, fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
            color: "var(--color-muted)", textTransform: "uppercase",
            letterSpacing: "var(--tracking-wider)",
            display: "flex", alignItems: "center", gap: "var(--space-2)",
        }}>
            {icon}{children}
        </h2>
    );
}

// ---------------------------------------------------------------------------
// KPI Strip — 2 cols op xs, 4 cols op sm+
// ---------------------------------------------------------------------------

function KPIStrip() {
    const { isMobile } = useResponsive();
    const stats = useTotaalStatistieken();
    const werkorders = useWerkorders();
    const ophalen = useAfgerondNietOpgehaald();
    const apkAlerts = useApkWaarschuwingen(14);

    const actief = werkorders?.filter(o =>
        !["Afgerond", "Geannuleerd"].includes(o.status) && !o.gearchiveerd
    ).length;

    const kpis = [
        {
            label: "Actief in werkplaats", waarde: actief !== undefined ? String(actief) : "—",
            Icon: IconWrench, accent: "var(--color-accent)",
        },
        {
            label: "Wacht op ophalen", waarde: ophalen !== undefined ? String(ophalen.length) : "—",
            Icon: IconPackage, accent: "#16a34a",
        },
        {
            label: "APK verlopen < 14d",
            waarde: apkAlerts !== undefined ? String(apkAlerts.length) : "—",
            Icon: IconCalendar,
            accent: apkAlerts && apkAlerts.length > 0 ? "#dc2626" : "#6b7280",
        },
        {
            label: "Totaal beurten ooit", waarde: stats?.totaal !== undefined ? String(stats.totaal) : "—",
            Icon: IconActivity, accent: "#6366f1",
        },
    ];

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: "var(--space-3)",
        }}>
            {kpis.map(({ label, waarde, Icon, accent }) => (
                <div key={label} style={{
                    padding: isMobile ? "var(--space-3)" : "var(--space-4) var(--space-5)",
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    borderLeft: `3px solid ${accent}`,
                    borderRadius: "var(--radius-md)",
                    display: "flex", flexDirection: "column", gap: "var(--space-2)",
                }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{
                            fontSize: "var(--text-xs)", color: "var(--color-muted)",
                            fontWeight: "var(--weight-semibold)", textTransform: "uppercase",
                            letterSpacing: "var(--tracking-wider)",
                            lineHeight: 1.3,
                        }}>
                            {label}
                        </span>
                        <span style={{ color: accent, opacity: 0.7, flexShrink: 0 }}><Icon size={14} /></span>
                    </div>
                    <div style={{
                        fontSize: isMobile ? "var(--text-2xl)" : "var(--text-3xl)",
                        fontWeight: "var(--weight-bold)",
                        color: waarde === "—" ? "var(--color-muted)" : "var(--color-heading)",
                        fontVariantNumeric: "tabular-nums", lineHeight: 1,
                    }}>
                        {waarde === "—" ? (
                            <span style={{ display: "inline-block", width: "2ch", height: "1em", background: "var(--color-border)", borderRadius: "var(--radius-xs)", animation: "pulse 1.5s ease infinite" }} />
                        ) : waarde}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Live Werkplaats
// ---------------------------------------------------------------------------

type WerkorderVerrijkt = NonNullable<ReturnType<typeof useWerkorders>>[number];

function LiveWerkplaats({ onNieuw }: { onNieuw: () => void }) {
    const { isMobile } = useResponsive();
    const orders = useWerkorders();

    const actief = orders?.filter(o =>
        !["Afgerond", "Geannuleerd"].includes(o.status) && !o.gearchiveerd
    ).sort((a, b) => {
        const prio = ["Bezig", "Wacht op onderdelen", "Klaar", "Aanwezig", "Wachtend", "Gepland"];
        return prio.indexOf(a.status) - prio.indexOf(b.status);
    });

    return (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
                <SectionLabel icon={<IconWrench size={14} />}>Live werkplaats</SectionLabel>
                <button
                    onClick={onNieuw}
                    className="btn btn-primary btn-sm"
                    style={{
                        minHeight: "44px", // touch-target WCAG
                        minWidth: isMobile ? "44px" : "auto",
                        fontSize: "var(--text-xs)",
                        display: "inline-flex", alignItems: "center",
                        gap: isMobile ? 0 : "var(--space-1)",
                        padding: isMobile ? "0 var(--space-3)" : undefined,
                    }}
                    aria-label="Nieuwe werkorder aanmaken"
                >
                    <IconPlus size={14} />
                    {!isMobile && " Nieuwe order"}
                </button>
            </div>

            {actief === undefined ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {[...Array(3)].map((_, i) => (
                        <div key={i} style={{ height: "52px", background: "var(--color-border)", borderRadius: "var(--radius-md)", animation: "pulse 1.5s ease infinite" }} />
                    ))}
                </div>
            ) : actief.length === 0 ? (
                <div style={{
                    padding: "var(--space-6)", textAlign: "center",
                    border: "1px dashed var(--color-border)", borderRadius: "var(--radius-md)",
                }}>
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", margin: 0 }}>
                        Geen actieve werkorders. Rustige dag! 👍
                    </p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    {actief.map((order: WerkorderVerrijkt) => (
                        <div key={order._id} style={{
                            display: "flex",
                            flexDirection: isMobile ? "column" : "row",
                            alignItems: isMobile ? "flex-start" : "center",
                            gap: isMobile ? "var(--space-1)" : "var(--space-3)",
                            padding: "var(--space-3) var(--space-4)",
                            background: "var(--color-surface-2)",
                            border: "1px solid var(--color-border)",
                            borderLeft: `3px solid ${STATUS_KLEUR[order.status] ?? "#6b7280"}`,
                            borderRadius: "var(--radius-md)",
                        }}>
                            {/* Rij 1 op mobiel: kenteken + status */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "var(--space-2)" }}>
                                <span style={{
                                    fontFamily: "var(--font-mono)", fontWeight: "var(--weight-bold)",
                                    fontSize: "var(--text-sm)", color: "var(--color-heading)",
                                    letterSpacing: "var(--tracking-wide)",
                                    background: "var(--color-surface-4)", padding: "2px 8px",
                                    borderRadius: "var(--radius-xs)", border: "1px solid var(--color-border)",
                                    flexShrink: 0,
                                }}>
                                    {order.voertuig?.kenteken ?? "—"}
                                </span>

                                <span style={{
                                    fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                                    color: STATUS_KLEUR[order.status] ?? "#6b7280", whiteSpace: "nowrap",
                                }}>
                                    {order.status}
                                </span>
                            </div>

                            {/* Rij 2 op mobiel: klacht + datum */}
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                width: "100%", gap: "var(--space-2)",
                            }}>
                                <span style={{
                                    fontSize: "var(--text-xs)", color: "var(--color-muted)",
                                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                                    flex: 1,
                                }}>
                                    {order.klant ? `${order.klant.voornaam} ${order.klant.achternaam}` : "—"}
                                    {!isMobile && ` · ${order.klacht}`}
                                </span>
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                                    {formatDatum(order.afspraakDatum)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {actief && actief.length > 0 && (
                <a href="/werkplaats" style={{
                    fontSize: "var(--text-xs)", color: "var(--color-accent-text)",
                    textDecoration: "none", display: "inline-flex", alignItems: "center",
                    gap: "4px", alignSelf: "flex-end", fontWeight: "var(--weight-semibold)",
                    minHeight: "44px", // touch-target
                }}>
                    Naar werkplaatsbord <IconArrowRight />
                </a>
            )}
        </section>
    );
}

// ---------------------------------------------------------------------------
// Recente Beurten Feed
// ---------------------------------------------------------------------------

type BeurtVerrijkt = NonNullable<ReturnType<typeof useRecenteBeurtenVerrijkt>>[number];

function RecenteBeurtFeed() {
    const { isMobile } = useResponsive();
    const beurten = useRecenteBeurtenVerrijkt(8);
    const [geselecteerdVoertuig, setGeselecteerdVoertuig] = useState<Doc<"voertuigen"> | null>(null);

    return (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <SectionLabel icon={<IconActivity size={14} />}>Recente onderhoudsbeurten</SectionLabel>

            {beurten === undefined ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} style={{ height: "44px", background: "var(--color-border)", borderRadius: "var(--radius-sm)", animation: "pulse 1.5s ease infinite" }} />
                    ))}
                </div>
            ) : beurten.length === 0 ? (
                <div style={{ padding: "var(--space-6)", textAlign: "center", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-md)" }}>
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", margin: 0 }}>Nog geen onderhoudsbeurten.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                    {beurten.map((b: BeurtVerrijkt, idx: number) => (
                        <button
                            key={b._id}
                            onClick={() => b.voertuig && setGeselecteerdVoertuig(b.voertuig as Doc<"voertuigen">)}
                            disabled={!b.voertuig}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "var(--space-3)",
                                padding: isMobile
                                    ? "var(--space-3) var(--space-2)"
                                    : "var(--space-2) var(--space-4)",
                                minHeight: "44px", // touch-target
                                background: idx % 2 === 0 ? "var(--color-surface-2)" : "transparent",
                                border: "none", cursor: b.voertuig ? "pointer" : "default",
                                textAlign: "left", borderRadius: "var(--radius-sm)", width: "100%",
                            }}
                            aria-label={b.voertuig ? `Open dossier ${b.voertuig.kenteken}` : b.typeWerk}
                        >
                            {/* Kenteken */}
                            <span style={{
                                fontFamily: "var(--font-mono)", fontWeight: "var(--weight-bold)",
                                fontSize: "var(--text-xs)", color: "var(--color-heading)",
                                letterSpacing: "var(--tracking-wide)",
                                minWidth: isMobile ? "64px" : "80px",
                                flexShrink: 0,
                            }}>
                                {b.voertuig?.kenteken ?? "—"}
                            </span>

                            {/* Type + klant */}
                            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "var(--space-2)", overflow: "hidden" }}>
                                <span style={{
                                    fontSize: "var(--text-xs)", color: "var(--color-body)",
                                    fontWeight: "var(--weight-medium)", whiteSpace: "nowrap",
                                }}>
                                    {b.typeWerk}
                                </span>
                                {!isMobile && b.klant && (
                                    <span style={{
                                        fontSize: "var(--text-xs)", color: "var(--color-muted)",
                                        overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                                    }}>
                                        {b.klant.voornaam} {b.klant.achternaam}
                                    </span>
                                )}
                            </div>

                            {/* Datum */}
                            <span style={{
                                fontSize: "var(--text-xs)", color: "var(--color-muted)",
                                whiteSpace: "nowrap", flexShrink: 0,
                            }}>
                                {new Date(b.datumUitgevoerd).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {beurten && beurten.length > 0 && (
                <a href="/onderhoud" style={{
                    fontSize: "var(--text-xs)", color: "var(--color-accent-text)",
                    textDecoration: "none", display: "inline-flex", alignItems: "center",
                    gap: "4px", alignSelf: "flex-end", fontWeight: "var(--weight-semibold)",
                    minHeight: "44px",
                }}>
                    Alle beurten bekijken <IconArrowRight />
                </a>
            )}

            {geselecteerdVoertuig && (
                <VoertuigDetailPanel voertuig={geselecteerdVoertuig} onSluit={() => setGeselecteerdVoertuig(null)} />
            )}
        </section>
    );
}

// ---------------------------------------------------------------------------
// Wacht op Ophalen widget
// ---------------------------------------------------------------------------

function WachtOpOphalen() {
    const { isMobile } = useResponsive();
    const orders = useAfgerondNietOpgehaald();
    const bevestig = useBevestigOphalen();
    const [bezigId, setBezigId] = useState<Id<"werkorders"> | null>(null);

    if (!orders || orders.length === 0) return null;

    async function handleOphalen(id: Id<"werkorders">) {
        setBezigId(id);
        try { await bevestig({ werkorderId: id }); }
        finally { setBezigId(null); }
    }

    return (
        <section style={{
            padding: "var(--space-4)",
            background: "rgba(22,163,74,0.06)",
            border: "1px solid rgba(22,163,74,0.25)",
            borderRadius: "var(--radius-md)",
            display: "flex", flexDirection: "column", gap: "var(--space-3)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ color: "#16a34a" }}><IconPackage size={16} /></span>
                <span style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>
                    Wacht op ophalen
                </span>
                <span style={{
                    background: "#16a34a", color: "#fff", fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-bold)", borderRadius: "9999px", padding: "1px 8px",
                }}>{orders.length}</span>
            </div>

            {orders.map((order) => (
                <div key={order._id} style={{
                    display: "flex", alignItems: "center",
                    gap: "var(--space-2)", flexWrap: "wrap",
                }}>
                    <span style={{
                        fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-xs)",
                        background: "var(--color-surface-4)", padding: "2px 6px",
                        borderRadius: "var(--radius-xs)", border: "1px solid var(--color-border)",
                        color: "var(--color-heading)", flexShrink: 0,
                    }}>{order.voertuig?.kenteken ?? "—"}</span>

                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", flex: 1, minWidth: "80px" }}>
                        {order.klant ? `${order.klant.voornaam} ${order.klant.achternaam}` : "Onbekend"}
                    </span>

                    {!isMobile && order.klant?.telefoonnummer && (
                        <a href={`tel:${order.klant.telefoonnummer}`}
                            style={{ fontSize: "var(--text-xs)", color: "var(--color-accent-text)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", minHeight: "44px" }}
                            aria-label={`Bel ${order.klant.voornaam}`}>
                            <IconPhone size={12} /> {order.klant.telefoonnummer}
                        </a>
                    )}

                    <button
                        onClick={() => handleOphalen(order._id)}
                        disabled={bezigId === order._id}
                        className="btn btn-sm"
                        style={{
                            minHeight: "44px", minWidth: "44px",
                            background: "#16a34a", color: "#fff", border: "none",
                            borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)",
                            fontWeight: "var(--weight-semibold)", cursor: "pointer",
                            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px",
                        }}
                        aria-label={`Bevestig ophalen ${order.voertuig?.kenteken ?? ""}`}
                    >
                        <IconCheck size={12} /> {bezigId === order._id ? "…" : "Opgehaald"}
                    </button>
                </div>
            ))}
        </section>
    );
}

// ---------------------------------------------------------------------------
// APK Alerts
// ---------------------------------------------------------------------------

function ApkAlerts() {
    const [geselecteerdVoertuig, setGeselecteerdVoertuig] = useState<Doc<"voertuigen"> | null>(null);
    const alerts = useApkWaarschuwingen(30);
    const alleVoertuigen = useVoertuigenLijst();

    if (!alerts || alerts.length === 0) return null;

    const heeftUrgent = alerts.some(a => a.apkVervaldatum && Math.ceil((a.apkVervaldatum - Date.now()) / 86400000) <= 14);

    function vindVoertuig(id: string): Doc<"voertuigen"> | undefined {
        return alleVoertuigen?.find((v: Doc<"voertuigen">) => v._id === id);
    }

    return (
        <>
            <section style={{
                padding: "var(--space-4)",
                background: heeftUrgent ? "rgba(239,68,68,0.06)" : "rgba(251,191,36,0.06)",
                border: `1px solid ${heeftUrgent ? "rgba(239,68,68,0.2)" : "rgba(251,191,36,0.3)"}`,
                borderRadius: "var(--radius-md)",
                display: "flex", flexDirection: "column", gap: "var(--space-3)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <span style={{ color: "#dc2626" }}><IconAlertTriangle size={16} /></span>
                    <span style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>
                        APK verloopt binnenkort
                    </span>
                    <span style={{
                        background: "#dc2626", color: "#fff", fontSize: "var(--text-xs)",
                        fontWeight: "var(--weight-bold)", borderRadius: "9999px", padding: "1px 8px",
                    }}>{alerts.length}</span>
                </div>

                {alerts.slice(0, 5).map((v) => {
                    const daysLeft = v.apkVervaldatum ? Math.ceil((v.apkVervaldatum - Date.now()) / 86400000) : null;
                    const isUrgent = daysLeft !== null && daysLeft <= 14;
                    return (
                        <button
                            key={v._id}
                            onClick={() => { const vol = vindVoertuig(v._id as string); if (vol) setGeselecteerdVoertuig(vol); }}
                            style={{
                                display: "flex", alignItems: "center", gap: "var(--space-2)",
                                background: "none", border: "none", cursor: "pointer",
                                padding: "var(--space-1) 0", textAlign: "left", width: "100%",
                                minHeight: "44px",
                            }}
                        >
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-xs)", color: "var(--color-heading)", flexShrink: 0 }}>
                                {v.kenteken}
                            </span>
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                                {v.merk} {v.model}
                            </span>
                            <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: isUrgent ? "#991b1b" : "#78350f", whiteSpace: "nowrap", flexShrink: 0 }}>
                                {daysLeft !== null ? (daysLeft < 0 ? "Verlopen" : `${daysLeft}d`) : "—"}
                            </span>
                        </button>
                    );
                })}

                {alerts.length > 5 && (
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: 0, fontStyle: "italic" }}>
                        +{alerts.length - 5} meer voertuigen…
                    </p>
                )}
            </section>

            {geselecteerdVoertuig && (
                <VoertuigDetailPanel voertuig={geselecteerdVoertuig} onSluit={() => setGeselecteerdVoertuig(null)} />
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// Snelacties
// ---------------------------------------------------------------------------

function Snelacties({
    isBalie, isEigenaar, isMobile,
    onNieuwVoertuig, onNieuweKlant, onNieuweOrder,
}: {
    isBalie: boolean; isEigenaar: boolean; isMobile: boolean;
    onNieuwVoertuig: () => void; onNieuweKlant: () => void; onNieuweOrder: () => void;
}) {
    if (!isBalie) return null;

    return (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {!isMobile && (
                <h2 style={{
                    margin: "0 0 var(--space-1)", fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-semibold)", color: "var(--color-muted)",
                    textTransform: "uppercase", letterSpacing: "var(--tracking-wider)",
                }}>
                    Snelacties
                </h2>
            )}

            {/* Op mobiel: horizontale scroll-rij van knoppen */}
            <div style={{
                display: "flex",
                flexDirection: isMobile ? "row" : "column",
                gap: "var(--space-2)",
                overflowX: isMobile ? "auto" : "visible",
                paddingBottom: isMobile ? "var(--space-1)" : 0,
            }}>
                <button onClick={onNieuweOrder} className="btn btn-primary btn-sm" style={{ minHeight: "44px", minWidth: isMobile ? "auto" : "100%", display: "inline-flex", alignItems: "center", gap: "var(--space-2)", justifyContent: "center", whiteSpace: "nowrap", padding: "0 var(--space-4)" }}>
                    <IconWrench size={14} /> Werkorder aanmaken
                </button>
                <button onClick={onNieuwVoertuig} className="btn btn-ghost btn-sm" style={{ minHeight: "44px", minWidth: isMobile ? "auto" : "100%", display: "inline-flex", alignItems: "center", gap: "var(--space-2)", justifyContent: "center", whiteSpace: "nowrap", padding: "0 var(--space-4)" }}>
                    <IconCar size={14} /> Voertuig toevoegen
                </button>
                <button onClick={onNieuweKlant} className="btn btn-ghost btn-sm" style={{ minHeight: "44px", minWidth: isMobile ? "auto" : "100%", display: "inline-flex", alignItems: "center", gap: "var(--space-2)", justifyContent: "center", whiteSpace: "nowrap", padding: "0 var(--space-4)" }}>
                    <IconPlus size={14} /> Nieuwe klant
                </button>
            </div>

            {isEigenaar && !isMobile && (
                <>
                    <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "var(--space-1) 0" }} />
                    <a href="/medewerkers" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-muted)", textDecoration: "none", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)", minHeight: "44px" }}>
                        → Medewerkers beheren
                    </a>
                    <a href="/onderhoud" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-muted)", textDecoration: "none", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)", minHeight: "44px" }}>
                        → Onderhoudshistorie
                    </a>
                </>
            )}
        </section>
    );
}

// ---------------------------------------------------------------------------
// Hoofd Export
// ---------------------------------------------------------------------------

export default function GarageDashboard() {
    const { isBalie, isEigenaar, domeinRol, isLoading } = useRol();
    const { isMobile, isTabletOrSmaller } = useResponsive();

    const [toonVoertuigModal, setToonVoertuigModal] = useState(false);
    const [toonKlantModal, setToonKlantModal] = useState(false);
    const [toonOrderModal, setToonOrderModal] = useState(false);

    if (isLoading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {[...Array(2)].map((_, i) => (
                    <div key={i} style={{ height: "80px", background: "var(--color-border)", borderRadius: "var(--radius-md)", animation: "pulse 1.5s ease infinite" }} />
                ))}
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "var(--space-4)" : "var(--space-6)" }}>

            {/* ── Niet-gekoppeld banner ── */}
            {!domeinRol && (
                <div role="status" style={{
                    padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)",
                    background: "var(--color-warning-bg, #fffbeb)",
                    border: "1px solid var(--color-warning-border, #fcd34d)",
                    color: "var(--color-warning, #92400e)", fontSize: "var(--text-sm)",
                    display: "flex", alignItems: "flex-start", gap: "var(--space-2)",
                }}>
                    <span style={{ flexShrink: 0, marginTop: "2px" }}><IconAlertTriangle size={16} /></span>
                    <span>
                        Je bent nog niet gekoppeld als garage-medewerker. Vraag de eigenaar via{" "}
                        <a href="/medewerkers" style={{ textDecoration: "underline" }}>Medewerkers</a>.
                    </span>
                </div>
            )}

            {/* ── KPI Strip ── */}
            <KPIStrip />

            {/* ── Snelacties op mobiel: BOVEN de content ── */}
            {isMobile && isBalie && (
                <Snelacties
                    isBalie={isBalie} isEigenaar={isEigenaar} isMobile={true}
                    onNieuwVoertuig={() => setToonVoertuigModal(true)}
                    onNieuweKlant={() => setToonKlantModal(true)}
                    onNieuweOrder={() => setToonOrderModal(true)}
                />
            )}

            {/* ── Hoofd layout: 1 kolom op mobile/tablet, 2 kolom op laptop+ ── */}
            <div style={{
                display: "grid",
                gridTemplateColumns: isTabletOrSmaller ? "1fr" : "minmax(0, 2fr) minmax(260px, 1fr)",
                gap: isMobile ? "var(--space-5)" : "var(--space-6)",
                alignItems: "start",
            }}>
                {/* Linker/hoofd-kolom */}
                <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "var(--space-5)" : "var(--space-8)" }}>
                    <LiveWerkplaats onNieuw={() => setToonOrderModal(true)} />
                    <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: 0 }} />
                    <RecenteBeurtFeed />
                </div>

                {/* Rechter zij-kolom — op tablet/mobiel gewoon gestapeld ná de hoofdkolom */}
                <div style={{
                    display: "flex", flexDirection: "column",
                    gap: "var(--space-4)",
                    // Alleen sticky op laptop/desktop
                    position: isTabletOrSmaller ? "static" : "sticky",
                    top: isTabletOrSmaller ? undefined : "calc(var(--nav-height, 64px) + var(--space-4))",
                }}>
                    {/* Snelacties alleen op desktop in de sidebar */}
                    {!isMobile && (
                        <Snelacties
                            isBalie={isBalie} isEigenaar={isEigenaar} isMobile={false}
                            onNieuwVoertuig={() => setToonVoertuigModal(true)}
                            onNieuweKlant={() => setToonKlantModal(true)}
                            onNieuweOrder={() => setToonOrderModal(true)}
                        />
                    )}
                    <WachtOpOphalen />
                    <ApkAlerts />
                </div>
            </div>

            {/* ── Modals ── */}
            {toonVoertuigModal && <NieuwVoertuigModal onSluit={() => setToonVoertuigModal(false)} />}
            {toonKlantModal && <NieuweKlantModal onSluit={() => setToonKlantModal(false)} />}
            {toonOrderModal && <NieuweWerkorderModal onSluit={() => setToonOrderModal(false)} />}
        </div>
    );
}
