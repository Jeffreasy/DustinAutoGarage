/**
 * src/components/onderhoud/MijnVoertuigenTab.tsx
 *
 * Persoonlijke voertuigen voor medewerkers (alle rollen).
 *
 * Werking:
 *   1. Controleer of de medewerker al een intern klant-profiel heeft.
 *   2. Zo niet: toon een knop om een profiel aan te maken.
 *   3. Zo ja: toon de voertuigen gekoppeld aan dat profiel via EigenaarDossier.
 *
 * Security:
 *   - Elke rol ziet alleen de eigen voertuigen.
 *   - Balie+ kan voertuig toevoegen; monteur/stagiair ziet alleen, geen toevoeg-knop.
 */

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useMijnKlantProfiel, useRegistreerMedewerkerAlsKlant, useVoertuigHistorie } from "../../hooks/useOnderhoud";
import { SOORT_CONFIG } from "./utils";
import type { TypeWerk } from "./utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function IconCar() {
    return (
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2" />
            <circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
        </svg>
    );
}

function IconPlus() {
    return (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

function SoortSvg({ type }: { type: string }) {
    const cfg = SOORT_CONFIG[type];
    if (!cfg) return null;
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d={cfg.iconPath} />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Voertuig mini-dossier kaart
// ---------------------------------------------------------------------------

function VoertuigMiniKaart({
    voertuig,
    onOpenDossier,
}: {
    voertuig: Doc<"voertuigen">;
    onOpenDossier: (v: Doc<"voertuigen">) => void;
}) {
    const historie = useVoertuigHistorie(voertuig._id);
    const totaal = historie?.length ?? 0;
    const laatsTeBeurt = historie && historie.length > 0
        ? [...historie].sort((a, b) => b.datumUitgevoerd - a.datumUitgevoerd)[0]
        : null;

    return (
        <div className="card" style={{ borderLeft: "3px solid var(--color-accent)" }}>
            <div style={{ padding: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
                {/* Kenteken badge */}
                <span style={{
                    fontFamily: "var(--font-mono)", fontWeight: "var(--weight-bold)",
                    fontSize: "var(--text-lg)", letterSpacing: "var(--tracking-wider)",
                    background: "var(--color-surface-3)", border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)", padding: "var(--space-1) var(--space-3)",
                    color: "var(--color-heading)", flexShrink: 0,
                }}>
                    {voertuig.kenteken}
                </span>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>
                        {voertuig.merk} {voertuig.model}
                    </div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginTop: "2px" }}>
                        {voertuig.bouwjaar} · {voertuig.brandstof}
                        {voertuig.kilometerstand !== undefined && ` · ${voertuig.kilometerstand.toLocaleString("nl-NL")} km`}
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: "flex", gap: "var(--space-3)", flexShrink: 0 }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", fontVariantNumeric: "tabular-nums" }}>
                            {historie === undefined ? "—" : totaal}
                        </div>
                        <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted)", fontWeight: "600" }}>beurten</div>
                    </div>
                </div>

                {/* Open dossier knop */}
                <button
                    onClick={() => onOpenDossier(voertuig)}
                    className="btn btn-primary btn-sm"
                    style={{ minHeight: "36px", gap: "var(--space-1)", flexShrink: 0 }}
                    aria-label={`Open dossier van ${voertuig.kenteken}`}
                >
                    Dossier →
                </button>
            </div>

            {/* Laatste beurt */}
            {laatsTeBeurt && (
                <div style={{
                    borderTop: "1px solid var(--color-border)",
                    padding: "var(--space-2) var(--space-4)",
                    display: "flex", alignItems: "center", gap: "var(--space-2)",
                    fontSize: "var(--text-xs)", color: "var(--color-muted)",
                }}>
                    <SoortSvg type={laatsTeBeurt.typeWerk} />
                    <span>Laatste: <strong style={{ color: "var(--color-body)" }}>{laatsTeBeurt.typeWerk}</strong></span>
                    <span>—</span>
                    <span>{new Date(laatsTeBeurt.datumUitgevoerd).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// VoertuigToevoegenFormulier (inline, niet modal)
// ---------------------------------------------------------------------------

function VoertuigToevoegenFormulier({
    klantId,
    onGedaan,
}: {
    klantId: string;
    onGedaan: () => void;
}) {
    const maakVoertuig = useMutation(api.voertuigen.create);
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState<string | null>(null);
    const [kenteken, setKenteken] = useState("");
    const [merk, setMerk] = useState("");
    const [model, setModel] = useState("");
    const [bouwjaar, setBouwjaar] = useState("");
    const [brandstof, setBrandstof] = useState<string>("Benzine");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!kenteken.trim() || !merk.trim() || !model.trim() || !bouwjaar) return;
        setBezig(true);
        setFout(null);
        try {
            await maakVoertuig({
                klantId: klantId as never,
                kenteken: kenteken.trim().toUpperCase().replace(/[-\s]/g, ""),
                merk: merk.trim(),
                model: model.trim(),
                bouwjaar: parseInt(bouwjaar, 10),
                brandstof: brandstof as never,
            });
            onGedaan();
        } catch (err) {
            setFout(err instanceof Error ? err.message : "Onbekende fout.");
        } finally {
            setBezig(false);
        }
    }

    const inputStyle: React.CSSProperties = { minHeight: "44px", width: "100%", boxSizing: "border-box" };

    return (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
                <div>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)", display: "block", marginBottom: "var(--space-1)" }}>
                        Kenteken *
                    </label>
                    <input className="input" style={inputStyle} value={kenteken} onChange={e => setKenteken(e.target.value)}
                        placeholder="AB-123-C" required aria-label="Kenteken" />
                </div>
                <div>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)", display: "block", marginBottom: "var(--space-1)" }}>
                        Merk *
                    </label>
                    <input className="input" style={inputStyle} value={merk} onChange={e => setMerk(e.target.value)}
                        placeholder="Volkswagen" required aria-label="Merk" />
                </div>
                <div>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)", display: "block", marginBottom: "var(--space-1)" }}>
                        Model *
                    </label>
                    <input className="input" style={inputStyle} value={model} onChange={e => setModel(e.target.value)}
                        placeholder="Golf" required aria-label="Model" />
                </div>
                <div>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)", display: "block", marginBottom: "var(--space-1)" }}>
                        Bouwjaar *
                    </label>
                    <input className="input" type="number" style={inputStyle} value={bouwjaar} onChange={e => setBouwjaar(e.target.value)}
                        placeholder="2020" min={1900} max={new Date().getFullYear() + 1} required aria-label="Bouwjaar" />
                </div>
                <div>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)", display: "block", marginBottom: "var(--space-1)" }}>
                        Brandstof *
                    </label>
                    <select className="input" style={inputStyle} value={brandstof} onChange={e => setBrandstof(e.target.value)} aria-label="Brandstof">
                        {["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "Waterstof", "Overig"].map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                </div>
            </div>

            {fout && (
                <div style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-error-bg)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-error-text)" }}>
                    {fout}
                </div>
            )}

            <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
                <button type="button" onClick={onGedaan} className="btn btn-ghost" style={{ minHeight: "44px" }} disabled={bezig}>
                    Annuleren
                </button>
                <button type="submit" className="btn btn-primary" style={{ minHeight: "44px", gap: "var(--space-1)" }} disabled={bezig}>
                    {bezig ? "Toevoegen…" : <><IconPlus /> Voertuig toevoegen</>}
                </button>
            </div>
        </form>
    );
}

