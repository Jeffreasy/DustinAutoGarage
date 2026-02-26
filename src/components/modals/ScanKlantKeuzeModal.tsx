/**
 * src/components/modals/ScanKlantKeuzeModal.tsx
 *
 * Two-step keuze-modal die na een succesvolle kentekenScan verschijnt.
 *
 * Geeft de medewerker twee opties:
 *   1. Koppel aan bestaande klant  → zoekbalk → klantId doorgeven aan NieuwVoertuigModal
 *   2. Doorgaan zonder klant       → NieuwVoertuigModal zonder klantId
 *
 * Ontvangt scan-preFill data zodat de volgende modal volledig voorgepopuleerd is.
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import ModalShell from "./ModalShell";
import type { ScanPreFillData } from "../../hooks/useScannerActie";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScanKlantKeuzeResult {
    klantId?: Id<"klanten">;
    klantNaam?: string;
}

interface Props {
    /**
     * Optionele scan-data (kenteken + RDW).  
     * Als weggelaten: modal start direct bij de klant-keuze zonder scan-samenvatting.
     */
    preFill?: ScanPreFillData;
    /** Callback: gebruiker heeft gekozen (met of zonder klant). */
    onKeuze: (keuze: ScanKlantKeuzeResult) => void;
    /** Callback: modal annuleren zonder actie. */
    onSluit: () => void;
}

// ---------------------------------------------------------------------------
// SVG icons
// ---------------------------------------------------------------------------

