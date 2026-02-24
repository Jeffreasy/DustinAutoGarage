/**
 * src/components/modals/VoertuigBewerkModal.tsx
 *
 * Modal voor het bewerken van een bestaand voertuig.
 *
 * Gebruikt door:
 *   - BalieVoertuigenView  (✏️ knop op elke voertuigkaart)
 *   - EigenaarVoertuigenView (via BalieVoertuigenView)
 *
 * Vereisten: binnen een LaventeConvexProvider-tree (voor useMutation).
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import ModalShell from "./ModalShell";

// ---------------------------------------------------------------------------
// Types & constanten
// ---------------------------------------------------------------------------

const BRANDSTOF_OPTIES = ["Benzine", "Diesel", "EV", "Hybride", "LPG"] as const;
type Brandstof = typeof BRANDSTOF_OPTIES[number];

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "var(--space-2) var(--space-3)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    color: "var(--color-heading)",
    fontSize: "var(--text-sm)",
    minHeight: "44px",
    boxSizing: "border-box",
};

// ---------------------------------------------------------------------------
// VoertuigBewerkModal
// ---------------------------------------------------------------------------

interface VoertuigBewerkModalProps {
    voertuig: Doc<"voertuigen">;
    onSluit: () => void;
}

export default function VoertuigBewerkModal({ voertuig, onSluit }: VoertuigBewerkModalProps) {
    const updateVoertuig = useMutation(api.voertuigen.update);

    const [form, setForm] = useState({
        kenteken: voertuig.kenteken,
        merk: voertuig.merk,
        model: voertuig.model,
        bouwjaar: String(voertuig.bouwjaar),
        brandstof: voertuig.brandstof as Brandstof,
        kilometerstand: voertuig.kilometerstand ? String(voertuig.kilometerstand) : "",
        apkVervaldatum: voertuig.apkVervaldatum
            ? new Date(voertuig.apkVervaldatum).toISOString().split("T")[0]
            : "",
        voertuigNotities: voertuig.voertuigNotities ?? "",
        vin: voertuig.vin ?? "",
        meldcode: voertuig.meldcode ?? "",
    });

    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState<string | null>(null);

    async function handleOpslaan(e: React.FormEvent) {
        e.preventDefault();
        setBezig(true);
        setFout(null);
        try {
            await updateVoertuig({
                voertuigId: voertuig._id,
                kenteken: form.kenteken.toUpperCase().replace(/\s/g, "-"),
                merk: form.merk,
                model: form.model,
                bouwjaar: Number(form.bouwjaar),
                brandstof: form.brandstof,
                kilometerstand: form.kilometerstand ? Number(form.kilometerstand) : undefined,
                apkVervaldatum: form.apkVervaldatum
                    ? new Date(form.apkVervaldatum).getTime()
                    : undefined,
                voertuigNotities: form.voertuigNotities || undefined,
                vin: form.vin || undefined,
                meldcode: form.meldcode || undefined,
            });
            onSluit();
        } catch (err) {
            setFout(err instanceof Error ? err.message : "Onbekende fout");
        } finally {
            setBezig(false);
        }
    }

    const veld = (label: string, key: keyof typeof form, type = "text", required = false) => (
        <div>
            <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                {label}{required && <span style={{ color: "var(--color-error)" }}> *</span>}
            </label>
            <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                required={required}
                style={inputStyle}
            />
        </div>
    );

    return (
        <ModalShell onSluit={onSluit} ariaLabel={`Voertuig bewerken — ${voertuig.kenteken}`} maxWidth="560px">
            {/* Header */}
            <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)" }}>
                        ✏️ Voertuig bewerken
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}>
                        {voertuig.kenteken} — {voertuig.merk} {voertuig.model}
                    </p>
                </div>
                <button onClick={onSluit} className="btn btn-ghost btn-sm" style={{ minHeight: "40px" }} aria-label="Modal sluiten">✕</button>
            </div>

            {/* Form */}
            <form onSubmit={handleOpslaan} style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)", overflowY: "auto" }}>
                {/* Kenteken */}
                <div>
                    <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                        Kenteken <span style={{ color: "var(--color-error)" }}>*</span>
                    </label>
                    <input
                        type="text"
                        value={form.kenteken}
                        onChange={(e) => setForm((f) => ({ ...f, kenteken: e.target.value }))}
                        required
                        style={{ ...inputStyle, fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
                    />
                </div>

                {/* Merk + Model */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                    {veld("Merk", "merk", "text", true)}
                    {veld("Model", "model", "text", true)}
                </div>

                {/* Bouwjaar + Brandstof */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                    {veld("Bouwjaar", "bouwjaar", "number", true)}
                    <div>
                        <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                            Brandstof <span style={{ color: "var(--color-error)" }}>*</span>
                        </label>
                        <select
                            value={form.brandstof}
                            onChange={(e) => setForm((f) => ({ ...f, brandstof: e.target.value as Brandstof }))}
                            style={{ ...inputStyle, cursor: "pointer" }}
                            required
                        >
                            {BRANDSTOF_OPTIES.map((b) => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Kilometerstand + APK */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                    {veld("Kilometerstand", "kilometerstand", "number")}
                    {veld("APK vervaldatum", "apkVervaldatum", "date")}
                </div>

                {/* VIN + Meldcode */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                    {veld("VIN (17 tekens)", "vin")}
                    {veld("Meldcode (laatste 4 VIN)", "meldcode")}
                </div>

                {/* Notities */}
                <div>
                    <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                        Notities
                    </label>
                    <textarea
                        value={form.voertuigNotities}
                        onChange={(e) => setForm((f) => ({ ...f, voertuigNotities: e.target.value }))}
                        placeholder="bijv. Distributieriem vervangen bij 120k km"
                        rows={2}
                        style={{ ...inputStyle, resize: "vertical", minHeight: "72px" }}
                    />
                </div>

                {fout && <div className="alert alert-error" role="alert">{fout}</div>}

                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                    <button type="button" onClick={onSluit} className="btn btn-ghost" style={{ flex: 1, minHeight: "52px" }}>
                        Annuleren
                    </button>
                    <button type="submit" disabled={bezig} className="btn btn-primary" style={{ flex: 2, minHeight: "52px" }}>
                        {bezig ? "Opslaan…" : "💾 Wijzigingen opslaan"}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
