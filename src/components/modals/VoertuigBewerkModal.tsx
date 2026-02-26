/**
 * src/components/modals/VoertuigBewerkModal.tsx
 *
 * Modal voor het bewerken van een bestaand voertuig.
 * Inclusief "RDW vernieuwen" knop die live RDW-data ophaalt
 * en technische specs (voertuigsoort, kleuren, gewichten, etc.) up-to-date houdt.
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import ModalShell from "./ModalShell";
import { useKentekenLookup } from "../../hooks/useKentekenLookup";
import { apiFetch, ApiError } from "../../lib/api";
import type { RDWVoertuigInfo } from "../../hooks/useKentekenLookup";

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

    // ── RDW refresh state ──────────────────────────────────────────────────
    const [rdwBezig, setRdwBezig] = useState(false);
    const [rdwFout, setRdwFout] = useState<string | null>(null);
    const [rdwData, setRdwData] = useState<RDWVoertuigInfo | null>(null);
    const [rdwGeladen, setRdwGeladen] = useState(false);

    async function handleRdwVernieuwen() {
        setRdwBezig(true);
        setRdwFout(null);
        setRdwData(null);
        try {
            const norm = voertuig.kenteken.replace(/[\s-]/g, "").toUpperCase();
            const data = await apiFetch<RDWVoertuigInfo>(`/api/rdw/${norm}`);
            setRdwData(data);
            setRdwGeladen(true);
            // Auto-fill basisvelden
            setForm((f) => ({
                ...f,
                merk: data.merk || f.merk,
                model: data.model || f.model,
                bouwjaar: data.bouwjaar ? String(data.bouwjaar) : f.bouwjaar,
                brandstof: data.brandstof || f.brandstof,
                apkVervaldatum: data.apkVervaldatum || f.apkVervaldatum,
            }));
        } catch (err) {
            setRdwFout(err instanceof ApiError ? err.message : "RDW lookup mislukt — probeer opnieuw.");
        } finally {
            setRdwBezig(false);
        }
    }

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
                // ── RDW-verrijking (alleen opgeslagen als vers opgehaald) ──────
                ...(rdwData ? {
                    voertuigsoort: rdwData.voertuigsoort,
                    kleur: rdwData.kleur,
                    tweedeKleur: rdwData.tweedeKleur,
                    massaRijklaar: rdwData.massaRijklaar,
                    maxTrekgewichtOngeremd: rdwData.maxTrekgewichtOngeremd,
                    maxTrekgewichtGeremd: rdwData.maxTrekgewichtGeremd,
                    aantalZitplaatsen: rdwData.aantalZitplaatsen,
                    eersteTenaamstelling: rdwData.eersteTenaamstelling,
                    co2Uitstoot: rdwData.co2Uitstoot,
                } : {}),
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

            {/* RDW refresh banner */}
            <div style={{
                padding: "var(--space-3) var(--space-5)",
                borderBottom: "1px solid var(--color-border)",
                background: rdwGeladen ? "var(--color-success-bg)" : "var(--glass-bg-subtle)",
                display: "flex", alignItems: "center", gap: "var(--space-3)",
            }}>
                <div style={{ flex: 1 }}>
                    {rdwGeladen ? (
                        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-success)", fontWeight: "var(--weight-semibold)" }}>
                            ✅ RDW-data geladen — basisvelden bijgewerkt. Sla op om technische specs te bewaren.
                        </p>
                    ) : (
                        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                            Haal de meest actuele RDW-gegevens op voor dit voertuig.
                        </p>
                    )}
                    {rdwFout && (
                        <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
                            ⚠️ {rdwFout}
                        </p>
                    )}
                    {rdwGeladen && rdwData && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)", marginTop: "var(--space-2)" }}>
                            {rdwData.voertuigsoort && <span style={{ padding: "1px 6px", background: "var(--color-accent-dim)", border: "1px solid var(--color-accent)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-accent-text, var(--color-heading))" }}>{rdwData.voertuigsoort}</span>}
                            {rdwData.kleur && <span style={{ padding: "1px 6px", background: "var(--glass-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>🎨 {rdwData.kleur}{rdwData.tweedeKleur ? ` / ${rdwData.tweedeKleur}` : ""}</span>}
                            {rdwData.massaRijklaar && <span style={{ padding: "1px 6px", background: "var(--glass-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>⚖️ {rdwData.massaRijklaar} kg</span>}
                            {rdwData.aantalZitplaatsen && <span style={{ padding: "1px 6px", background: "var(--glass-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>💺 {rdwData.aantalZitplaatsen} zitpl.</span>}
                            {rdwData.co2Uitstoot && <span style={{ padding: "1px 6px", background: "var(--glass-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>🌿 {rdwData.co2Uitstoot} g/km</span>}
                            {rdwData.wok && <span style={{ padding: "1px 6px", background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-error)", fontWeight: "var(--weight-semibold)" }}>⚠️ WOK</span>}
                            {rdwData.heeftRecall && <span style={{ padding: "1px 6px", background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-warning)", fontWeight: "var(--weight-semibold)" }}>📢 Recall</span>}
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleRdwVernieuwen}
                    disabled={rdwBezig}
                    className="btn btn-secondary btn-sm"
                    style={{ whiteSpace: "nowrap", flexShrink: 0, minHeight: "40px" }}
                    aria-label="RDW-gegevens vernieuwen"
                >
                    {rdwBezig ? "Ophalen…" : "🔄 RDW vernieuwen"}
                </button>
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
