/**
 * src/components/onderhoud/MijnVoertuigenTab.tsx
 *
 * Persoonlijke voertuigen voor medewerkers — volledig feature-complete:
 *   1. Profiel aanmaken (eerste keer)
 *   2. Nieuw voertuig toevoegen
 *   3. Bestaand voertuig zoeken + koppelen aan eigen profiel
 *   4. Onderhoudsbeurt registreren (NieuweBeurtModal)
 *   5. Dossier openen in Voertuigdossier tab
 *
 * Security: elke rol ziet eigen voertuigen; stagiair is read-only.
 */

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useMijnKlantProfiel, useRegistreerMedewerkerAlsKlant, useVoertuigHistorie } from "../../hooks/useOnderhoud";
import { SOORT_CONFIG } from "./utils";
import NieuweBeurtModal from "../modals/NieuweBeurtModal";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconCar() {
    return (
        <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="var(--color-border)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block", margin: "0 auto var(--space-3)" }}>
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
function IconCheck() {
    return (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}
function IconSearch() {
    return (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}
function IconWrench() {
    return (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
    );
}
function IconLink() {
    return (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    );
}
function IconWarning() {
    return (
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }}>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}
function IconX() {
    return (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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

const skeletonStyle: React.CSSProperties = {
    background: "var(--skeleton-base)",
    borderRadius: "var(--radius-md)",
    animation: "pulse 1.5s ease infinite",
};

// ---------------------------------------------------------------------------
// Voertuig mini-dossier kaart — met "Beurt toevoegen" & "Dossier" acties
// ---------------------------------------------------------------------------

function VoertuigMiniKaart({
    voertuig,
    onOpenDossier,
    magBeurtToevoegen,
}: {
    voertuig: Doc<"voertuigen">;
    onOpenDossier: (v: Doc<"voertuigen">) => void;
    magBeurtToevoegen: boolean;
}) {
    const historie = useVoertuigHistorie(voertuig._id);
    const totaal = historie?.length ?? 0;
    const laatsTeBeurt = historie && historie.length > 0
        ? [...historie].sort((a, b) => b.datumUitgevoerd - a.datumUitgevoerd)[0]
        : null;
    const [toonBeurtModal, setToonBeurtModal] = useState(false);

    // APK status
    const apkStatus = voertuig.apkVervaldatum
        ? voertuig.apkVervaldatum < Date.now()
            ? "verlopen"
            : voertuig.apkVervaldatum < Date.now() + 30 * 24 * 60 * 60 * 1000
                ? "binnenkort"
                : "geldig"
        : null;

    return (
        <>
            <div className="card" style={{ borderLeft: `3px solid ${apkStatus === "verlopen" ? "var(--color-error, #ef4444)" : apkStatus === "binnenkort" ? "var(--color-warning, #f59e0b)" : "var(--color-accent)"}`, overflow: "hidden" }}>
                {/* Kenteken + info rij — klikbaar → dossier */}
                <button
                    onClick={() => onOpenDossier(voertuig)}
                    className="voertuig-kaart-btn"
                    style={{
                        all: "unset",
                        display: "flex", alignItems: "center",
                        gap: "var(--space-4)", padding: "var(--space-4)",
                        width: "100%", boxSizing: "border-box",
                        cursor: "pointer", flexWrap: "wrap",
                        touchAction: "manipulation",
                        // focus-visible ring — hersteld na all:unset
                        outline: "2px solid transparent",
                        outlineOffset: "2px",
                    }}
                    onFocus={e => { e.currentTarget.style.outline = "2px solid var(--color-accent)"; }}
                    onBlur={e => { e.currentTarget.style.outline = "2px solid transparent"; }}
                    aria-label={`Open dossier – ${voertuig.kenteken} ${voertuig.merk} ${voertuig.model}`}
                >
                    {/* Kenteken */}
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
                    <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                        <div style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>
                            {voertuig.merk} {voertuig.model}
                        </div>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginTop: "2px" }}>
                            {voertuig.bouwjaar} · {voertuig.brandstof}
                            {voertuig.kilometerstand !== undefined && ` · ${voertuig.kilometerstand.toLocaleString("nl-NL")} km`}
                        </div>
                        {apkStatus === "verlopen" && voertuig.apkVervaldatum !== undefined && (
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-error, #ef4444)", marginTop: "2px", fontWeight: "var(--weight-medium)" }}>
                                <IconWarning /> APK verlopen — {new Date(voertuig.apkVervaldatum).toLocaleDateString("nl-NL")}
                            </div>
                        )}
                        {apkStatus === "binnenkort" && voertuig.apkVervaldatum !== undefined && (
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-warning, #f59e0b)", marginTop: "2px", fontWeight: "var(--weight-medium)" }}>
                                <IconWarning /> APK verloopt binnenkort — {new Date(voertuig.apkVervaldatum).toLocaleDateString("nl-NL")}
                            </div>
                        )}
                    </div>

                    {/* Beurten teller */}
                    <div style={{ textAlign: "center", flexShrink: 0 }}>
                        <div style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", fontVariantNumeric: "tabular-nums" }}>
                            {historie === undefined ? "—" : totaal}
                        </div>
                        <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted)", fontWeight: "600" }}>beurten</div>
                    </div>

                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-accent-text)", fontWeight: "var(--weight-semibold)", flexShrink: 0 }}>
                        dossier →
                    </span>
                </button>

                {/* Actiebalk */}
                <div style={{
                    borderTop: "1px solid var(--color-border)",
                    padding: "var(--space-2) var(--space-4)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: "var(--space-3)", flexWrap: "wrap",
                }}>
                    {/* Laatste beurt info */}
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                        {laatsTeBeurt ? (
                            <>
                                <SoortSvg type={laatsTeBeurt.typeWerk} />
                                <span>
                                    <strong style={{ color: "var(--color-body)" }}>{laatsTeBeurt.typeWerk}</strong>
                                    {" · "}
                                    {new Date(laatsTeBeurt.datumUitgevoerd).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                            </>
                        ) : (
                            <span>Nog geen onderhoud geregistreerd</span>
                        )}
                    </div>

                    {/* Onderhoud toevoegen actie */}
                    {magBeurtToevoegen && (
                        <button
                            onClick={() => setToonBeurtModal(true)}
                            className="btn btn-ghost btn-sm"
                            style={{ gap: "var(--space-1)", minHeight: "32px", touchAction: "manipulation", fontSize: "var(--text-xs)" }}
                            aria-label={`Onderhoudsbeurt toevoegen voor ${voertuig.kenteken}`}
                        >
                            <IconWrench /> Beurt toevoegen
                        </button>
                    )}
                </div>
            </div>

            {/* NieuweBeurtModal */}
            {toonBeurtModal && (
                <NieuweBeurtModal
                    voertuig={voertuig}
                    onSluit={() => setToonBeurtModal(false)}
                />
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// BestaandVoertuigKoppelen — zoek op kenteken + koppel aan eigen profiel
// ---------------------------------------------------------------------------

function BestaandVoertuigKoppelen({
    klantId,
    onGekoppeld,
}: {
    klantId: string;
    onGekoppeld: () => void;
}) {
    const [zoekterm, setZoekterm] = useState("");
    const [bezig, setBezig] = useState(false);
    const [succes, setSucces] = useState<string | null>(null);
    const [fout, setFout] = useState<string | null>(null);
    const koppel = useMutation(api.voertuigen.koppelAanMijnProfiel);
    const zoekResultaten = useQuery(
        api.voertuigen.zoekOpKenteken,
        zoekterm.length >= 2 ? { term: zoekterm } : "skip"
    );

    async function handleKoppel(voertuigId: string, kenteken: string) {
        setBezig(true);
        setFout(null);
        try {
            await koppel({ voertuigId: voertuigId as never, klantId: klantId as never });
            setSucces(kenteken);
            setTimeout(() => { onGekoppeld(); }, 1500);
        } catch (err) {
            setFout(err instanceof Error ? err.message.replace(/^(CONFLICT|FORBIDDEN|INVALID): /, "") : "Onbekende fout.");
        } finally {
            setBezig(false);
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {/* Zoekbalk met zichtbaar label */}
            <div>
                <label htmlFor="koppel-zoek" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)", display: "block", marginBottom: "var(--space-1)" }}>
                    Zoek op kenteken
                </label>
                <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: "var(--space-3)", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", pointerEvents: "none" }}>
                        <IconSearch />
                    </div>
                    <input
                        id="koppel-zoek"
                        className="input"
                        style={{ minHeight: "44px", width: "100%", boxSizing: "border-box", paddingLeft: "var(--space-8)" }}
                        value={zoekterm}
                        onChange={e => { setZoekterm(e.target.value); setFout(null); setSucces(null); }}
                        placeholder="bijv. AB-123-C…"
                        autoComplete="off"
                        spellCheck={false}
                    />
                </div>
            </div>

            {/* Fout */}
            {fout && (
                <div role="alert" style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-error-bg)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
                    {fout}
                </div>
            )}

            {/* Succes */}
            {succes && (
                <div role="status" style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-success-bg, #d1fae5)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-success, #059669)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <IconCheck /> {succes} gekoppeld aan je profiel!
                </div>
            )}

            {/* Resultaten */}
            {zoekterm.length >= 2 && zoekResultaten !== undefined && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {zoekResultaten.length === 0 ? (
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", padding: "var(--space-3)", textAlign: "center" }}>
                            Geen voertuigen gevonden voor "{zoekterm}".
                        </div>
                    ) : (
                        zoekResultaten.map(v => (
                            <div key={v._id} style={{
                                display: "flex", alignItems: "center", gap: "var(--space-3)",
                                padding: "var(--space-3)", background: "var(--color-surface-2)",
                                borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
                                flexWrap: "wrap",
                            }}>
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--weight-bold)", fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wider)", color: "var(--color-heading)", flexShrink: 0 }}>
                                    {v.kenteken}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: "var(--text-sm)", color: "var(--color-heading)", fontWeight: "var(--weight-medium)" }}>
                                        {v.merk} {v.model}
                                    </div>
                                    <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                        {v.bouwjaar} · {v.brandstof}
                                        {v.klantId ? " · al aan klant gekoppeld" : " · ongebonden"}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleKoppel(v._id, v.kenteken)}
                                    disabled={bezig || !!v.klantId}
                                    className="btn btn-primary btn-sm"
                                    style={{ minHeight: "36px", gap: "var(--space-1)", touchAction: "manipulation", flexShrink: 0 }}
                                    aria-label={v.klantId
                                        ? `${v.kenteken} is al gekoppeld aan een andere klant`
                                        : `${v.kenteken} koppelen aan mijn profiel`
                                    }
                                    aria-disabled={!!v.klantId}
                                >
                                    <IconLink /> {v.klantId ? "Al gekoppeld" : "Koppelen"}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Loading */}
            {zoekterm.length >= 2 && zoekResultaten === undefined && (
                <div style={{ ...skeletonStyle, height: "64px" }} />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// VoertuigToevoegenFormulier — nieuw voertuig + success state
// ---------------------------------------------------------------------------

function isGeldigKenteken(raw: string): boolean {
    const n = raw.toUpperCase().replace(/[-\s]/g, "");
    return n.length >= 5 && n.length <= 8 && /^[A-Z0-9]+$/.test(n);
}

function VoertuigToevoegenFormulier({ klantId, onGedaan }: { klantId: string; onGedaan: () => void }) {
    const maakVoertuig = useMutation(api.voertuigen.create);
    const [bezig, setBezig] = useState(false);
    const [succes, setSucces] = useState(false);
    const [fout, setFout] = useState<string | null>(null);
    const [kenteken, setKenteken] = useState("");
    const [kentekenFout, setKentekenFout] = useState<string | null>(null);
    const [merk, setMerk] = useState("");
    const [model, setModel] = useState("");
    const [bouwjaar, setBouwjaar] = useState("");
    const [brandstof, setBrandstof] = useState("Benzine");
    const kentekenRef = useRef<HTMLInputElement>(null);

    function valKenteken() {
        if (!kenteken.trim()) setKentekenFout("Kenteken is verplicht.");
        else if (!isGeldigKenteken(kenteken)) setKentekenFout("Ongeldig formaat (bijv. AB-123-C).");
        else setKentekenFout(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!isGeldigKenteken(kenteken)) { setKentekenFout("Ongeldig kenteken."); kentekenRef.current?.focus(); return; }
        if (!merk.trim() || !model.trim() || !bouwjaar) return;
        setBezig(true); setFout(null);
        try {
            await maakVoertuig({ klantId: klantId as never, kenteken: kenteken.trim().toUpperCase().replace(/[-\s]/g, ""), merk: merk.trim(), model: model.trim(), bouwjaar: parseInt(bouwjaar, 10), brandstof: brandstof as never });
            setSucces(true);
            setTimeout(() => onGedaan(), 1500);
        } catch (err) {
            setFout(err instanceof Error ? err.message.replace(/^(CONFLICT|INVALID): /, "") : "Onbekende fout.");
        } finally { setBezig(false); }
    }

    const inp: React.CSSProperties = { minHeight: "44px", width: "100%", boxSizing: "border-box" };

    if (succes) {
        return (
            <div style={{ padding: "var(--space-6)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--color-success-bg, #d1fae5)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-success, #059669)" }}>
                    <IconCheck />
                </div>
                <div style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>Voertuig toegevoegd!</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{kenteken.toUpperCase()} is gekoppeld aan je profiel.</div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }} noValidate>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
                <div>
                    <label htmlFor="mvt-kenteken" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: kentekenFout ? "var(--color-error)" : "var(--color-muted)", display: "block", marginBottom: "var(--space-1)" }}>Kenteken *</label>
                    <input ref={kentekenRef} id="mvt-kenteken" className="input" style={{ ...inp, borderColor: kentekenFout ? "var(--color-error)" : undefined }} value={kenteken} onChange={e => { setKenteken(e.target.value); if (kentekenFout) setKentekenFout(null); }} onBlur={valKenteken} placeholder="AB-123-C…" autoComplete="off" spellCheck={false} aria-describedby={kentekenFout ? "mvt-k-err" : undefined} aria-invalid={kentekenFout ? true : undefined} />
                    {kentekenFout && <div id="mvt-k-err" role="alert" style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", marginTop: "var(--space-1)" }}>{kentekenFout}</div>}
                </div>
                <div>
                    <label htmlFor="mvt-merk" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)", display: "block", marginBottom: "var(--space-1)" }}>Merk *</label>
                    <input id="mvt-merk" className="input" style={inp} value={merk} onChange={e => setMerk(e.target.value)} placeholder="Volkswagen…" required autoComplete="off" />
                </div>
                <div>
                    <label htmlFor="mvt-model" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)", display: "block", marginBottom: "var(--space-1)" }}>Model *</label>
                    <input id="mvt-model" className="input" style={inp} value={model} onChange={e => setModel(e.target.value)} placeholder="Golf…" required autoComplete="off" />
                </div>
                <div>
                    <label htmlFor="mvt-bouwjaar" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)", display: "block", marginBottom: "var(--space-1)" }}>Bouwjaar *</label>
                    <input id="mvt-bouwjaar" className="input" type="number" inputMode="numeric" style={inp} value={bouwjaar} onChange={e => setBouwjaar(e.target.value)} placeholder="2020…" min={1900} max={new Date().getFullYear() + 1} required autoComplete="off" />
                </div>
                <div>
                    <label htmlFor="mvt-brandstof" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-muted)", display: "block", marginBottom: "var(--space-1)" }}>Brandstof *</label>
                    <select id="mvt-brandstof" className="input" style={inp} value={brandstof} onChange={e => setBrandstof(e.target.value)}>
                        {["Benzine", "Diesel", "Elektrisch", "Hybride", "LPG", "Waterstof", "Overig"].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
            </div>
            {fout && <div role="alert" style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-error-bg)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>{fout}</div>}
            <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
                <button type="button" onClick={onGedaan} className="btn btn-ghost" style={{ minHeight: "44px", touchAction: "manipulation" }} disabled={bezig}>Annuleren</button>
                <button type="submit" className="btn btn-primary" style={{ minHeight: "44px", gap: "var(--space-1)", touchAction: "manipulation" }} disabled={bezig}>
                    {bezig ? "Toevoegen…" : <><IconPlus /> Voertuig toevoegen</>}
                </button>
            </div>
        </form>
    );
}

