/**
 * src/components/klanten/MonteurKlantenView.tsx
 *
 * Monteur / Stagiair weergave: uitgekleed read-only adresboek.
 * - Zoekbalk op naam of kenteken
 * - Grote BEL-knop per klant
 * - Voertuigen van de klant (aanklikbaar)
 * - GEEN CRUD knoppen, GEEN financiële informatie
 */

import { useState } from "react";
import { useKlantenZoek, useKlantenLijst } from "../../hooks/useKlanten";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

function KlantKaartMonteur({ klant }: { klant: Doc<"klanten"> }) {
    const voertuigen = useQuery(api.voertuigen.getByKlant, { klantId: klant._id });

    return (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-4)" }}>
            {/* Naam + bel knop */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <div>
                    <p style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-base)", color: "var(--color-heading)", margin: 0 }}>
                        {klant.voornaam} {klant.achternaam}
                    </p>
                    {klant.bedrijfsnaam && (
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: "2px 0 0" }}>{klant.bedrijfsnaam}</p>
                    )}
                </div>
                <a
                    href={`tel:${klant.telefoonnummer}`}
                    style={{
                        display: "inline-flex", alignItems: "center", gap: "var(--space-2)",
                        padding: "var(--space-2) var(--space-4)", minHeight: "44px",
                        background: "linear-gradient(135deg, #16a34a, #15803d)",
                        color: "#fff", borderRadius: "var(--radius-md)",
                        textDecoration: "none", fontWeight: "var(--weight-semibold)",
                        fontSize: "var(--text-sm)", whiteSpace: "nowrap",
                    }}
                    aria-label={`Bel ${klant.voornaam} ${klant.achternaam}`}
                >
                    📞 <span style={{ fontFamily: "var(--font-mono)" }}>{klant.telefoonnummer}</span>
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
                                background: "var(--glass-bg-subtle)", borderRadius: "var(--radius-md)",
                                border: "1px solid var(--color-border)",
                            }}>
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>
                                    {v.kenteken}
                                </span>
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                    {v.merk} {v.model} ({v.bouwjaar})
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MonteurKlantenView() {
    const [zoekterm, setZoekterm] = useState("");
    const gevonden = useKlantenZoek(zoekterm);
    const alleKlanten = useKlantenLijst();

    const teLadenKlanten = zoekterm.length >= 2 ? gevonden : alleKlanten;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* Zoekbalk */}
            <div style={{ maxWidth: "480px" }}>
                <input
                    type="search"
                    value={zoekterm}
                    onChange={(e) => setZoekterm(e.target.value)}
                    placeholder="Zoek op naam of bedrijfsnaam…"
                    aria-label="Klanten zoeken"
                    className="input"
                    style={{ fontSize: "var(--text-base)", minHeight: "52px" }}
                    autoFocus
                />
            </div>

            {/* Klantlijst */}
            {teLadenKlanten === undefined ? (
                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>⏳ Laden…</p>
            ) : teLadenKlanten.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-state-icon">🔍</span>
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
