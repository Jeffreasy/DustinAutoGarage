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
import ModalShell from "./ModalShell";
import { analyticsKlantNieuw } from "../../lib/analytics";

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
            analyticsKlantNieuw(form.klanttype);
            onSluit();
        } catch (err) {
            // Strip interne Convex prefix-codes voor nettere user-facing melding
            setFout(err instanceof Error ? err.message.replace(/^(INVALID|CONFLICT|FORBIDDEN): /, "") : "Onbekende fout");
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
            <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
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
        <ModalShell onSluit={onSluit} ariaLabel="Nieuwe klant toevoegen" maxWidth="560px">
            {/* Header */}
            <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    Nieuwe Klant Intake
                </h2>
                <button onClick={onSluit} className="btn btn-ghost btn-sm" style={{ minHeight: "44px", minWidth: "44px", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Modal sluiten">
                    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)", overflowY: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-4)" }}>
                    {veld("Voornaam", "voornaam", "text", true)}
                    {veld("Achternaam", "achternaam", "text", true)}
                </div>
                {veld("E-mailadres", "emailadres", "email", true)}
                {veld("Telefoonnummer", "telefoonnummer", "tel", true)}
                {veld("Straat + huisnummer", "adres", "text", true)}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "var(--space-4)" }}>
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

                <button type="submit" disabled={bezig} className="btn btn-primary" style={{ minHeight: "52px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}>
                    {bezig ? "Aanmaken…" : (
                        <>
                            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                            Klant registreren
                        </>
                    )}
                </button>
            </form>
        </ModalShell>
    );
}
