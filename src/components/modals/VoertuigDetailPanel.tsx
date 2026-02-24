/**
 * src/components/modals/VoertuigDetailPanel.tsx
 *
 * Responsive detail-weergave voor één voertuig:
 *   - Mobiel  (<768px): full-screen slide-in panel van rechts (geen overlay)
 *   - Desktop (≥768px): centered modal via ModalShell
 *
 * Secties:
 *   1. Voertuiggegevens (inclusief VIN, meldcode)
 *   2. Klantgegevens (via klantId FK join)
 *   3. Laatste 5 onderhoudsbeurten
 */

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import ModalShell from "./ModalShell";
import { useMediaQuery } from "../../hooks/useMediaQuery";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
    voertuig: Doc<"voertuigen">;
    onSluit: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_ICOON: Record<string, string> = {
    "Grote Beurt": "🔧", "Kleine Beurt": "🪛", "APK": "📋",
    "Reparatie": "🔨", "Bandenwisseling": "🔄", "Schadeherstel": "🚗",
    "Diagnostiek": "🔍", "Overig": "📦",
};

function formatDatum(ms: number) {
    return new Date(ms).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function apkKleur(ms: number | undefined): string {
    if (!ms) return "var(--color-muted)";
    const nu = Date.now();
    if (ms < nu) return "var(--color-error, #dc2626)";
    if (ms < nu + 30 * 86400000) return "var(--color-warning, #d97706)";
    return "var(--color-success, #16a34a)";
}

function apkLabel(ms: number | undefined): string {
    if (!ms) return "Onbekend";
    if (ms < Date.now()) return `Verlopen — ${formatDatum(ms)}`;
    if (ms < Date.now() + 30 * 86400000) return `Bijna verlopen — ${formatDatum(ms)}`;
    return formatDatum(ms);
}


// ---------------------------------------------------------------------------
// Gegevensrij helper
// ---------------------------------------------------------------------------

function Rij({ label, waarde, accent }: { label: string; waarde?: React.ReactNode; accent?: string }) {
    if (!waarde) return null;
    return (
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start", padding: "var(--space-2) 0", borderBottom: "1px solid var(--color-border)", minHeight: "36px" }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", width: "130px", flexShrink: 0, paddingTop: "2px" }}>{label}</span>
            <span style={{ fontSize: "var(--text-sm)", color: accent ?? "var(--color-heading)", fontWeight: "var(--weight-medium)", flex: 1, wordBreak: "break-word" }}>{waarde}</span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sectie header
// ---------------------------------------------------------------------------

function SectieKop({ titel, icoon }: { titel: string; icoon: string }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "var(--space-2)",
            margin: "var(--space-5) 0 var(--space-3)",
            paddingBottom: "var(--space-2)", borderBottom: "2px solid var(--color-border)",
        }}>
            <span style={{ fontSize: "var(--text-base)" }}>{icoon}</span>
            <h3 style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {titel}
            </h3>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Inhoud (gedeeld door mobiel + desktop)
// ---------------------------------------------------------------------------

