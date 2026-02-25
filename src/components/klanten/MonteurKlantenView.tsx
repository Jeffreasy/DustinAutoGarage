/**
 * src/components/klanten/MonteurKlantenView.tsx
 *
 * Monteur / Stagiair: read-only adresboek met grote bel-knop.
 * ui-ux-pro-max fixes: emoji → SVG, hardcoded hex → design tokens, loading → skeleton.
 */

import { useState } from "react";
import { useKlantenZoek, useKlantenLijst } from "../../hooks/useKlanten";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function IconPhone() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.132.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.29 6.29l.96-.97a2 2 0 0 1 2.11-.45c.91.32 1.85.548 2.81.68A2 2 0 0 1 22 16.92Z" />
        </svg>
    );
}

function IconSearch() {
    return (
        <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function KlantSkeleton() {
    return (
        <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-4)", borderRadius: "var(--radius-xl)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", flex: 1 }}>
                    <div style={{ width: "55%", height: "16px", borderRadius: "var(--radius-md)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
                    <div style={{ width: "35%", height: "12px", borderRadius: "var(--radius-md)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
                </div>
                <div style={{ width: "110px", height: "44px", borderRadius: "var(--radius-md)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// KlantKaartMonteur
// ---------------------------------------------------------------------------

function KlantKaartMonteur({ klant }: { klant: Doc<"klanten"> }) {
    const voertuigen = useQuery(api.voertuigen.getByKlant, { klantId: klant._id });

    return (
        <div style={{
            display: "flex", flexDirection: "column", gap: "var(--space-3)",
            padding: "var(--space-4)",
            borderRadius: "var(--radius-xl)",
            background: "var(--glass-bg)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-shadow)",
        }}>
            {/* Naam + bel-knop */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <div>
                    <p style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-base)", color: "var(--color-heading)", margin: 0 }}>
                        {klant.voornaam} {klant.achternaam}
                    </p>
                    {klant.bedrijfsnaam && (
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: "2px 0 0" }}>
                            {klant.bedrijfsnaam}
                        </p>
                    )}
                </div>

                {/* Bel-knop: design token kleuren ipv hardcoded hex */}
                <a
                    href={`tel:${klant.telefoonnummer}`}
                    style={{
                        display: "inline-flex", alignItems: "center", gap: "var(--space-2)",
                        padding: "var(--space-2) var(--space-4)", minHeight: "44px",
                        background: "var(--color-success)",
                        color: "var(--color-on-accent)", borderRadius: "var(--radius-md)",
                        textDecoration: "none", fontWeight: "var(--weight-semibold)",
                        fontSize: "var(--text-sm)", whiteSpace: "nowrap",
                        transition: "opacity 150ms ease",
                    }}
                    aria-label={`Bel ${klant.voornaam} ${klant.achternaam}`}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                    <IconPhone />
                    <span style={{ fontFamily: "var(--font-mono)" }}>{klant.telefoonnummer}</span>
                </a>
            </div>

            {/* Voertuigen */}
            {voertuigen && voertuigen.length > 0 && (
                <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)" }}>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: "0 0 var(--space-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Voertuigen
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        {voertuigen.map((v) => (
                            <div key={v._id} style={{
                                display: "flex", alignItems: "center", gap: "var(--space-3)",
                                padding: "var(--space-2) var(--space-3)",
                                background: "var(--color-surface)",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--color-border)",
                            }}>
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-sm)", color: "var(--color-heading)", letterSpacing: "0.05em" }}>
                                    {v.kenteken}
                                </span>
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                    {v.merk} {v.model} · {v.bouwjaar}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export default function MonteurKlantenView() {
    const [zoekterm, setZoekterm] = useState("");
    const gevonden = useKlantenZoek(zoekterm);
    const alleKlanten = useKlantenLijst();

    const teLadenKlanten = zoekterm.length >= 2 ? gevonden : alleKlanten;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

            {/* Zoekbalk */}
            <div style={{ maxWidth: "480px", position: "relative" }}>
                <span style={{
                    position: "absolute", left: "var(--space-3)",
                    top: "50%", transform: "translateY(-50%)",
                    color: "var(--color-muted)", pointerEvents: "none",
                    display: "flex",
                }}>
                    <IconSearch />
                </span>
                <input
                    type="search"
                    value={zoekterm}
                    onChange={(e) => setZoekterm(e.target.value)}
                    placeholder="Zoek op naam of bedrijfsnaam…"
                    aria-label="Klanten zoeken"
                    className="input"
                    style={{ fontSize: "var(--text-base)", minHeight: "52px", paddingLeft: "var(--space-8)" }}
                    autoFocus
                />
            </div>

            {/* Klantlijst */}
            {teLadenKlanten === undefined ? (
                <div style={{ display: "grid", gap: "var(--space-3)", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                    {Array.from({ length: 6 }).map((_, i) => <KlantSkeleton key={i} />)}
                </div>
            ) : teLadenKlanten.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-state-icon" aria-hidden="true">
                        <IconSearch />
                    </span>
                    <p className="empty-state-title">Geen klanten gevonden</p>
                    <p className="empty-state-desc">Probeer een andere zoekterm.</p>
                </div>
            ) : (
                <div style={{ display: "grid", gap: "var(--space-3)", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                    {teLadenKlanten.map((klant) => (
                        <KlantKaartMonteur key={klant._id} klant={klant} />
                    ))}
                </div>
            )}
        </div>
    );
}