function IconUser() {
    return (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function IconSearch() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

function IconCar() {
    return (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2" />
            <circle cx="9" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
        </svg>
    );
}

function IconCheck() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function IconChevronRight() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// ScanKlantKeuzeModal
// ---------------------------------------------------------------------------

export default function ScanKlantKeuzeModal({ preFill, onKeuze, onSluit }: Props) {
    const [zoek, setZoek] = useState("");
    const [gekozenId, setGekozenId] = useState<Id<"klanten"> | null>(null);
    const [gekozenNaam, setGekozenNaam] = useState("");

    const klantResultaten = useQuery(
        api.klanten.zoek,
        zoek.length >= 2 ? { term: zoek } : "skip",
    );

    const kenteken = preFill?.kenteken;
    const voertuigLabel = preFill
        ? [preFill.merk, preFill.model, preFill.bouwjaar ? String(preFill.bouwjaar) : ""].filter(Boolean).join(" ")
        : null;

    // Bevestig keuze: met klant
    function handleKoppelKlant() {
        if (!gekozenId) return;
        onKeuze({ klantId: gekozenId, klantNaam: gekozenNaam });
    }

    // Bevestig keuze: zonder klant
    function handleZonderKlant() {
        onKeuze({});
    }

    // Klant selecteren uit de zoekresultaten
    function selecteerKlant(id: Id<"klanten">, naam: string) {
        setGekozenId(id);
        setGekozenNaam(naam);
        setZoek(""); // sluit dropdown
    }

    return (
        <ModalShell onSluit={onSluit} ariaLabel="Voertuig koppelen aan klant" maxWidth="480px">
            {/* Header */}
            <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <IconUser /> Voertuig koppelen
                </h2>
                <button onClick={onSluit} className="btn btn-ghost btn-sm" style={{ minHeight: "40px" }} aria-label="Modal sluiten">✕</button>
            </div>

            <div style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)", overflowY: "auto" }}>
                {/* Scan-samenvatting — alleen tonen als er scan-data beschikbaar is */}
                {kenteken && (
                    <div style={{
                        display: "flex", alignItems: "center", gap: "var(--space-3)",
                        padding: "var(--space-3) var(--space-4)",
                        background: "var(--color-accent-dim)",
                        border: "1px solid var(--color-accent)",
                        borderRadius: "var(--radius-xl)",
                    }}>
                        <span style={{ color: "var(--color-accent)", flexShrink: 0 }}><IconCar /></span>
                        <div>
                            <p style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>
                                {kenteken}
                            </p>
                            {voertuigLabel && (
                                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-muted)", marginTop: "2px" }}>
                                    {preFill?.voertuigsoort ? `${preFill.voertuigsoort} — ` : ""}{voertuigLabel}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Sectie: bestaande klant zoeken */}
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)" }}>
                        <IconUser /> &nbsp;Koppel aan bestaande klant
                    </p>

                    {/* Geselecteerde klant chip */}
                    {gekozenId ? (
                        <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "var(--space-2) var(--space-3)",
                            background: "var(--color-success-bg)",
                            border: "1px solid var(--color-success-border)",
                            borderRadius: "var(--radius-lg)",
                        }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-success)", fontWeight: "var(--weight-semibold)" }}>
                                <IconCheck /> {gekozenNaam}
                            </span>
                            <button
                                type="button"
                                onClick={() => { setGekozenId(null); setGekozenNaam(""); }}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-xs)", color: "var(--color-muted)", padding: "0 var(--space-1)" }}
                            >
                                Wijzig
                            </button>
                        </div>
                    ) : (
                        /* Zoekbalk */
                        <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", pointerEvents: "none" }}>
                                <IconSearch />
                            </span>
                            <input
                                type="search"
                                value={zoek}
                                onChange={(e) => setZoek(e.target.value)}
                                placeholder="Zoek op naam of e-mailadres…"
                                className="input"
                                style={{ minHeight: "44px", paddingLeft: "36px" }}
                                aria-label="Klant zoeken"
                                autoFocus
                            />

                            {/* Zoekresultaten dropdown */}
                            {zoek.length >= 2 && (
                                <div style={{
                                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                                    background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                                    borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)",
                                    maxHeight: "220px", overflowY: "auto",
                                }}>
                                    {klantResultaten === undefined ? (
                                        <p style={{ margin: 0, padding: "var(--space-3)", fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>Zoeken…</p>
                                    ) : klantResultaten.length === 0 ? (
                                        <p style={{ margin: 0, padding: "var(--space-3)", fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>Geen klanten gevonden voor "{zoek}"</p>
                                    ) : (
                                        klantResultaten.map((k) => {
                                            const naam = `${k.voornaam} ${k.achternaam}`;
                                            return (
                                                <button
                                                    key={k._id}
                                                    type="button"
                                                    onClick={() => selecteerKlant(k._id, naam)}
                                                    style={{
                                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                                        width: "100%", textAlign: "left",
                                                        padding: "var(--space-2) var(--space-4)",
                                                        background: "none", border: "none", borderBottom: "1px solid var(--color-border)",
                                                        cursor: "pointer", transition: "background var(--transition-base)",
                                                    }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--glass-bg-subtle)")}
                                                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                                                >
                                                    <span>
                                                        <span style={{ display: "block", fontSize: "var(--text-sm)", color: "var(--color-heading)", fontWeight: "var(--weight-medium)" }}>{naam}</span>
                                                        <span style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{k.emailadres} · {k.telefoonnummer}</span>
                                                    </span>
                                                    <IconChevronRight />
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Koppelen-knop */}
                    <button
                        type="button"
                        disabled={!gekozenId}
                        onClick={handleKoppelKlant}
                        className="btn btn-primary"
                        style={{ minHeight: "48px", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", opacity: gekozenId ? 1 : 0.45 }}
                    >
                        <IconUser /> Koppel aan {gekozenNaam || "geselecteerde klant"}
                    </button>
                </div>

                {/* Scheidingslijn */}
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", flexShrink: 0 }}>of</span>
                    <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
                </div>

                {/* Doorgaan zonder klant */}
                <button
                    type="button"
                    onClick={handleZonderKlant}
                    className="btn btn-ghost"
                    style={{ minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)" }}
                >
                    <IconCar /> Voertuig opslaan zonder klant-koppeling
                </button>
            </div>{/* /content-div */}
        </ModalShell>
    );
}