function PanelInhoud({ voertuig, onSluit }: Props) {
    const klant = useQuery(api.klanten.getById, { klantId: voertuig.klantId });
    const beurten = useQuery(api.onderhoudshistorie.getHistorie, { voertuigId: voertuig._id });

    const recenteBeurten = (beurten ?? []).slice(0, 5);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

            {/* ── Header ── */}
            <div style={{
                padding: "var(--space-4) var(--space-5)",
                borderBottom: "1px solid var(--color-border)",
                display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-3)", flexShrink: 0,
            }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                        <span style={{
                            fontFamily: "var(--font-mono)", fontWeight: 900, fontSize: "var(--text-xl)",
                            color: "var(--color-heading)", letterSpacing: "0.06em",
                            background: "var(--gradient-accent-subtle)", border: "1px solid var(--color-border-luminous)",
                            borderRadius: "var(--radius-md)", padding: "0.15em 0.6em",
                        }}>
                            {voertuig.kenteken}
                        </span>
                        <span style={{
                            fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)",
                            background: "var(--color-surface)", border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-md)", padding: "0.15em 0.5em",
                        }}>
                            {voertuig.brandstof}
                        </span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--color-body)" }}>
                        {voertuig.merk} {voertuig.model} · {voertuig.bouwjaar}
                    </p>
                </div>
                <button onClick={onSluit} className="btn btn-ghost btn-sm" style={{ minHeight: "40px", flexShrink: 0 }} aria-label="Sluit detail">
                    ✕
                </button>
            </div>

            {/* ── Scroll-body ── */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 var(--space-5) var(--space-6)" }}>

                {/* ── Sectie 1: Voertuig ── */}
                <SectieKop titel="Voertuiggegevens" icoon="🚗" />

                <Rij label="Merk & Model" waarde={`${voertuig.merk} ${voertuig.model}`} />
                <Rij label="Bouwjaar" waarde={voertuig.bouwjaar} />
                <Rij label="Brandstof" waarde={voertuig.brandstof} />
                <Rij label="Kilometerstand" waarde={voertuig.kilometerstand !== undefined ? `${voertuig.kilometerstand.toLocaleString("nl-NL")} km` : undefined} />
                <Rij
                    label="APK Vervaldatum"
                    waarde={apkLabel(voertuig.apkVervaldatum)}
                    accent={apkKleur(voertuig.apkVervaldatum)}
                />
                {voertuig.vin && <Rij label="VIN / Chassisnummer" waarde={<span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", letterSpacing: "0.04em" }}>{voertuig.vin}</span>} />}
                {voertuig.meldcode && <Rij label="Meldcode" waarde={<span style={{ fontFamily: "var(--font-mono)" }}>{voertuig.meldcode}</span>} />}
                {voertuig.voertuigNotities && (
                    <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", background: "var(--glass-bg-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-muted)", fontStyle: "italic" }}>
                            📝 {voertuig.voertuigNotities}
                        </p>
                    </div>
                )}

                {/* ── Sectie 2: Klant ── */}
                <SectieKop titel="Eigenaar" icoon="👤" />

                {klant === undefined ? (
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>Klantgegevens laden…</p>
                ) : klant === null ? (
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", fontStyle: "italic" }}>Klant niet gevonden</p>
                ) : (
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) 0", borderBottom: "1px solid var(--color-border)" }}>
                            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-heading)", fontWeight: "var(--weight-semibold)" }}>
                                {klant.voornaam} {klant.achternaam}
                            </span>
                            {klant.bedrijfsnaam && (
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>— {klant.bedrijfsnaam}</span>
                            )}
                            <span style={{
                                marginLeft: "auto", fontSize: "11px", padding: "1px 7px",
                                borderRadius: "var(--radius-full)", background: "var(--glass-bg)",
                                border: "1px solid var(--color-border)", color: "var(--color-muted)",
                            }}>
                                {klant.klanttype}
                            </span>
                        </div>
                        <Rij label="E-mail" waarde={
                            <a href={`mailto:${klant.emailadres}`} style={{ color: "var(--color-primary)", textDecoration: "none" }}>
                                {klant.emailadres}
                            </a>
                        } />
                        <Rij label="Telefoon" waarde={
                            <a href={`tel:${klant.telefoonnummer}`} style={{ color: "var(--color-primary)", textDecoration: "none" }}>
                                {klant.telefoonnummer}
                            </a>
                        } />
                        <Rij label="Adres" waarde={`${klant.adres}, ${klant.postcode} ${klant.woonplaats}`} />
                        <Rij label="Status" waarde={
                            <span style={{
                                padding: "1px 8px", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)",
                                fontWeight: "var(--weight-semibold)",
                                background: klant.status === "Actief" ? "rgba(22,163,74,0.12)" : "var(--glass-bg)",
                                color: klant.status === "Actief" ? "var(--color-success, #16a34a)" : "var(--color-muted)",
                                border: `1px solid ${klant.status === "Actief" ? "rgba(22,163,74,0.3)" : "var(--color-border)"}`,
                            }}>
                                {klant.status}
                            </span>
                        } />
                        <Rij label="Klant sinds" waarde={formatDatum(klant.klantSinds)} />
                        {klant.klantNotities && (
                            <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", background: "var(--glass-bg-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-muted)", fontStyle: "italic" }}>
                                    📝 {klant.klantNotities}
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* ── Sectie 3: Onderhoud ── */}
                <SectieKop titel="Laatste beurten" icoon="🔧" />

                {beurten === undefined ? (
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>Beurten laden…</p>
                ) : recenteBeurten.length === 0 ? (
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", fontStyle: "italic" }}>
                        Nog geen onderhoudsbeurten geregistreerd.
                    </p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
                        {recenteBeurten.map((beurt) => (
                            <div key={beurt._id} style={{
                                display: "flex", gap: "var(--space-3)", alignItems: "flex-start",
                                padding: "var(--space-3)", background: "var(--glass-bg-subtle)",
                                borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
                            }}>
                                <span style={{ fontSize: "var(--text-lg)", lineHeight: 1, flexShrink: 0, marginTop: "2px" }}>
                                    {TYPE_ICOON[beurt.typeWerk] ?? "🔧"}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)" }}>
                                        {beurt.typeWerk}
                                    </p>
                                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                        {formatDatum(beurt.datumUitgevoerd)} · {beurt.kmStandOnderhoud.toLocaleString("nl-NL")} km
                                    </p>
                                    {beurt.werkNotities && (
                                        <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--color-body)", fontStyle: "italic" }}>
                                            {beurt.werkNotities}
                                        </p>
                                    )}
                                    {beurt.documentUrl && (
                                        <a href={beurt.documentUrl} target="_blank" rel="noreferrer"
                                            style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--color-primary)" }}>
                                            📄 Document
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                        {(beurten?.length ?? 0) > 5 && (
                            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", textAlign: "center", margin: "var(--space-1) 0 0" }}>
                                + {(beurten?.length ?? 0) - 5} oudere beurten — bekijk via Onderhoud
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Hoofd-export: Mobiel panel vs Desktop modal
// ---------------------------------------------------------------------------

export default function VoertuigDetailPanel({ voertuig, onSluit }: Props) {
    // Mobiel = < 768px (tablet-portret en kleiner) — let op: ModalShell gebruikt 640px als breakpoint
    const isMobiel = useMediaQuery("(max-width: 767px)");

    // Escape-key support voor mobiel panel (ModalShell regelt dit al voor desktop)
    useEffect(() => {
        if (!isMobiel) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onSluit(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isMobiel, onSluit]);

    // ── Desktop: Modal ──────────────────────────────────────────────────────
    if (!isMobiel) {
        return (
            <ModalShell onSluit={onSluit} maxWidth="640px" ariaLabel={`Voertuigdetails ${voertuig.kenteken}`}>
                <PanelInhoud voertuig={voertuig} onSluit={onSluit} />
            </ModalShell>
        );
    }

    // ── Mobiel: Full-screen slide-in panel ─────────────────────────────────
    // (ModalShell gebruikt bottom-sheet op <640px; hier >= 640 t/m 767px is ook mobiel)
    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 9999,
                background: "var(--color-surface)",
                display: "flex", flexDirection: "column",
                animation: "slideInRight 0.24s cubic-bezier(0.32, 0.72, 0, 1)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`Voertuigdetails ${voertuig.kenteken}`}
        >
            <PanelInhoud voertuig={voertuig} onSluit={onSluit} />
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0.6; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
            `}</style>
        </div>
    );
}
