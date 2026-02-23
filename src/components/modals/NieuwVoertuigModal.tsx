/**
 * src/components/modals/NieuwVoertuigModal.tsx
 *
 * Gedeelde modal — nieuw voertuig aanmaken.
 * Gebruikt door:
 *   - VoertuigenDashboard (dashboard snelactie)
 *   - BalieVoertuigenView (volledige voertuigen-pagina)
 *
 * Vereisten: binnen een LaventeConvexProvider-tree (voor useMutation + useQuery).
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useKentekenLookup } from "../../hooks/useKentekenLookup";
import type { KentekenStatus } from "../../hooks/useKentekenLookup";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// NieuwVoertuigModal
// ---------------------------------------------------------------------------

export default function NieuwVoertuigModal({ onSluit }: { onSluit: () => void }) {
    const createVoertuig = useMutation(api.voertuigen.create);
    const [zoekKlant, setZoekKlant] = useState("");
    const [gekozenKlantId, setGekozenKlantId] = useState<Id<"klanten"> | null>(null);
    const [gekozenKlantNaam, setGekozenKlantNaam] = useState("");
    const klantResultaten = useQuery(
        api.klanten.zoek,
        zoekKlant.length >= 2 ? { term: zoekKlant } : "skip",
    );

    const [form, setForm] = useState({
        kenteken: "",
        merk: "",
        model: "",
        bouwjaar: new Date().getFullYear(),
        brandstof: "Benzine" as "Benzine" | "Diesel" | "EV" | "Hybride" | "LPG",
        kilometerstand: "" as string | number,
        apkVervaldatum: "",
        voertuigNotities: "",
    });
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState<string | null>(null);

    // RDW auto-fill
    const rdw = useKentekenLookup(form.kenteken);
    const rdwStatus: KentekenStatus = rdw.status;
    const rdwData = rdw.data;

    useEffect(() => {
        if (rdwStatus !== "ok" || !rdwData) return;
        setForm((f) => ({
            ...f,
            merk: f.merk || rdwData.merk,
            model: f.model || rdwData.model,
            bouwjaar: f.bouwjaar === new Date().getFullYear() ? rdwData.bouwjaar : f.bouwjaar,
            brandstof: rdwData.brandstof,
            apkVervaldatum: f.apkVervaldatum || (rdwData.apkVervaldatum ?? ""),
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rdwStatus, rdwData]);

    function handleRdwLookup() {
        rdw.reset();
        const k = form.kenteken.trim();
        setForm((f) => ({ ...f, kenteken: k + " " }));
        setTimeout(() => setForm((f) => ({ ...f, kenteken: f.kenteken.trim() })), 20);
    }

    async function handleOpslaan(e: React.FormEvent) {
        e.preventDefault();
        if (!gekozenKlantId) { setFout("Kies eerst een klant."); return; }
        setBezig(true);
        setFout(null);
        try {
            await createVoertuig({
                klantId: gekozenKlantId,
                kenteken: form.kenteken.toUpperCase().replace(/\s/g, "-"),
                merk: form.merk,
                model: form.model,
                bouwjaar: Number(form.bouwjaar),
                brandstof: form.brandstof,
                kilometerstand: form.kilometerstand ? Number(form.kilometerstand) : undefined,
                apkVervaldatum: form.apkVervaldatum ? new Date(form.apkVervaldatum).getTime() : undefined,
                voertuigNotities: form.voertuigNotities || undefined,
            });
            onSluit();
        } catch (err) {
            setFout(err instanceof Error ? err.message : "Onbekende fout");
        } finally {
            setBezig(false);
        }
    }

    const field = (label: string, key: keyof typeof form, type = "text", required = false) => (
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

    const rdwBadge = () => {
        if (rdwStatus === "ok") return <span style={{ fontSize: "var(--text-xs)", color: "var(--color-success, #16a34a)", fontWeight: "var(--weight-semibold)" }}>✓ Gevonden</span>;
        if (rdwStatus === "notfound") return <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error, #dc2626)" }}>✗ Niet gevonden</span>;
        if (rdwStatus === "error") return <span style={{ fontSize: "var(--text-xs)", color: "var(--color-warning, #d97706)" }}>⚠ Probeer opnieuw</span>;
        return null;
    };

    return (
        <div
            onClick={onSluit}
            role="dialog"
            aria-modal="true"
            aria-label="Nieuw voertuig toevoegen"
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "var(--space-4)" }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ width: "100%", maxWidth: "560px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-xl)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
            >
                {/* Header */}
                <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)" }}>
                        🚗 Nieuw Voertuig
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
                    onSubmit={handleOpslaan}
                    style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)", overflowY: "auto" }}
                >
                    {/* Stap 1: Klant kiezen */}
                    {!gekozenKlantId ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                            <label style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)" }}>
                                Koppel aan klant <span style={{ color: "var(--color-error)" }}>*</span>
                            </label>
                            <input
                                type="text"
                                value={zoekKlant}
                                onChange={(e) => setZoekKlant(e.target.value)}
                                placeholder="Zoek klant op naam…"
                                style={inputStyle}
                                autoFocus
                                aria-label="Klant zoeken"
                            />
                            {klantResultaten?.map((k) => (
                                <button
                                    key={k._id}
                                    type="button"
                                    onClick={() => { setGekozenKlantId(k._id); setGekozenKlantNaam(`${k.voornaam} ${k.achternaam}`); }}
                                    style={{ textAlign: "left", padding: "var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "var(--color-surface)", cursor: "pointer", minHeight: "48px" }}
                                >
                                    <strong style={{ color: "var(--color-heading)", display: "block", fontSize: "var(--text-sm)" }}>{k.voornaam} {k.achternaam}</strong>
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{k.emailadres}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Gekozen klant chip */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3)", background: "var(--glass-bg-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>
                                    👤 <strong>{gekozenKlantNaam}</strong>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => { setGekozenKlantId(null); setGekozenKlantNaam(""); }}
                                    className="btn btn-ghost btn-sm"
                                    style={{ fontSize: "var(--text-xs)" }}
                                >
                                    Wijzig
                                </button>
                            </div>

                            {/* Kenteken + RDW */}
                            <div>
                                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                                    Kenteken <span style={{ color: "var(--color-error)" }}>*</span>
                                </label>
                                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                                    <input
                                        type="text"
                                        value={form.kenteken}
                                        onChange={(e) => { setForm((f) => ({ ...f, kenteken: e.target.value })); rdw.reset(); }}
                                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleRdwLookup())}
                                        placeholder="GH-446-V"
                                        required
                                        style={{ ...inputStyle, flex: 1, fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
                                        aria-label="Kenteken"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRdwLookup}
                                        disabled={rdwStatus === "loading" || !form.kenteken.trim()}
                                        className="btn btn-secondary"
                                        style={{ minHeight: "44px", whiteSpace: "nowrap", flexShrink: 0 }}
                                        aria-label="Kenteken opzoeken via RDW"
                                    >
                                        {rdwStatus === "loading" ? "⏳" : "🔍 Ophalen"}
                                    </button>
                                </div>
                                {rdwBadge() && <div style={{ marginTop: "var(--space-1)" }}>{rdwBadge()}</div>}

                                {/* RDW signalen */}
                                {rdwStatus === "ok" && rdwData && (
                                    <div style={{ marginTop: "var(--space-2)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                                        {rdwData.wok && (
                                            <div role="alert" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(220,38,38,0.1)", border: "1px solid var(--color-error, #dc2626)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", color: "var(--color-error, #dc2626)", fontWeight: "var(--weight-semibold)" }}>
                                                🚫 WOK — Wacht op keuren: dit voertuig mag de openbare weg niet op
                                            </div>
                                        )}
                                        {rdwData.heeftRecall && (
                                            <div role="alert" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(217,119,6,0.1)", border: "1px solid var(--color-warning, #d97706)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", color: "var(--color-warning, #d97706)", fontWeight: "var(--weight-semibold)" }}>
                                                ⚠️ Openstaande terugroepactie (Recall)
                                            </div>
                                        )}
                                        {rdwData.nap === "Onlogisch" && (
                                            <div role="alert" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(217,119,6,0.1)", border: "1px solid var(--color-warning, #d97706)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", color: "var(--color-warning, #d97706)", fontWeight: "var(--weight-semibold)" }}>
                                                🔢 Onlogische kilometerstand (NAP: verdacht)
                                            </div>
                                        )}
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                                            {rdwData.kleur && <span style={{ padding: "var(--space-1) var(--space-2)", background: "var(--glass-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-body)" }}>🎨 {rdwData.kleur}</span>}
                                            {rdwData.inrichting && <span style={{ padding: "var(--space-1) var(--space-2)", background: "var(--glass-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-body)" }}>🚗 {rdwData.inrichting}</span>}
                                            {rdwData.cilinderinhoud ? <span style={{ padding: "var(--space-1) var(--space-2)", background: "var(--glass-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-body)" }}>⚙️ {rdwData.cilinderinhoud} cc</span> : null}
                                            {rdwData.vermogen ? <span style={{ padding: "var(--space-1) var(--space-2)", background: "var(--glass-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-body)" }}>⚡ {rdwData.vermogen} kW</span> : null}
                                            {rdwData.emissieklasse && <span style={{ padding: "var(--space-1) var(--space-2)", background: "var(--glass-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-body)" }}>🌿 {rdwData.emissieklasse}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Voertuig velden */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                                {field("Bouwjaar", "bouwjaar", "number", true)}
                                {field("Merk", "merk", "text", true)}
                                {field("Model", "model", "text", true)}
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                                    Brandstof <span style={{ color: "var(--color-error)" }}>*</span>
                                </label>
                                <select
                                    value={form.brandstof}
                                    onChange={(e) => setForm((f) => ({ ...f, brandstof: e.target.value as typeof form.brandstof }))}
                                    style={{ ...inputStyle, cursor: "pointer" }}
                                >
                                    {["Benzine", "Diesel", "EV", "Hybride", "LPG"].map((b) => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                                {field("Kilometerstand", "kilometerstand", "number")}
                                {field("APK vervaldatum", "apkVervaldatum", "date")}
                                {field("Notities", "voertuigNotities")}
                            </div>
                        </>
                    )}

                    {fout && <div className="alert alert-error" role="alert">{fout}</div>}

                    {gekozenKlantId && (
                        <button type="submit" disabled={bezig} className="btn btn-primary" style={{ minHeight: "52px" }}>
                            {bezig ? "Aanmaken…" : "🚗 Voertuig registreren"}
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}