// ---------------------------------------------------------------------------
// MijnVoertuigenTab — hoofdcomponent
// ---------------------------------------------------------------------------

type ToevoegModus = "nieuw" | "koppelen" | null;

interface MijnVoertuigenTabProps {
    onOpenDossier: (v: Doc<"voertuigen">) => void;
    domeinRol: "eigenaar" | "balie" | "monteur" | "stagiair";
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
    const [fout, setFout] = useState<string | null>(null);
    const [modus, setModus] = useState<ToevoegModus>(null);

    const magToevoegen = domeinRol !== "stagiair";

    async function handleRegistreer() {
        setBezig(true); setFout(null);
        try {
            const delen = naam.trim().split(" ");
            await registreer({ voornaam: delen[0] ?? naam, achternaam: delen.slice(1).join(" ") || "—" });
        } catch (err) {
            setFout(err instanceof Error ? err.message : "Onbekende fout.");
        } finally { setBezig(false); }
    }

    // Loading
    if (klantProfiel === undefined) {
        return <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>{[...Array(2)].map((_, i) => <div key={i} style={{ ...skeletonStyle, height: "96px" }} />)}</div>;
    }

    // Onboarding — geen profiel
    if (klantProfiel === null) {
        return (
            <div className="card" style={{ padding: "var(--space-10)", textAlign: "center" }}>
                <IconCar />
                <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)" }}>Nog geen persoonlijk voertuigprofiel</h3>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", margin: "0 0 var(--space-5)", maxWidth: "360px", marginInline: "auto" }}>
                    Registreer je persoonlijke voertuigen zodat je ze terugvindt in het dossier. Alleen zichtbaar voor jou en beheerders.
                </p>
                {fout && <div role="alert" style={{ marginBottom: "var(--space-3)", padding: "var(--space-2) var(--space-3)", background: "var(--color-error-bg)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-error)", maxWidth: "360px", marginInline: "auto" }}>{fout}</div>}
                {magToevoegen ? (
                    <button onClick={handleRegistreer} disabled={bezig} className="btn btn-primary" style={{ minHeight: "48px", gap: "var(--space-2)", touchAction: "manipulation" }}>
                        {bezig ? "Bezig…" : <><IconPlus /> Profiel aanmaken</>}
                    </button>
                ) : (
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: 0 }}>Vraag een beheerder om een voertuigprofiel aan te maken.</p>
                )}
            </div>
        );
    }

    // Hoofdview
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {/* Header + acties */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)" }}>Mijn voertuigen</h3>
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>Alleen zichtbaar voor jou en beheerders</p>
                </div>
                {magToevoegen && modus === null && (
                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <button onClick={() => setModus("koppelen")} className="btn btn-ghost btn-sm" style={{ minHeight: "40px", gap: "var(--space-1)", touchAction: "manipulation" }}>
                            <IconLink /> Bestaand koppelen
                        </button>
                        <button onClick={() => setModus("nieuw")} className="btn btn-primary btn-sm" style={{ minHeight: "40px", gap: "var(--space-1)", touchAction: "manipulation" }}>
                            <IconPlus /> Nieuw voertuig
                        </button>
                    </div>
                )}
            </div>

            {/* Modus: nieuw voertuig */}
            {modus === "nieuw" && (
                <div className="card" style={{ padding: "var(--space-4)" }}>
                    <div style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)", marginBottom: "var(--space-3)" }}>Nieuw voertuig registreren</div>
                    <VoertuigToevoegenFormulier klantId={klantProfiel._id} onGedaan={() => setModus(null)} />
                </div>
            )}

            {/* Modus: bestaand koppelen */}
            {modus === "koppelen" && (
                <div className="card" style={{ padding: "var(--space-4)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                        <div style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>Bestaand voertuig koppelen</div>
                        <button onClick={() => setModus(null)} className="btn btn-ghost btn-sm" style={{ touchAction: "manipulation", minWidth: "36px", minHeight: "36px" }} aria-label="Sluiten">
                            <IconX />
                        </button>
                    </div>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: "0 0 var(--space-3)" }}>
                        Zoek een voertuig dat al in het systeem staat en koppel het aan je profiel.
                        Voertuigen die al aan een klant gekoppeld zijn kunnen niet worden overgekoppeld.
                    </p>
                    <BestaandVoertuigKoppelen klantId={klantProfiel._id} onGekoppeld={() => setModus(null)} />
                </div>
            )}

            {/* Voertuigenlijst */}
            {mijnVoertuigen === undefined ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {[...Array(2)].map((_, i) => <div key={i} style={{ ...skeletonStyle, height: "96px" }} />)}
                </div>
            ) : mijnVoertuigen.length === 0 ? (
                <div className="card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", marginBottom: magToevoegen ? "var(--space-3)" : 0 }}>
                        Nog geen voertuigen gekoppeld aan je profiel.
                    </div>
                    {magToevoegen && modus === null && (
                        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "center", flexWrap: "wrap" }}>
                            <button onClick={() => setModus("koppelen")} className="btn btn-ghost btn-sm" style={{ gap: "var(--space-1)", touchAction: "manipulation" }}><IconLink /> Bestaand koppelen</button>
                            <button onClick={() => setModus("nieuw")} className="btn btn-primary btn-sm" style={{ gap: "var(--space-1)", touchAction: "manipulation" }}><IconPlus /> Nieuw voertuig</button>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    {mijnVoertuigen.map(v => (
                        <VoertuigMiniKaart
                            key={v._id}
                            voertuig={v}
                            onOpenDossier={onOpenDossier}
                            magBeurtToevoegen={magToevoegen}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