// ---------------------------------------------------------------------------
// MijnVoertuigenTab — hoofdcomponent
// ---------------------------------------------------------------------------

interface MijnVoertuigenTabProps {
    /** Callback om voertuig-dossier te openen in de Voertuigdossier tab */
    onOpenDossier: (v: Doc<"voertuigen">) => void;
    /** Huidige rol — bepaalt of voertuig toevoegen beschikbaar is */
    domeinRol: "eigenaar" | "balie" | "monteur" | "stagiair";
    /** Naam van de ingelogde medewerker (voor automatisch profiel aanmaken) */
    naam: string;
}

export default function MijnVoertuigenTab({ onOpenDossier, domeinRol, naam }: MijnVoertuigenTabProps) {
    const klantProfiel = useMijnKlantProfiel();
    const registreer = useRegistreerMedewerkerAlsKlant();
    const mijnVoertuigen = useQuery(
        api.voertuigen.getByKlant,
        klantProfiel ? { klantId: klantProfiel._id } : "skip"
    );

    const [bezig, setBezig] = useState(false);
    const [toonFormulier, setToonFormulier] = useState(false);
    const [fout, setFout] = useState<string | null>(null);

    const magToevoegen = domeinRol === "eigenaar" || domeinRol === "balie" || domeinRol === "monteur";

    // Medewerker heeft nog geen intern profiel — registreer automatisch
    async function handleRegistreer() {
        setBezig(true);
        setFout(null);
        try {
            const naamDelen = naam.trim().split(" ");
            const voornaam = naamDelen[0] ?? naam;
            const achternaam = naamDelen.slice(1).join(" ") || "—";
            await registreer({ voornaam, achternaam });
        } catch (err) {
            setFout(err instanceof Error ? err.message : "Onbekende fout.");
        } finally {
            setBezig(false);
        }
    }

    // Loading
    if (klantProfiel === undefined) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {[...Array(2)].map((_, i) => (
                    <div key={i} style={{ height: "96px", background: "var(--skeleton-base)", borderRadius: "var(--radius-md)", animation: "pulse 1.5s ease infinite" }} />
                ))}
            </div>
        );
    }

    // Geen intern profiel — eerste keer
    if (klantProfiel === null) {
        return (
            <div className="card" style={{ padding: "var(--space-10)", textAlign: "center" }}>
                <IconCar />
                <h3 style={{ margin: "var(--space-3) 0 var(--space-2)", fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)" }}>
                    Nog geen persoonlijk voertuigprofiel
                </h3>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", margin: "0 0 var(--space-5)", maxWidth: "360px", marginInline: "auto" }}>
                    Registreer je persoonlijke voertuigen zodat je ze terugvindt in het dossier.
                    Je voertuigen zijn alleen voor jou zichtbaar.
                </p>
                {fout && (
                    <div style={{ marginBottom: "var(--space-3)", padding: "var(--space-2) var(--space-3)", background: "var(--color-error-bg)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-error-text)", maxWidth: "360px", marginInline: "auto" }}>
                        {fout}
                    </div>
                )}
                {magToevoegen && (
                    <button
                        onClick={handleRegistreer}
                        disabled={bezig}
                        className="btn btn-primary"
                        style={{ minHeight: "48px", gap: "var(--space-2)", fontSize: "var(--text-sm)" }}
                    >
                        {bezig ? "Bezig…" : <><IconPlus /> Profiel aanmaken</>}
                    </button>
                )}
            </div>
        );
    }

    // Heeft profiel — toon voertuigen
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)" }}>
                        Mijn voertuigen
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                        Alleen zichtbaar voor jou en beheerders
                    </p>
                </div>
                {magToevoegen && !toonFormulier && (
                    <button
                        onClick={() => setToonFormulier(true)}
                        className="btn btn-primary btn-sm"
                        style={{ minHeight: "40px", gap: "var(--space-1)" }}
                    >
                        <IconPlus /> Voertuig toevoegen
                    </button>
                )}
            </div>

            {/* Formulier */}
            {toonFormulier && (
                <div className="card" style={{ padding: "var(--space-4)" }}>
                    <div style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)", marginBottom: "var(--space-3)" }}>
                        Nieuw voertuig toevoegen
                    </div>
                    <VoertuigToevoegenFormulier
                        klantId={klantProfiel._id}
                        onGedaan={() => setToonFormulier(false)}
                    />
                </div>
            )}

            {/* Voertuigen lijst */}
            {mijnVoertuigen === undefined ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {[...Array(2)].map((_, i) => (
                        <div key={i} style={{ height: "96px", background: "var(--skeleton-base)", borderRadius: "var(--radius-md)", animation: "pulse 1.5s ease infinite" }} />
                    ))}
                </div>
            ) : mijnVoertuigen.length === 0 ? (
                <div className="card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
                        Nog geen voertuigen gekoppeld.
                    </div>
                    {magToevoegen && !toonFormulier && (
                        <button
                            onClick={() => setToonFormulier(true)}
                            className="btn btn-ghost btn-sm"
                            style={{ marginTop: "var(--space-3)", gap: "var(--space-1)" }}
                        >
                            <IconPlus /> Voertuig toevoegen
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    {mijnVoertuigen.map(v => (
                        <VoertuigMiniKaart key={v._id} voertuig={v} onOpenDossier={onOpenDossier} />
                    ))}
                </div>
            )}
        </div>
    );
}
