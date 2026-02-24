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
        if (!km || km < 0) {
            setFout("Voer een geldige kilometerstand in.");
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
            });
            onSluit();
        } catch (e) {
            setFout(e instanceof Error ? e.message : "Onbekende fout");
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
                    <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", margin: 0 }}>
                        ✅ Werkorder afsluiten
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}>
                        {kenteken}
                    </p>
                </div>
                <button onClick={onSluit} className="btn btn-ghost btn-sm" aria-label="Annuleren" style={{ minHeight: "44px", minWidth: "44px" }}>
                    ✕
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
                        value={kmStand}
                        onChange={(e) => setKmStand(e.target.value)}
                        placeholder="bijv. 87420"
                        min={0}
                        style={inputStyle}
                        autoFocus
                    />
                </div>

                {/* Totaal kosten */}
                <div>
                    <label htmlFor="totaal-kosten-input" style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", marginBottom: "var(--space-2)" }}>
                        Totaalbedrag (€) <span style={{ color: "var(--color-muted)", fontWeight: "normal" }}>(excl. BTW, optioneel)</span>
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
                    <div role="alert" style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "var(--color-error-bg, #fef2f2)", border: "1px solid var(--color-error-border, #fecaca)", color: "var(--color-error, #dc2626)", fontSize: "var(--text-sm)" }}>
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
                            background: bezig || !kmStand ? undefined : "linear-gradient(135deg, #16a34a, #15803d)",
                        }}
                        aria-label="Werkorder definitief afsluiten"
                    >
                        {bezig ? "Afsluiten…" : "✅ Auto klaar — Doorsturen"}
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}
