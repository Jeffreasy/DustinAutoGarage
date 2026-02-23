/**
 * src/components/modals/NieuweKlantModal.tsx
 *
 * Gedeelde modal — nieuwe klant aanmaken.
 * Gebruikt door:
 *   - VoertuigenDashboard (dashboard snelactie)
 *   - BalieKlantenView (volledige klanten-pagina)
 *
 * Vereisten: binnen een LaventeConvexProvider-tree (voor useMutation).
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

// ---------------------------------------------------------------------------
// Types & constanten
// ---------------------------------------------------------------------------

const LEGE_KLANT: {
    klanttype: "Particulier" | "Zakelijk";
    voornaam: string;
    achternaam: string;
    bedrijfsnaam: string;
    adres: string;
    postcode: string;
    woonplaats: string;
    telefoonnummer: string;
    emailadres: string;
    accepteertMarketing: boolean;
    status: "Actief" | "Inactief" | "Prospect";
    klantNotities: string;
} = {
    klanttype: "Particulier",
    voornaam: "", achternaam: "", bedrijfsnaam: "",
    adres: "", postcode: "", woonplaats: "",
    telefoonnummer: "", emailadres: "",
    accepteertMarketing: true,
    status: "Actief",
    klantNotities: "",
};

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
// NieuweKlantModal
// ---------------------------------------------------------------------------

export default function NieuweKlantModal({ onSluit }: { onSluit: () => void }) {
    const createKlant = useMutation(api.klanten.create);
    const [form, setForm] = useState(LEGE_KLANT);
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setBezig(true);
        setFout(null);
        try {
            await createKlant({
                ...form,
                bedrijfsnaam: form.bedrijfsnaam || undefined,
                klantNotities: form.klantNotities || undefined,
            });
            onSluit();
        } catch (err) {
            setFout(err instanceof Error ? err.message : "Onbekende fout");
        } finally {
            setBezig(false);
        }
    }

    const veld = (
        label: string,
        key: keyof typeof LEGE_KLANT,
        type = "text",
        required = false,
    ) => (
        <div>
            <label
                style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}
            >
                {label}{required && <span style={{ color: "var(--color-error)" }}> *</span>}
            </label>
            <input
                type={type}
                value={form[key] as string}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                required={required}
                style={inputStyle}
            />
        </div>
    );

    return (
        <div
            onClick={onSluit}
            role="dialog"
            aria-modal="true"
            aria-label="Nieuwe klant toevoegen"
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "var(--space-4)" }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ width: "100%", maxWidth: "560px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-xl)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
            >
                {/* Header */}
                <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)" }}>
                        👤 Nieuwe Klant Intake
                    </h2>
                    <button
                        onClick={onSluit}
                        className="btn btn-ghost btn-sm"
                        style={{ minHeight: "40px" }}
                        aria-label="Modal sluiten"
                    >
                        ✕
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)", overflowY: "auto" }}
                >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                        {veld("Voornaam", "voornaam", "text", true)}
                        {veld("Achternaam", "achternaam", "text", true)}
                    </div>
                    {veld("E-mailadres", "emailadres", "email", true)}
                    {veld("Telefoonnummer", "telefoonnummer", "tel", true)}
                    {veld("Straat + huisnummer", "adres", "text", true)}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "var(--space-4)" }}>
                        {veld("Postcode", "postcode", "text", true)}
                        {veld("Woonplaats", "woonplaats", "text", true)}
                    </div>

                    {/* Type klant */}
                    <div>
                        <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                            Type klant
                        </label>
                        <select
                            value={form.klanttype}
                            onChange={(e) => setForm((f) => ({ ...f, klanttype: e.target.value as "Particulier" | "Zakelijk" }))}
                            style={{ ...inputStyle, cursor: "pointer" }}
                        >
                            <option value="Particulier">Particulier</option>
                            <option value="Zakelijk">Zakelijk</option>
                        </select>
                    </div>

                    {form.klanttype === "Zakelijk" && veld("Bedrijfsnaam", "bedrijfsnaam")}

                    {/* AVG */}
                    <label style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            checked={form.accepteertMarketing}
                            onChange={(e) => setForm((f) => ({ ...f, accepteertMarketing: e.target.checked }))}
                            style={{ width: "18px", height: "18px", accentColor: "var(--color-accent)" }}
                        />
                        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>
                            Accepteert marketing (APK-herinneringen, acties)
                        </span>
                    </label>

                    {fout && <div className="alert alert-error" role="alert">{fout}</div>}

                    <button type="submit" disabled={bezig} className="btn btn-primary" style={{ minHeight: "52px" }}>
                        {bezig ? "Aanmaken…" : "✅ Klant registreren"}
                    </button>
                </form>
            </div>
        </div>
    );
}
