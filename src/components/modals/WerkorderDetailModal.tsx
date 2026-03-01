/**
 * src/components/modals/WerkorderDetailModal.tsx
 *
 * Read-only detail-paneel voor een werkorder.
 * Beschikbaar voor: balie + eigenaar (isBalie).
 *
 * Design system: dezelfde structuur als NieuweKlantModal —
 *   - Sticky header met titel + ✕ sluitknop
 *   - Scrollbare body (overflowY: auto)
 *   - Vaste footer met actie-knoppen
 */

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import ModalShell from "./ModalShell";
import type { WerkorderVerrijkt } from "../../hooks/useWerkplaats";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDatum(ms: number): string {
    return new Date(ms).toLocaleDateString("nl-NL", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
}

function formatEuro(bedrag: number): string {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(bedrag);
}

const STATUS_KLEUR: Record<string, string> = {
    "Gepland": "#8b5cf6",
    "Aanwezig": "#0891b2",
    "Wachtend": "#6b7280",
    "Bezig": "#f59e0b",
    "Wacht op onderdelen": "#3b82f6",
    "Klaar": "#22c55e",
    "Afgerond": "#16a34a",
    "Geannuleerd": "#dc2626",
};

// ---------------------------------------------------------------------------
// InfoRij helper
// ---------------------------------------------------------------------------

function InfoRij({ label, waarde, mono = false }: { label: string; waarde: React.ReactNode; mono?: boolean }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{
                fontSize: "var(--text-xs)", color: "var(--color-muted)",
                fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
                {label}
            </span>
            <span style={{
                fontSize: "var(--text-sm)", color: "var(--color-heading)",
                fontWeight: "var(--weight-medium)",
                fontFamily: mono ? "var(--font-mono)" : undefined,
            }}>
                {waarde ?? "—"}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sectie
// ---------------------------------------------------------------------------

function Sectie({ titel, children }: { titel: string; children: React.ReactNode }) {
    return (
        <div>
            <p style={{
                margin: "0 0 var(--space-3)",
                fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.07em",
                borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-2)",
            }}>
                {titel}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                {children}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

interface Props {
    order: WerkorderVerrijkt;
    onSluit: () => void;
    /** Optioneel: opent Werkrapport direct vanuit het detail-modal */
    onOpenRapport?: () => void;
}

export default function WerkorderDetailModal({ order, onSluit, onOpenRapport }: Props) {
    const statusKleur = STATUS_KLEUR[order.status] ?? "#6b7280";
    const kenteken = order.voertuig?.kenteken ?? "—";

    // Read-only bevindingen — eigenaar/balie ziet wat monteur noteert
    const bevindingen = useQuery(api.werkorderBevindingen.lijstBevindingen, { werkorderId: order._id });

    return (
        <ModalShell ariaLabel={`Werkorder ${kenteken}`} onSluit={onSluit} maxWidth="620px">

            {/* ── Sticky header ── */}
            <div style={{
                padding: "var(--space-4) var(--space-5)",
                borderBottom: "1px solid var(--color-border)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                flexShrink: 0, gap: "var(--space-2)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0, flexWrap: "wrap" }}>
                    <span style={{
                        fontFamily: "var(--font-mono)", fontWeight: 900,
                        fontSize: "var(--text-lg)", letterSpacing: "0.06em", color: "var(--color-heading)",
                    }}>
                        {kenteken}
                    </span>
                    {order.voertuig && (
                        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {order.voertuig.merk} {order.voertuig.model}
                        </span>
                    )}
                    <span style={{
                        fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                        color: statusKleur, background: `${statusKleur}18`,
                        border: `1px solid ${statusKleur}44`,
                        borderRadius: "var(--radius-full, 9999px)", padding: "0.2em 0.65em", whiteSpace: "nowrap",
                    }}>
                        {order.status}
                    </span>
                </div>
                <button
                    onClick={onSluit}
                    className="btn btn-ghost btn-sm"
                    style={{ minHeight: "44px", minWidth: "44px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                    aria-label="Modal sluiten"
                >
                    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
            </div>

            {/* ── Scrollbare body ── */}
            <div style={{
                padding: "var(--space-5)",
                display: "flex", flexDirection: "column", gap: "var(--space-5)",
                overflowY: "auto", flex: 1,
            }}>
                {/* Klacht — prominent */}
                <div style={{
                    background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: "var(--radius-lg)", padding: "var(--space-4)",
                }}>
                    <p style={{ margin: "0 0 4px", fontSize: "var(--text-xs)", color: "#dc2626", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "4px" }}>
                        <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        Klacht / opdracht
                    </p>
                    <p style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--color-heading)", fontWeight: "var(--weight-medium)", lineHeight: 1.5 }}>
                        {order.klacht}
                    </p>
                </div>

                {/* Klant */}
                <Sectie titel="Klant">
                    <InfoRij
                        label="Naam"
                        waarde={order.klant ? `${order.klant.voornaam} ${order.klant.achternaam}` : null}
                    />
                    <InfoRij
                        label="Telefoon"
                        waarde={
                            order.klant?.telefoonnummer
                                ? (
                                    <a href={`tel:${order.klant.telefoonnummer}`}
                                        style={{ color: "var(--color-accent-text)", textDecoration: "none" }}>
                                        {order.klant.telefoonnummer}
                                    </a>
                                )
                                : null
                        }
                    />
                </Sectie>

                {/* Planning */}
                <Sectie titel="Planning & uitvoering">
                    <InfoRij label="Afspraakdatum" waarde={formatDatum(order.afspraakDatum)} />
                    <InfoRij label="Monteur" waarde={order.monteur?.naam ?? "Niet toegewezen"} />
                </Sectie>

                {/* Financieel */}
                {order.totaalKosten !== undefined && (
                    <Sectie titel="Financieel">
                        {order.btwInbegrepen ? (
                            <>
                                <InfoRij label="Totaal (incl. BTW)" waarde={formatEuro(order.totaalKosten)} />
                                <InfoRij label="BTW (21%)" waarde={formatEuro(order.totaalKosten - order.totaalKosten / 1.21)} />
                                <InfoRij label="Excl. BTW" waarde={formatEuro(order.totaalKosten / 1.21)} />
                            </>
                        ) : (
                            <>
                                <InfoRij label="Totaal (excl. BTW)" waarde={formatEuro(order.totaalKosten)} />
                                <InfoRij label="BTW (21%)" waarde={formatEuro(order.totaalKosten * 0.21)} />
                                <InfoRij label="Totaal (incl. BTW)" waarde={formatEuro(order.totaalKosten * 1.21)} />
                            </>
                        )}
                    </Sectie>
                )}

                {/* Werkbevindingen — read-only overzicht van monteur-notities */}
                <div>
                    <p style={{
                        margin: "0 0 var(--space-3)",
                        fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                        color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.07em",
                        borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-2)",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                        <span>Werkbevindingen</span>
                        {bevindingen && bevindingen.length > 0 && (
                            <span style={{ fontWeight: "var(--weight-medium)", color: "var(--color-body)", textTransform: "none", letterSpacing: 0 }}>
                                {bevindingen.length} item{bevindingen.length !== 1 ? "s" : ""}
                            </span>
                        )}
                    </p>

                    {/* Laadindicator */}
                    {bevindingen === undefined && (
                        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", fontStyle: "italic", margin: 0 }}>Laden…</p>
                    )}

                    {/* Leeg staat */}
                    {bevindingen !== undefined && bevindingen.length === 0 && (
                        <div style={{
                            textAlign: "center", padding: "var(--space-5) var(--space-4)",
                            border: "1px dashed var(--color-border)", borderRadius: "var(--radius-lg)",
                        }}>
                            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>Geen bevindingen geregistreerd</p>
                        </div>
                    )}

                    {/* Bevindingen tijdlijn */}
                    {bevindingen && bevindingen.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                            {bevindingen.map((b) => {
                                const TYPE_KLEUR: Record<string, { bg: string; border: string; tekst: string }> = {
                                    Bevinding: { bg: "var(--color-surface)", border: "var(--color-border)", tekst: "var(--color-body)" },
                                    Onderdeel: { bg: "var(--color-success-bg)", border: "var(--color-success-border)", tekst: "var(--color-success-text)" },
                                    Uren: { bg: "var(--color-info-bg)", border: "var(--color-info-border)", tekst: "var(--color-info-text)" },
                                    Taak: { bg: "var(--color-warning-bg)", border: "var(--color-warning-border)", tekst: "var(--color-warning-text)" },
                                };
                                const stijl = TYPE_KLEUR[b.type] ?? TYPE_KLEUR.Bevinding;
                                const datum = new Date(b.tijdstip ?? b._creationTime).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

                                return (
                                    <div key={b._id} style={{
                                        background: stijl.bg, border: `1px solid ${stijl.border}`,
                                        borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)",
                                        display: "flex", flexDirection: "column", gap: "var(--space-1)",
                                    }}>
                                        {/* Balk: type-badge + monteur + datum */}
                                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                                            <span style={{
                                                fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                                                color: stijl.tekst, padding: "0.1em 0.5em",
                                                background: stijl.border + "44", borderRadius: "var(--radius-full)",
                                            }}>
                                                {b.type === "Taak" && (b.gedaan ? "✓ " : "◻ ")}{b.type}
                                            </span>
                                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginLeft: "auto" }}>
                                                {b.medewerkerNaam} · {datum}
                                            </span>
                                        </div>

                                        {/* Omschrijving */}
                                        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-heading)", lineHeight: 1.5 }}>
                                            {b.omschrijving}
                                        </p>

                                        {/* Type-specifieke details */}
                                        {b.type === "Onderdeel" && b.onderdeel && (
                                            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginTop: "2px" }}>
                                                {b.onderdeel.artikelnummer && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>Art: {b.onderdeel.artikelnummer}</span>}
                                                {b.onderdeel.leverancier && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{b.onderdeel.leverancier}</span>}
                                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-success-text)", fontWeight: "var(--weight-semibold)", marginLeft: "auto" }}>
                                                    {b.onderdeel.aantal}x {b.onderdeel.prijs !== undefined ? `€${b.onderdeel.prijs.toFixed(2)}` : ""}
                                                </span>
                                            </div>
                                        )}
                                        {b.type === "Uren" && b.aantalUren !== undefined && (
                                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-info-text)", fontWeight: "var(--weight-semibold)" }}>
                                                {b.aantalUren % 1 === 0 ? b.aantalUren : b.aantalUren.toFixed(1)} uur
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>

            {/* ── Vaste footer ── */}
            <div style={{
                padding: "var(--space-4) var(--space-5)",
                borderTop: "1px solid var(--color-border)",
                display: "flex", flexDirection: "column", gap: "var(--space-3)",
                flexShrink: 0,
            }}>
                {/* Werkrapport — prominente primary shortcut als prop aanwezig */}
                {onOpenRapport && (
                    <button
                        onClick={() => { onSluit(); onOpenRapport(); }}
                        className="btn btn-sm"
                        style={{
                            width: "100%", minHeight: "48px",
                            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)",
                            fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)",
                            background: "var(--color-info)", color: "#fff", border: "none",
                            borderRadius: "var(--radius-md)", cursor: "pointer",
                        }}
                        aria-label="Werkrapport openen"
                    >
                        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
                        Werkrapport openen
                    </button>
                )}
                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                    <button onClick={onSluit} className="btn btn-ghost btn-sm" style={{ minHeight: "44px" }}>
                        Sluiten
                    </button>
                    <a
                        href={`/onderhoud?kenteken=${encodeURIComponent(kenteken)}`}
                        className="btn btn-ghost btn-sm"
                        style={{ minHeight: "44px", color: "var(--color-accent-text)", textDecoration: "none" }}
                        title={`Onderhoudsdossier bekijken voor ${kenteken}`}
                    >
                        Onderhoudsdossier →
                    </a>
                </div>
            </div>

        </ModalShell>
    );
}
