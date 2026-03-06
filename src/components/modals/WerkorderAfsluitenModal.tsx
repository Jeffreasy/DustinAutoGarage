/**
 * src/components/WerkorderAfsluitenModal.tsx
 *
 * Modal voor het definitief afsluiten van een werkorder (balie rol).
 * Vraagt km-stand + type werk → roept sluitWerkorderAf aan.
 * Schrijft resultaat ook naar onderhoudshistorie + updatet km-stand op voertuig.
 */

import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { useSluitWerkorderAf } from "../../hooks/useWerkplaats";
import ModalShell from "./ModalShell";

const TYPE_WERK_OPTIES = [
    "Grote Beurt",
    "Kleine Beurt",
    "APK",
    "Reparatie",
    "Bandenwisseling",
    "Schadeherstel",
    "Diagnostiek",
    "Overig",
] as const;

type TypeWerk = typeof TYPE_WERK_OPTIES[number];

interface WerkorderAfsluitenModalProps {
    werkorderId: Id<"werkorders">;
    kenteken: string;
    klacht: string;
    onSluit: () => void;
}

export default function WerkorderAfsluitenModal({
    werkorderId,
    kenteken,
    klacht,
    onSluit,
}: WerkorderAfsluitenModalProps) {
    const [kmStand, setKmStand] = useState("");
    const [typeWerk, setTypeWerk] = useState<TypeWerk>("Grote Beurt");
    const [slotNotitie, setSlotNotitie] = useState("");
    const [totaalKosten, setTotaalKosten] = useState("");
    const [btwInbegrepen, setBtwInbegrepen] = useState(false);
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState<string | null>(null);

    const sluit = useSluitWerkorderAf();

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

    async function handleAfsluiten() {
        const km = parseInt(kmStand, 10);
        if (!km || km <= 0) {
            setFout("Voer een geldige kilometerstand in (groter dan 0).");
            return;
        }
        setBezig(true);
        setFout(null);
        try {
            await sluit({
                werkorderId,
                kmStandOnderhoud: km,
                typeWerk,
                slotNotitie: slotNotitie.trim() || undefined,
                totaalKosten: totaalKosten ? parseFloat(totaalKosten.replace(",", ".")) : undefined,
                btwInbegrepen: totaalKosten ? btwInbegrepen : undefined,
            });
            onSluit();
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Onbekende fout";
            // Vertaal backend-foutprefixen naar leesbare meldingen
            if (msg.startsWith("INVALID:")) {
                setFout("De kilometerstand klopt niet — controleer de invoer en vergelijk met de huidige stand.");
            } else if (msg.startsWith("CONFLICT:")) {
                setFout("Deze werkorder is al afgesloten of geannuleerd.");
            } else if (msg.startsWith("FORBIDDEN:")) {
                setFout("Je hebt geen rechten om deze werkorder af te sluiten.");
            } else {
                setFout(msg);
            }
        } finally {
            setBezig(false);
        }
    }

    return (
        <ModalShell onSluit={onSluit} ariaLabel="Werkorder afsluiten" maxWidth="460px">
            {/* Header */}
            <div style={{
                padding: "var(--space-4) var(--space-5)",
                borderBottom: "1px solid var(--color-border)",
                background: "linear-gradient(135deg, rgba(34,197,94,0.08), transparent)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}>
                <div>
                    <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--color-success)" }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        Werkorder afsluiten
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}>
                        {kenteken}
                    </p>
                </div>
                <button onClick={onSluit} className="btn btn-ghost btn-sm" aria-label="Annuleren" style={{ minHeight: "44px", minWidth: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
            </div>

            {/* Klacht preview */}
            <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border)" }}>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: "0 0 4px" }}>Klacht</p>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-heading)", fontWeight: "var(--weight-semibold)", margin: 0 }}>
                    {klacht}
                </p>
            </div>

            {/* Form */}
            <div style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

                {/* Type werk */}
                <div>
                    <label htmlFor="type-werk-select" style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", marginBottom: "var(--space-2)" }}>
                        Type uitgevoerd werk
                    </label>
                    <select
                        id="type-werk-select"
                        value={typeWerk}
                        onChange={(e) => setTypeWerk(e.target.value as TypeWerk)}
                        style={{ ...inputStyle, cursor: "pointer" }}
                    >
                        {TYPE_WERK_OPTIES.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>

                {/* Kilometerstand */}
                <div>
                    <label htmlFor="km-stand-input" style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", marginBottom: "var(--space-2)" }}>
                        Kilometerstand bij aflevering <span style={{ color: "var(--color-error)" }}>*</span>
                    </label>
                    <input
                        id="km-stand-input"
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={kmStand}
                        onChange={(e) => setKmStand(e.target.value)}
                        placeholder="bijv. 87420"
                        min={0}
                        style={inputStyle}
                        autoFocus
                    />
                </div>

                {/* Totaal kosten + BTW toggle */}
                <div>
                    <label htmlFor="totaal-kosten-input" style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", marginBottom: "var(--space-2)" }}>
                        Totaalbedrag (€) <span style={{ color: "var(--color-muted)", fontWeight: "normal" }}>(optioneel)</span>
                    </label>
                    <input
                        id="totaal-kosten-input"
                        type="number"
                        value={totaalKosten}
                        onChange={(e) => setTotaalKosten(e.target.value)}
                        placeholder="bijv. 285.00"
                        min={0}
                        step={0.01}
                        style={inputStyle}
                    />
                    {/* BTW toggle — alleen relevant als bedrag is ingevuld */}
                    {totaalKosten && (
                        <label style={{
                            display: "inline-flex", alignItems: "center", gap: "var(--space-2)",
                            marginTop: "var(--space-2)", cursor: "pointer",
                            fontSize: "var(--text-sm)", color: "var(--color-body)",
                        }}>
                            <input
                                type="checkbox"
                                checked={btwInbegrepen}
                                onChange={(e) => setBtwInbegrepen(e.target.checked)}
                                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--color-accent)" }}
                            />
                            BTW inbegrepen
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                {btwInbegrepen ? "(incl. BTW)" : "(excl. BTW)"}
                            </span>
                        </label>
                    )}
                </div>

                {/* Slot notitie */}
                <div>
                    <label htmlFor="slot-notitie-input" style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", marginBottom: "var(--space-2)" }}>
                        Slotnotitie <span style={{ color: "var(--color-muted)", fontWeight: "normal" }}>(optioneel)</span>
                    </label>
                    <textarea
                        id="slot-notitie-input"
                        value={slotNotitie}
                        onChange={(e) => setSlotNotitie(e.target.value)}
                        placeholder="Vervangen onderdelen, aanbevelingen aan klant, etc."
                        rows={2}
                        style={{ ...inputStyle, resize: "vertical", minHeight: "72px" }}
                    />
                </div>

                {fout && (
                    <div role="alert" style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)", color: "var(--color-error)", fontSize: "var(--text-sm)" }}>
                        {fout}
                    </div>
                )}

                {/* Buttons */}
                <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                    <button
                        onClick={onSluit}
                        className="btn btn-ghost"
                        style={{ flex: 1, minHeight: "52px" }}
                    >
                        Annuleren
                    </button>
                    <button
                        onClick={handleAfsluiten}
                        disabled={bezig || !kmStand}
                        className="btn btn-primary"
                        style={{
                            flex: 2,
                            minHeight: "52px",
                            background: bezig || !kmStand ? undefined : "var(--color-success)",
                        }}
                        aria-label="Werkorder definitief afsluiten"
                    >
                        {bezig ? "Afsluiten\u2026" : (
                            <>
                                <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                Auto klaar — Doorsturen
                            </>
                        )}
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}
