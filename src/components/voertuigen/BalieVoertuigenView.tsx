/**
 * src/components/voertuigen/BalieVoertuigenView.tsx
 *
 * Balie / Receptie weergave: volledig CRUD voor het wagenpark.
 *
 * Functionaliteiten:
 *   - Zoekbalk + Scanner slot
 *   - [+ Nieuw Voertuig] knop met formulier (klant-koppeling via zoek)
 *   - Voertuigkaarten — klikbaar voor detail/bewerken
 *   - APK-waarschuwingen bovenaan (30 dagen)
 *   - Km-stand bijwerken inline
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useVoertuigenLijst, useApkWaarschuwingen } from "../../hooks/useVoertuigen";
import ScannerSlot from "./scanner/ScannerSlot";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function apkKleur(ms: number | undefined) {
    if (!ms) return "var(--color-muted)";
    const nu = Date.now();
    if (ms < nu) return "var(--color-error, #dc2626)";
    if (ms < nu + 30 * 86400000) return "var(--color-warning, #d97706)";
    return "var(--color-success, #16a34a)";
}

const inputStyle = {
    width: "100%", padding: "var(--space-2) var(--space-3)",
    borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
    background: "var(--color-surface)", color: "var(--color-heading)",
    fontSize: "var(--text-sm)", minHeight: "44px", boxSizing: "border-box" as const,
};

// ---------------------------------------------------------------------------
// Nieuw Voertuig Modal
// ---------------------------------------------------------------------------

function NieuwVoertuigModal({ onSluit }: { onSluit: () => void }) {
    const createVoertuig = useMutation(api.voertuigen.create);
    const [zoekKlant, setZoekKlant] = useState("");
    const [gekozenKlantId, setGekozenKlantId] = useState<Id<"klanten"> | null>(null);
    const [gekozenKlantNaam, setGekozenKlantNaam] = useState("");
    const klantResultaten = useQuery(api.klanten.zoek, zoekKlant.length >= 2 ? { term: zoekKlant } : "skip");

    const [form, setForm] = useState({
        kenteken: "", merk: "", model: "", bouwjaar: new Date().getFullYear(),
        brandstof: "Benzine" as "Benzine" | "Diesel" | "EV" | "Hybride" | "LPG",
        kilometerstand: "" as string | number,
        apkVervaldatum: "",
        voertuigNotities: "",
    });
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState<string | null>(null);

    async function handleOpslaan(e: React.FormEvent) {
        e.preventDefault();
        if (!gekozenKlantId) { setFout("Kies eerst een klant."); return; }
        setBezig(true); setFout(null);
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

    return (
        <div onClick={onSluit} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "var(--space-4)" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "560px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-xl)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)" }}>+ Nieuw Voertuig</h2>
                    <button onClick={onSluit} className="btn btn-ghost btn-sm" style={{ minHeight: "40px" }}>✕</button>
                </div>

                <form onSubmit={handleOpslaan} style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)", overflowY: "auto" }}>
                    {/* Stap 1: Klant kiezen */}
                    {!gekozenKlantId ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                            <label style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)" }}>
                                Koppel aan klant <span style={{ color: "var(--color-error)" }}>*</span>
                            </label>
                            <input
                                type="text" value={zoekKlant}
                                onChange={(e) => setZoekKlant(e.target.value)}
                                placeholder="Zoek klant op naam…" style={inputStyle} autoFocus
                            />
                            {klantResultaten?.map((k) => (
                                <button key={k._id} type="button" onClick={() => { setGekozenKlantId(k._id); setGekozenKlantNaam(`${k.voornaam} ${k.achternaam}`); }}
                                    style={{ textAlign: "left", padding: "var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "var(--color-surface)", cursor: "pointer", minHeight: "48px" }}>
                                    <strong style={{ color: "var(--color-heading)", display: "block", fontSize: "var(--text-sm)" }}>{k.voornaam} {k.achternaam}</strong>
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{k.emailadres}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3)", background: "var(--glass-bg-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>👤 <strong>{gekozenKlantNaam}</strong></span>
                                <button type="button" onClick={() => { setGekozenKlantId(null); setGekozenKlantNaam(""); }} className="btn btn-ghost btn-sm" style={{ fontSize: "var(--text-xs)" }}>Wijzig</button>
                            </div>

                            {/* Voertuig data */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                                {field("Kenteken", "kenteken", "text", true)}
                                {field("Bouwjaar", "bouwjaar", "number", true)}
                                {field("Merk", "merk", "text", true)}
                                {field("Model", "model", "text", true)}
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                                    Brandstof <span style={{ color: "var(--color-error)" }}>*</span>
                                </label>
                                <select value={form.brandstof} onChange={(e) => setForm((f) => ({ ...f, brandstof: e.target.value as typeof form.brandstof }))} style={{ ...inputStyle, cursor: "pointer" }}>
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

// ---------------------------------------------------------------------------
// Voertuigkaart (balie versie — met bewerken)
// ---------------------------------------------------------------------------

function VoertuigKaartBalie({ voertuig, onBewerk }: { voertuig: Doc<"voertuigen">; onBewerk: () => void }) {
    const updateKm = useMutation(api.voertuigen.updateKilometerstand);
    const [km, setKm] = useState(String(voertuig.kilometerstand ?? ""));
    const [bezig, setBezig] = useState(false);

    async function handleKmUpdate() {
        if (!km || Number(km) === voertuig.kilometerstand) return;
        setBezig(true);
        try { await updateKm({ voertuigId: voertuig._id, nieuweKilometerstand: Number(km) }); }
        finally { setBezig(false); }
    }

    return (
        <div className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-2)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 900, fontSize: "var(--text-xl)", color: "var(--color-heading)", letterSpacing: "0.06em" }}>
                    {voertuig.kenteken}
                </span>
                <button onClick={onBewerk} className="btn btn-ghost btn-sm" style={{ minHeight: "36px" }} aria-label={`Bewerk ${voertuig.kenteken}`}>
                    ✏️
                </button>
            </div>

            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-body)", margin: 0 }}>
                {voertuig.merk} {voertuig.model} · {voertuig.bouwjaar} · {voertuig.brandstof}
            </p>

            <p style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: apkKleur(voertuig.apkVervaldatum), margin: 0 }}>
                {voertuig.apkVervaldatum
                    ? `APK: ${new Date(voertuig.apkVervaldatum).toLocaleDateString("nl-NL")}`
                    : "APK onbekend"}
            </p>

            {/* Km inline update */}
            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                <input
                    type="number"
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    placeholder="km-stand"
                    aria-label="Kilometerstand bijwerken"
                    style={{ ...inputStyle, minHeight: "36px", fontSize: "var(--text-xs)", flex: 1 }}
                    onBlur={handleKmUpdate}
                    onKeyDown={(e) => e.key === "Enter" && handleKmUpdate()}
                />
                {bezig && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>…</span>}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// BalieVoertuigenView — hoofd-export
// ---------------------------------------------------------------------------

export default function BalieVoertuigenView() {
    const [zoek, setZoek] = useState("");
    const [toonNieuw, setToonNieuw] = useState(false);

    const voertuigen = useVoertuigenLijst();
    const apkWaarschuwingen = useApkWaarschuwingen(30);

    const gefilterd = (voertuigen ?? []).filter((v) => {
        if (zoek.length < 2) return true;
        const t = zoek.toLowerCase();
        return v.kenteken.toLowerCase().includes(t) || v.merk.toLowerCase().includes(t) || v.model.toLowerCase().includes(t);
    });

    const verlopen = (apkWaarschuwingen ?? []).filter((v) => v.apkVervaldatum && v.apkVervaldatum < Date.now());
    const bijnaVerlopen = (apkWaarschuwingen ?? []).filter((v) => v.apkVervaldatum && v.apkVervaldatum >= Date.now());

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* APK-waarschuwingen */}
            {verlopen.length > 0 && (
                <div className="alert alert-error" role="alert">
                    ⚠️ <strong>{verlopen.length} voertuig{verlopen.length > 1 ? "en" : ""} met verlopen APK:</strong>
                    {" "}{verlopen.map((v) => v.kenteken).join(" · ")}
                </div>
            )}
            {bijnaVerlopen.length > 0 && (
                <div className="alert alert-warning" role="alert">
                    ⏰ <strong>{bijnaVerlopen.length} voertuig{bijnaVerlopen.length > 1 ? "en" : ""} met APK binnen 30 dagen:</strong>
                    {" "}{bijnaVerlopen.map((v) => v.kenteken).join(" · ")}
                </div>
            )}

            {/* Actiebalk */}
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => setToonNieuw(true)} className="btn btn-primary" style={{ minHeight: "48px" }}>
                    + Nieuw Voertuig
                </button>
                <div style={{ flex: 1, maxWidth: "320px" }}>
                    <input
                        type="search" value={zoek} onChange={(e) => setZoek(e.target.value)}
                        placeholder="Zoek op kenteken of merk…"
                        className="input" style={{ minHeight: "48px" }}
                        aria-label="Voertuigen zoeken"
                    />
                </div>
                <ScannerSlot onKenteken={(k) => setZoek(k)} label="Scan Kenteken" />
            </div>

            {/* Teller */}
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: 0 }}>{gefilterd.length} voertuig(en)</p>

            {/* Grid */}
            {voertuigen === undefined ? (
                <p style={{ color: "var(--color-muted)" }}>⏳ Laden…</p>
            ) : (
                <div style={{ display: "grid", gap: "var(--space-3)", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                    {gefilterd.map((v) => (
                        <VoertuigKaartBalie key={v._id} voertuig={v} onBewerk={() => { /* TODO: bewerk panel */ }} />
                    ))}
                    {gefilterd.length === 0 && (
                        <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                            <span className="empty-state-icon">🚗</span>
                            <p className="empty-state-title">Geen voertuigen gevonden</p>
                        </div>
                    )}
                </div>
            )}

            {toonNieuw && <NieuwVoertuigModal onSluit={() => setToonNieuw(false)} />}
        </div>
    );
}
