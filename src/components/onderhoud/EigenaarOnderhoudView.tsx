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

import { useState } from "react";
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
import { TYPE_ICOON, formatDatum } from "./utils";
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

function KPIDashboard() {
    const stats = useTotaalStatistieken();
    const [toonBeurtenModal, setToonBeurtenModal] = useState(false);

    const kpis = [
        {
            label: "Totaal beurten",
            waarde: stats?.totaal ?? "—",
            icon: <IconWrench />,
            color: "var(--color-accent-text)",
            bg: "var(--color-accent-dim)",
        },
        {
            label: "APK's deze maand",
            waarde: stats?.apksDezeMaand ?? "—",
            icon: <IconClipboard />,
            color: "var(--color-info)",
            bg: "var(--color-info-bg)",
        },
        {
            label: "Grote beurten",
            waarde: stats?.groteBeurten ?? "—",
            icon: <IconWrench />,
            color: "var(--color-warning)",
            bg: "var(--color-warning-bg)",
        },
        {
            label: "Reparaties",
            waarde: stats?.reparaties ?? "—",
            icon: <IconWrench />,
            color: "var(--color-error)",
            bg: "var(--color-error-bg)",
        },
    ];

    return (
        <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
                {kpis.map(({ label, waarde, icon, color, bg }) => (
                    <div key={label} className="card" style={{
                        padding: "var(--space-4) var(--space-5)",
                        display: "flex", flexDirection: "column", gap: "var(--space-3)",
                        borderLeft: `3px solid ${color}`,
                        position: "relative", overflow: "hidden",
                        transition: "var(--transition-base)",
                    }}>
                        <div style={{
                            position: "absolute", top: "var(--space-3)", right: "var(--space-3)",
                            color, background: bg, borderRadius: "var(--radius-sm)",
                            padding: "6px", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            {icon}
                        </div>
                        <div style={{
                            fontSize: "var(--text-3xl)", fontWeight: "var(--weight-bold)",
                            color: stats ? "var(--color-heading)" : "var(--color-muted)",
                            fontVariantNumeric: "tabular-nums",
                            lineHeight: 1,
                        }}>
                            {stats === undefined ? (
                                <span style={{ display: "inline-block", width: "3ch", height: "1em", background: "var(--skeleton-base)", borderRadius: "var(--radius-xs)", animation: "pulse 1.5s ease infinite" }} />
                            ) : waarde}
                        </div>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontWeight: "var(--weight-medium)", textTransform: "uppercase", letterSpacing: "var(--tracking-wider)" }}>
                            {label}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: "var(--space-3)", display: "flex", justifyContent: "flex-end" }}>
                <button
                    onClick={() => setToonBeurtenModal(true)}
                    className="btn btn-ghost btn-sm"
                    style={{ minHeight: "36px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)" }}
                >
                    <IconClipboard /> Beurten overzicht
                </button>
            </div>

            {toonBeurtenModal && <BeurtenOverzichtModal onSluit={() => setToonBeurtenModal(false)} />}
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
                <div style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Nog geen onderhoudsbeurten geregistreerd.</div>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {beurten.map((b: BeurtVerrijkt) => (
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
                    }}
                    aria-label={b.voertuig ? `Open dossier ${b.voertuig.kenteken}` : b.typeWerk}
                >
                    {/* Type icoon */}
                    <div style={{
                        width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center",
                        background: "var(--color-accent-dim)", borderRadius: "var(--radius-sm)",
                        color: "var(--color-accent-text)", fontSize: "var(--text-lg)", flexShrink: 0,
                    }}>
                        {TYPE_ICOON[b.typeWerk as TypeWerk] ?? "🔧"}
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
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Garage Audit Trail (werkorderLogs — alle acties van het team)
// ---------------------------------------------------------------------------

type GarageLogRegel = NonNullable<ReturnType<typeof useGarageActiviteit>>[number];

function GarageAuditTrail() {
    const logs = useGarageActiviteit(60);

    if (logs === undefined) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {[...Array(6)].map((_, i) => (
                    <div key={i} style={{ height: "56px", background: "var(--skeleton-base)", borderRadius: "var(--radius-md)", animation: "pulse 1.5s ease infinite" }} />
                ))}
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="card" style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>
                Nog geen activiteit geregistreerd.
            </div>
        );
    }

    // Groepeer op datum
    const groepen: Record<string, GarageLogRegel[]> = {};
    logs.forEach((log: GarageLogRegel) => {
        const sleutel = new Date(log.tijdstip).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
        if (!groepen[sleutel]) groepen[sleutel] = [];
        groepen[sleutel].push(log);
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {Object.entries(groepen).map(([datum, regels]) => (
                <div key={datum}>
                    {/* Datum-header */}
                    <div style={{
                        display: "flex", alignItems: "center", gap: "var(--space-3)",
                        marginBottom: "var(--space-2)",
                    }}>
                        <div style={{
                            fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                            color: "var(--color-muted)", textTransform: "uppercase",
                            letterSpacing: "var(--tracking-wider)", whiteSpace: "nowrap",
                        }}>{datum}</div>
                        <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
                    </div>

                    {/* Regels */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                        {regels.map((log: GarageLogRegel) => (
                            <div key={log._id} style={{
                                display: "grid", gridTemplateColumns: "auto 1fr auto",
                                gap: "var(--space-3)", padding: "var(--space-2) var(--space-3)",
                                borderRadius: "var(--radius-sm)",
                                background: "var(--color-surface-2)",
                                borderLeft: "2px solid var(--color-border)",
                                alignItems: "center",
                                transition: "var(--transition-fast)",
                            }}
                                onMouseEnter={(e) => (e.currentTarget.style.borderLeftColor = "var(--color-accent)")}
                                onMouseLeave={(e) => (e.currentTarget.style.borderLeftColor = "var(--color-border)")}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: "28px", height: "28px", borderRadius: "var(--radius-full)",
                                    background: "var(--color-accent-dim)", color: "var(--color-accent-text)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)",
                                    flexShrink: 0,
                                }}>
                                    {log.medewerkerNaam?.charAt(0).toUpperCase() ?? "?"}
                                </div>

                                {/* Content */}
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                                        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)" }}>
                                            {log.medewerkerNaam}
                                        </span>
                                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-body)" }}>
                                            {log.actie}
                                        </span>
                                        {log.voertuigKenteken && (
                                            <span style={{
                                                fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)",
                                                background: "var(--color-surface-4)", borderRadius: "var(--radius-xs)",
                                                padding: "1px 5px", color: "var(--color-heading)",
                                                fontWeight: "var(--weight-bold)",
                                            }}>{log.voertuigKenteken}</span>
                                        )}
                                    </div>
                                    {log.notitie && (
                                        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontStyle: "italic", marginTop: "2px" }}>
                                            "{log.notitie}"
                                        </div>
                                    )}
                                </div>

                                {/* Tijd */}
                                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                                    {new Date(log.tijdstip).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Voertuig Dossier (eigenaar — inclusief verwijder)
// ---------------------------------------------------------------------------

function EigenaarDossier({ voertuig, onTerug }: { voertuig: Doc<"voertuigen">; onTerug: () => void }) {
    const historie = useVoertuigHistorie(voertuig._id);
    const verwijder = useMutation(api.onderhoudshistorie.verwijder);
    const [toonNieuw, setToonNieuw] = useState(false);
    const [verwijderBezig, setVerwijderBezig] = useState<Id<"onderhoudshistorie"> | null>(null);
    const [verwijderConfirm, setVerwijderConfirm] = useState<Id<"onderhoudshistorie"> | null>(null);

    async function handleVerwijder(id: Id<"onderhoudshistorie">) {
        setVerwijderConfirm(null);
        setVerwijderBezig(id);
        try { await verwijder({ historieId: id }); } finally { setVerwijderBezig(null); }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* Dossier header */}
            <div style={{
                display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap",
                padding: "var(--space-4)", background: "var(--color-surface-2)",
                borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
            }}>
                <button onClick={onTerug} className="btn btn-ghost btn-sm" style={{ minHeight: "40px", gap: "var(--space-1)" }}>
                    <IconChevronLeft /> Terug
                </button>
                <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                        <span style={{
                            fontFamily: "var(--font-mono)", fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)",
                            color: "var(--color-heading)", letterSpacing: "var(--tracking-wider)",
                            background: "var(--color-surface-4)", padding: "var(--space-1) var(--space-3)",
                            borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)",
                        }}>{voertuig.kenteken}</span>
                        <span style={{ fontSize: "var(--text-base)", color: "var(--color-body)", fontWeight: "var(--weight-medium)" }}>
                            {voertuig.merk} {voertuig.model}
                        </span>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                            {voertuig.bouwjaar} · {voertuig.brandstof}
                            {voertuig.kilometerstand !== undefined && ` · ${voertuig.kilometerstand.toLocaleString("nl-NL")} km`}
                        </span>
                    </div>
                </div>
                <button onClick={() => setToonNieuw(true)} className="btn btn-primary" style={{ minHeight: "40px", gap: "var(--space-1)" }}>
                    <IconPlus /> Beurt registreren
                </button>
            </div>

            {/* Dossier entries */}
            {historie === undefined ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="card" style={{ height: "76px", background: "var(--skeleton-base)", animation: "pulse 1.5s ease infinite" }} />
                    ))}
                </div>
            ) : historie.length === 0 ? (
                <div className="card" style={{ padding: "var(--space-10)", textAlign: "center" }}>
                    <div style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Geen beurten gevonden.</div>
                    <button onClick={() => setToonNieuw(true)} className="btn btn-primary" style={{ marginTop: "var(--space-4)", minHeight: "44px" }}>
                        <IconPlus /> Eerste beurt toevoegen
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {historie.map((beurt) => (
                        <div key={beurt._id} className="card" style={{ padding: "var(--space-4)" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-3)" }}>
                                <div style={{ display: "flex", gap: "var(--space-3)", flex: 1, alignItems: "flex-start" }}>
                                    <div style={{
                                        width: "36px", height: "36px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                                        background: "var(--color-accent-dim)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-lg)",
                                    }}>
                                        {TYPE_ICOON[beurt.typeWerk as TypeWerk] ?? "🔧"}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", fontSize: "var(--text-sm)" }}>{beurt.typeWerk}</div>
                                        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginTop: "2px" }}>
                                            {formatDatum(beurt.datumUitgevoerd)} · {beurt.kmStandOnderhoud.toLocaleString("nl-NL")} km
                                        </div>
                                        {beurt.werkNotities && (
                                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-body)", fontStyle: "italic", marginTop: "var(--space-1)" }}>{beurt.werkNotities}</div>
                                        )}
                                        {beurt.documentUrl && (
                                            <a href={beurt.documentUrl} target="_blank" rel="noreferrer"
                                                style={{ display: "inline-flex", gap: "4px", marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-accent-text)" }}>
                                                📄 Document bekijken
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-1)" }}>
                                    {verwijderConfirm === beurt._id ? (
                                        // Inline confirm — geen window.confirm()
                                        <div style={{
                                            display: "flex", flexDirection: "column", gap: "var(--space-1)",
                                            background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.25)",
                                            borderRadius: "var(--radius-sm)", padding: "var(--space-2)",
                                        }}>
                                            <span style={{ fontSize: "var(--text-xs)", color: "#991b1b", fontWeight: "var(--weight-semibold)", whiteSpace: "nowrap" }}>
                                                Definitief verwijderen?
                                            </span>
                                            <div style={{ display: "flex", gap: "var(--space-1)" }}>
                                                <button
                                                    onClick={() => handleVerwijder(beurt._id)}
                                                    disabled={verwijderBezig === beurt._id}
                                                    style={{
                                                        minHeight: "28px", padding: "0 var(--space-2)",
                                                        background: "#dc2626", color: "#fff", border: "none",
                                                        borderRadius: "var(--radius-sm)", cursor: "pointer",
                                                        fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                                                    }}
                                                    aria-label="Definitief verwijderen"
                                                >
                                                    {verwijderBezig === beurt._id ? "…" : "Ja"}
                                                </button>
                                                <button
                                                    onClick={() => setVerwijderConfirm(null)}
                                                    className="btn btn-ghost"
                                                    style={{ minHeight: "28px", padding: "0 var(--space-2)", fontSize: "var(--text-xs)" }}
                                                    aria-label="Annuleren"
                                                >
                                                    Nee
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setVerwijderConfirm(beurt._id)}
                                            disabled={!!verwijderBezig}
                                            className="btn btn-ghost btn-sm"
                                            aria-label="Verwijder beurt"
                                            style={{ color: "var(--color-error)", minHeight: "32px", padding: "0 var(--space-2)" }}
                                        >
                                            <IconTrash />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {toonNieuw && <NieuweBeurtModal voertuig={voertuig} onSluit={() => setToonNieuw(false)} />}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Voertuig Zoeken Tab
// ---------------------------------------------------------------------------

function VoertuigZoekenTab({ onOpenDossier }: { onOpenDossier: (v: Doc<"voertuigen">) => void }) {
    const [zoek, setZoek] = useState("");
    const resultaten = useQuery(api.voertuigen.zoekOpKenteken, zoek.length >= 2 ? { term: zoek } : "skip");

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ position: "relative", maxWidth: "380px" }}>
                <div style={{ position: "absolute", left: "var(--space-3)", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", pointerEvents: "none" }}>
                    <IconSearch />
                </div>
                <input
                    type="search"
                    value={zoek}
                    onChange={(e) => setZoek(e.target.value)}
                    placeholder="Kenteken zoeken (min. 2 tekens)…"
                    className="input"
                    style={{ paddingLeft: "2.5rem", minHeight: "44px" }}
                    autoFocus
                />
            </div>

            {zoek.length >= 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {resultaten === undefined ? (
                        <div style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Zoeken…</div>
                    ) : resultaten.length === 0 ? (
                        <div style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>Geen voertuigen gevonden voor "{zoek}".</div>
                    ) : resultaten.map((v) => (
                        <button
                            key={v._id}
                            onClick={() => onOpenDossier(v)}
                            className="card card-interactive"
                            style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", width: "100%", cursor: "pointer", display: "flex", alignItems: "center", gap: "var(--space-4)" }}
                            aria-label={`Open dossier ${v.kenteken}`}
                        >
                            <span style={{
                                fontFamily: "var(--font-mono)", fontWeight: "var(--weight-bold)", fontSize: "var(--text-base)",
                                color: "var(--color-heading)", letterSpacing: "var(--tracking-wide)",
                                background: "var(--color-surface-3)", padding: "var(--space-1) var(--space-2)",
                                borderRadius: "var(--radius-xs)", border: "1px solid var(--color-border)",
                            }}>{v.kenteken}</span>
                            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", flex: 1 }}>
                                {v.merk} {v.model} · {v.bouwjaar} · {v.brandstof}
                            </span>
                            {v.kilometerstand !== undefined && (
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                    {v.kilometerstand.toLocaleString("nl-NL")} km
                                </span>
                            )}
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-accent-text)", fontWeight: "var(--weight-semibold)" }}>dossier →</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Export — Tabbed Layout
// ---------------------------------------------------------------------------

type Tab = "overzicht" | "voertuig" | "activiteit";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overzicht", label: "Overzicht", icon: <IconActivity /> },
    { id: "voertuig", label: "Voertuigdossier", icon: <IconCar /> },
    { id: "activiteit", label: "Teamactiviteit", icon: <IconClipboard /> },
];

export default function EigenaarOnderhoudView() {
    const [actieveTab, setActieveTab] = useState<Tab>("overzicht");
    const [geselecteerdVoertuig, setGeselecteerdVoertuig] = useState<Doc<"voertuigen"> | null>(null);

    function handleOpenDossier(v: Doc<"voertuigen">) {
        setGeselecteerdVoertuig(v);
        setActieveTab("voertuig");
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* Tab navigatie */}
            <div style={{
                display: "flex", gap: "var(--space-1)",
                borderBottom: "2px solid var(--color-border)",
                paddingBottom: "0",
            }}>
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActieveTab(tab.id); if (tab.id !== "voertuig") setGeselecteerdVoertuig(null); }}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: "var(--space-2)",
                            padding: "var(--space-2) var(--space-4)",
                            fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)",
                            border: "none", background: "transparent", cursor: "pointer",
                            color: actieveTab === tab.id ? "var(--color-accent-text)" : "var(--color-muted)",
                            borderBottom: actieveTab === tab.id ? "2px solid var(--color-accent)" : "2px solid transparent",
                            marginBottom: "-2px",
                            transition: "var(--transition-base)",
                            borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
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
                            <h2 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "var(--tracking-wider)" }}>
                                Recente onderhoudsbeurten
                            </h2>
                            <ActiviteitsFeed onOpenDossier={handleOpenDossier} />
                        </section>
                    </div>
                )}

                {actieveTab === "voertuig" && (
                    geselecteerdVoertuig
                        ? <EigenaarDossier voertuig={geselecteerdVoertuig} onTerug={() => setGeselecteerdVoertuig(null)} />
                        : <VoertuigZoekenTab onOpenDossier={handleOpenDossier} />
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
