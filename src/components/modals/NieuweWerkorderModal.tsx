/**
 * src/components/NieuweWerkorderModal.tsx
 *
 * Formulier om een nieuwe werkorder aan te maken.
 *
 * Flow:
 *   1. Typ klant naam (live zoek via klanten.zoek)
 *   2. Selecteer klant → voertuigen van die klant worden geladen
 *   3. Selecteer voertuig → klacht + datum invullen
 *   4. Opslaan → maakWerkorderAan() → kaartje verschijnt in "Gepland"
 *
 * Touch-vriendelijk: grote inputs (48px min-height), duidelijke stappen.
 */

import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import {
    useZoekKlanten,
    useVoertuigenVanKlant,
    useMaakWerkorderAan,
} from "../../hooks/useWerkplaats";
import { useVoertuigenLijst } from "../../hooks/useVoertuigen";
import ModalShell from "./ModalShell";
import { analyticsWerkorderAangemaakt } from "../../lib/analytics";

interface NieuweWerkorderModalProps {
    onSluit: () => void;
    /** Pre-selecteer klant en ga direct naar stap 2 (voor gebruik vanuit klantprofiel) */
    preFill?: { klantId: Id<"klanten">; klantNaam: string };
}

export default function NieuweWerkorderModal({ onSluit, preFill }: NieuweWerkorderModalProps) {
    const [stap, setStap] = useState<1 | 2 | 3>(preFill ? 2 : 1);
    const [zoekterm, setZoekterm] = useState("");
    const [gekozenKlantId, setGekozenKlantId] = useState<Id<"klanten"> | null>(preFill?.klantId ?? null);
    const [gekozenKlantNaam, setGekozenKlantNaam] = useState(preFill?.klantNaam ?? "");
    const [slaKlantOver, setSlaKlantOver] = useState(false);
    const [gekozenVoertuigId, setGekozenVoertuigId] = useState<Id<"voertuigen"> | null>(null);
    const [klacht, setKlacht] = useState("");
    const [afspraakDatum, setAfspraakDatum] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState<string | null>(null);

    const klantResultaten = useZoekKlanten(zoekterm);
    const voertuigen = useVoertuigenVanKlant(gekozenKlantId);
    // Walk-in: alle voertuigen ophalen voor kenteken-filter
    const alleVoertuigen = useVoertuigenLijst();
    const [walkInZoek, setWalkInZoek] = useState("");
    const maakWerkorderAan = useMaakWerkorderAan();

    async function handleOpslaan() {
        if (!gekozenVoertuigId || !klacht.trim()) return;

        setBezig(true);
        setFout(null);
        try {
            await maakWerkorderAan({
                voertuigId: gekozenVoertuigId,
                ...(gekozenKlantId ? { klantId: gekozenKlantId } : {}),
                klacht: klacht.trim(),
                // Parse als lokale datum — new Date("YYYY-MM-DD") is UTC midnight,
                // wat in NL (CET +1) de vorige dag oplevert. Lokale Date voorkomt dit.
                afspraakDatum: (() => {
                    const [jaar, maand, dag] = afspraakDatum.split("-").map(Number);
                    return new Date(jaar, maand - 1, dag, 8, 0, 0).getTime();
                })(),
            });
            analyticsWerkorderAangemaakt();
            onSluit();
        } catch (e) {
            setFout(e instanceof Error ? e.message.replace(/^(INVALID|CONFLICT|FORBIDDEN): /, "") : "Onbekende fout");
        } finally {
            setBezig(false);
        }
    }

    const inputStyle = {
        width: "100%",
        padding: "var(--space-3) var(--space-4)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        color: "var(--color-body)",
        fontSize: "var(--text-sm)",
        minHeight: "48px",
        boxSizing: "border-box" as const,
    };

    return (
        <ModalShell onSluit={onSluit} ariaLabel="Nieuwe werkorder aanmaken" maxWidth="520px">
            {/* Touch-friendly hover via CSS class — geen inline onMouseEnter die falen op touch */}
            <style>{`.klant-optie-btn:hover,.klant-optie-btn:focus-visible,.voertuig-optie-btn:hover,.voertuig-optie-btn:focus-visible{ background: var(--glass-bg) !important; outline: 2px solid var(--color-accent); outline-offset: -2px; }`}</style>
            {/* Header */}
            <div style={{
                padding: "var(--space-4) var(--space-5)",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}>
                <div>
                    <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", margin: 0 }}>
                        + Nieuwe Werkorder
                    </h2>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: "2px 0 0" }}>
                        Stap {stap} van 3
                    </p>
                </div>
                <button onClick={onSluit} className="btn btn-ghost btn-sm" aria-label="Sluiten" style={{ minHeight: "44px", minWidth: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
            </div>

            {/* Stappen indicator */}
            <div style={{ display: "flex", padding: "var(--space-4) var(--space-5) 0", gap: "var(--space-2)" }}>
                {([1, 2, 3] as const).map((s) => (
                    <div key={s} style={{
                        flex: 1,
                        height: "3px",
                        borderRadius: "var(--radius-full, 9999px)",
                        background: s <= stap ? "var(--color-primary)" : "var(--color-border)",
                        transition: "background var(--transition-base)",
                    }} />
                ))}
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-5)" }}>

                {/* ── STAP 1: Klant kiezen ─────────────────────────────── */}
                {stap === 1 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                        <div>
                            <label htmlFor="klant-zoek" style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", marginBottom: "var(--space-2)" }}>
                                Zoek klant op naam of e-mail
                            </label>
                            <input
                                id="klant-zoek"
                                type="text"
                                value={zoekterm}
                                onChange={(e) => setZoekterm(e.target.value)}
                                placeholder="Bijv. Janssen of info@garage.nl"
                                style={inputStyle}
                                autoFocus
                            />
                        </div>

                        {zoekterm.length >= 2 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                                {klantResultaten === undefined && (
                                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Zoeken…</p>
                                )}
                                {klantResultaten?.length === 0 && (
                                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Geen klanten gevonden voor "{zoekterm}".</p>
                                )}
                                {klantResultaten?.map((klant) => (
                                    <button
                                        key={klant._id}
                                        onClick={() => {
                                            setGekozenKlantId(klant._id);
                                            setGekozenKlantNaam(`${klant.voornaam} ${klant.achternaam}`);
                                            setStap(2);
                                        }}
                                        className="klant-optie-btn"
                                        style={{
                                            textAlign: "left",
                                            padding: "var(--space-3) var(--space-4)",
                                            borderRadius: "var(--radius-md)",
                                            border: "1px solid var(--color-border)",
                                            background: "var(--color-surface)",
                                            cursor: "pointer",
                                            minHeight: "52px",
                                            color: "var(--color-body)",
                                            transition: "background var(--transition-base)",
                                            width: "100%",
                                        }}
                                    >
                                        <strong style={{ color: "var(--color-heading)", display: "block", fontSize: "var(--text-sm)" }}>
                                            {klant.voornaam} {klant.achternaam}
                                        </strong>
                                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                            {klant.emailadres} · {klant.telefoonnummer}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Overslaan-knop: werkorder zonder klant */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "var(--space-2)" }}>
                            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>Walk-in / geen klant?</p>
                            <button
                                type="button"
                                onClick={() => { setSlaKlantOver(true); setStap(2); }}
                                style={{
                                    fontSize: "var(--text-xs)", color: "var(--color-accent-text)",
                                    background: "none", border: "none", cursor: "pointer",
                                    textDecoration: "underline", textDecorationStyle: "dotted",
                                    minHeight: "44px", padding: "0 var(--space-2)",
                                }}
                            >
                                Overslaan, geen klant →
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STAP 2: Voertuig kiezen ──────────────────────────── */}
                {stap === 2 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                        {/* Klant-badge: toon alleen als klant gekozen, anders walk-in badge */}
                        {gekozenKlantNaam ? (
                            <div style={{ background: "var(--gradient-accent-subtle)", border: "1px solid var(--color-border-luminous)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--color-accent-text)", flexShrink: 0 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-heading)" }}><strong>{gekozenKlantNaam}</strong></p>
                            </div>
                        ) : (
                            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--color-muted)", flexShrink: 0 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="23" y1="11" x2="23" y2="17" /><line x1="20" y1="14" x2="26" y2="14" /></svg>
                                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-muted)", fontStyle: "italic" }}>Walk-in — geen klant gekoppeld</p>
                            </div>
                        )}

                        <div>
                            <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", margin: "0 0 var(--space-2)" }}>
                                Selecteer voertuig
                            </p>
                            {/* Met klant: voertuigen van die klant */}
                            {!slaKlantOver && (
                                <>
                                    {voertuigen === undefined && <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Laden…</p>}
                                    {voertuigen?.length === 0 && (
                                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>
                                            Deze klant heeft geen geregistreerde voertuigen.
                                        </p>
                                    )}
                                </>
                            )}
                            {/* Walk-in: zoek over alle voertuigen */}
                            {slaKlantOver && (
                                <input
                                    type="search"
                                    value={walkInZoek}
                                    onChange={(e) => setWalkInZoek(e.target.value)}
                                    placeholder="Zoek op kenteken, merk of model…"
                                    style={{ ...inputStyle, marginBottom: "var(--space-2)" }}
                                    autoFocus
                                    aria-label="Voertuig zoeken"
                                />
                            )}
                            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                                {/* Voertuigenlijst: klant-gebonden OF walk-in gefilterd */}
                                {(slaKlantOver
                                    ? (alleVoertuigen ?? []).filter((v) => {
                                        if (walkInZoek.length < 2) return true;
                                        const t = walkInZoek.toLowerCase();
                                        return v.kenteken.toLowerCase().includes(t) || v.merk.toLowerCase().includes(t) || v.model.toLowerCase().includes(t);
                                    })
                                    : (voertuigen ?? [])
                                ).map((v) => (
                                    <button
                                        key={v._id}
                                        onClick={() => {
                                            setGekozenVoertuigId(v._id);
                                            setStap(3);
                                        }}
                                        className="voertuig-optie-btn"
                                        style={{
                                            textAlign: "left",
                                            padding: "var(--space-3) var(--space-4)",
                                            borderRadius: "var(--radius-md)",
                                            border: "1px solid var(--color-border)",
                                            background: "var(--color-surface)",
                                            cursor: "pointer",
                                            minHeight: "56px",
                                            color: "var(--color-body)",
                                            transition: "background var(--transition-base)",
                                            width: "100%",
                                        }}
                                    >
                                        <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-heading)", fontSize: "var(--text-base)", display: "block" }}>
                                            {v.kenteken}
                                        </strong>
                                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                            {v.merk} {v.model} · {v.bouwjaar} · {v.brandstof}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={() => setStap(1)} className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}>
                            ← Andere klant kiezen
                        </button>
                    </div>
                )}

                {/* ── STAP 3: Klacht + datum ───────────────────────────── */}
                {stap === 3 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                        <div style={{ background: "var(--gradient-accent-subtle)", border: "1px solid var(--color-border-luminous)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)" }}>
                            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-heading)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                <strong>{gekozenKlantNaam}</strong>
                            </p>
                            <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                Voertuig geselecteerd ✓
                            </p>
                        </div>

                        <div>
                            <label htmlFor="klacht-input" style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", marginBottom: "var(--space-2)" }}>
                                Klacht / taakomschrijving <span style={{ color: "var(--color-error)" }}>*</span>
                            </label>
                            <textarea
                                id="klacht-input"
                                value={klacht}
                                onChange={(e) => setKlacht(e.target.value)}
                                placeholder="Bijv. Rammelt linksvoor · Grote Beurt + APK"
                                rows={3}
                                style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
                                autoFocus
                            />
                        </div>

                        <div>
                            <label htmlFor="datum-input" style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", marginBottom: "var(--space-2)" }}>
                                Afspraakdatum
                            </label>
                            <input
                                id="datum-input"
                                type="date"
                                value={afspraakDatum}
                                onChange={(e) => setAfspraakDatum(e.target.value)}
                                style={inputStyle}
                            />
                        </div>

                        {fout && (
                            <div role="alert" style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)", color: "var(--color-error)", fontSize: "var(--text-sm)" }}>
                                {fout}
                            </div>
                        )}

                        <button onClick={() => setStap(2)} className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}>
                            ← Ander voertuig kiezen
                        </button>
                    </div>
                )}
            </div>

            {/* Footer — alleen in stap 3 */}
            {stap === 3 && (
                <div style={{ padding: "var(--space-4) var(--space-5)", borderTop: "1px solid var(--color-border)" }}>
                    <button
                        onClick={handleOpslaan}
                        disabled={bezig || !klacht.trim()}
                        className="btn btn-primary"
                        style={{ width: "100%", minHeight: "52px", fontSize: "var(--text-sm)" }}
                        aria-label="Werkorder opslaan"
                    >
                        {bezig ? "Aanmaken…" : (
                            <>
                                <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                Werkorder aanmaken
                            </>
                        )}
                    </button>
                </div>
            )}
        </ModalShell>
    );
}
