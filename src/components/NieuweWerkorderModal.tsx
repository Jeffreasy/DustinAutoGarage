/**
 * src/components/NieuweWerkorderModal.tsx
 *
 * Formulier om een nieuwe werkorder aan te maken.
 *
 * Flow:
 *   1. Typ klant naam (live zoek via klanten.zoek)
 *   2. Selecteer klant → voertuigen van die klant worden geladen
 *   3. Selecteer voertuig → klacht + datum invullen
 *   4. Opslaan → maakWerkorderAan() → kaartje verschijnt in "Wachtend"
 *
 * Touch-vriendelijk: grote inputs (48px min-height), duidelijke stappen.
 */

import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import {
    useZoekKlanten,
    useVoertuigenVanKlant,
    useMaakWerkorderAan,
} from "../hooks/useWerkplaats";

interface NieuweWerkorderModalProps {
    onSluit: () => void;
}

export default function NieuweWerkorderModal({ onSluit }: NieuweWerkorderModalProps) {
    const [stap, setStap] = useState<1 | 2 | 3>(1);
    const [zoekterm, setZoekterm] = useState("");
    const [gekozenKlantId, setGekozenKlantId] = useState<Id<"klanten"> | null>(null);
    const [gekozenKlantNaam, setGekozenKlantNaam] = useState("");
    const [gekozenVoertuigId, setGekozenVoertuigId] = useState<Id<"voertuigen"> | null>(null);
    const [klacht, setKlacht] = useState("");
    const [afspraakDatum, setAfspraakDatum] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState<string | null>(null);

    const klantResultaten = useZoekKlanten(zoekterm);
    const voertuigen = useVoertuigenVanKlant(gekozenKlantId);
    const maakWerkorderAan = useMaakWerkorderAan();

    async function handleOpslaan() {
        if (!gekozenVoertuigId || !gekozenKlantId || !klacht.trim()) return;

        setBezig(true);
        setFout(null);
        try {
            await maakWerkorderAan({
                voertuigId: gekozenVoertuigId,
                klantId: gekozenKlantId,
                klacht: klacht.trim(),
                afspraakDatum: new Date(afspraakDatum).getTime(),
            });
            onSluit();
        } catch (e) {
            setFout(e instanceof Error ? e.message : "Onbekende fout");
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
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Nieuwe werkorder aanmaken"
            onClick={onSluit}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: "var(--space-4)",
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "100%",
                    maxWidth: "520px",
                    background: "var(--glass-bg-strong, var(--color-surface))",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-xl)",
                    boxShadow: "var(--shadow-xl, 0 20px 60px rgba(0,0,0,0.4))",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    maxHeight: "90vh",
                }}
            >
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
                    <button onClick={onSluit} className="btn btn-ghost btn-sm" aria-label="Sluiten" style={{ minHeight: "44px", minWidth: "44px" }}>
                        ✕
                    </button>
                </div>

                {/* Stappen indicator */}
                <div style={{ display: "flex", padding: "var(--space-4) var(--space-5) 0", gap: "var(--space-2)" }}>
                    {([1, 2, 3] as const).map((s) => (
                        <div key={s} style={{
                            flex: 1,
                            height: "3px",
                            borderRadius: "var(--radius-full, 9999px)",
                            background: s <= stap ? "var(--color-primary, #0d7a5f)" : "var(--color-border)",
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
                                            }}
                                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--glass-bg)"; }}
                                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface)"; }}
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
                        </div>
                    )}

                    {/* ── STAP 2: Voertuig kiezen ──────────────────────────── */}
                    {stap === 2 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                            <div style={{ background: "var(--gradient-accent-subtle)", border: "1px solid var(--color-border-luminous)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)" }}>
                                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>
                                    👤 <strong>{gekozenKlantNaam}</strong>
                                </p>
                            </div>

                            <div>
                                <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", margin: "0 0 var(--space-2)" }}>
                                    Selecteer voertuig
                                </p>
                                {voertuigen === undefined && <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Laden…</p>}
                                {voertuigen?.length === 0 && (
                                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>
                                        Deze klant heeft geen geregistreerde voertuigen.
                                    </p>
                                )}
                                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                                    {voertuigen?.map((v) => (
                                        <button
                                            key={v._id}
                                            onClick={() => {
                                                setGekozenVoertuigId(v._id);
                                                setStap(3);
                                            }}
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
                                            }}
                                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--glass-bg)"; }}
                                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface)"; }}
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
                                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>
                                    👤 <strong>{gekozenKlantNaam}</strong>
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
                            {bezig ? "Aanmaken…" : "✅ Werkorder aanmaken"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
