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
import ModalShell from "./ModalShell";
import { analyticsVoertuigNieuw, analyticsRDWLookup } from "../../lib/analytics";

// ---------------------------------------------------------------------------
// SVG micro-icons (design system: geen emoji's als UI-iconen)
// ---------------------------------------------------------------------------

function IconCar() {
    return (
        <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2" />
            <circle cx="9" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
        </svg>
    );
}

function IconUser() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function IconSearch() {
    return (
        <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

function IconCheck() {
    return (
        <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function IconX() {
    return (
        <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function IconAlertTriangle() {
    return (
        <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

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

export type NieuwVoertuigPreFill = {
    kenteken?: string;
    merk?: string;
    model?: string;
    bouwjaar?: number;
    brandstof?: string;
    apkVervaldatum?: string;
    // RDW-verrijking
    voertuigsoort?: string;
    kleur?: string;
    tweedeKleur?: string;
    massaRijklaar?: number;
    maxTrekgewichtOngeremd?: number;
    maxTrekgewichtGeremd?: number;
    aantalZitplaatsen?: number;
    eersteTenaamstelling?: string;
    co2Uitstoot?: number;
    // Optionele klant-koppeling vanuit ScanKlantKeuzeModal
    klantId?: Id<"klanten">;
    klantNaam?: string;
};

export default function NieuwVoertuigModal({
    onSluit,
    preFill,
}: {
    onSluit: () => void;
    preFill?: NieuwVoertuigPreFill;
}) {
    const createVoertuig = useMutation(api.voertuigen.create);
    const [zoekKlant, setZoekKlant] = useState("");
    // Als klantId al via preFill meegegeven is, sla klant-stap over
    const [gekozenKlantId, setGekozenKlantId] = useState<Id<"klanten"> | null>(preFill?.klantId ?? null);
    const [gekozenKlantNaam, setGekozenKlantNaam] = useState(preFill?.klantNaam ?? "");
    // Gebruiker kiest expliciet om zonder klant door te gaan
    const [slaKlantOver, setSlaKlantOver] = useState(false);
    const klantResultaten = useQuery(
        api.klanten.zoek,
        zoekKlant.length >= 2 ? { term: zoekKlant } : "skip",
    );

    // klantKeuzeGedaan = preFill aanwezig (scan-flow) OF klant gekozen OF expliciet overgeslagen
    const klantKeuzeGedaan = preFill !== undefined || gekozenKlantId !== null || slaKlantOver;

    const [form, setForm] = useState({
        kenteken: preFill?.kenteken ?? "",
        merk: preFill?.merk ?? "",
        model: preFill?.model ?? "",
        bouwjaar: preFill?.bouwjaar ?? new Date().getFullYear(),
        brandstof: (preFill?.brandstof ?? "Benzine") as "Benzine" | "Diesel" | "EV" | "Hybride" | "LPG",
        kilometerstand: "" as string | number,
        apkVervaldatum: preFill?.apkVervaldatum ?? "",
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
            // Overschrijf alleen lege velden — preFill-data heeft voorrang
            merk: f.merk || rdwData.merk,
            model: f.model || rdwData.model,
            bouwjaar: (f.bouwjaar === (preFill?.bouwjaar ?? new Date().getFullYear())) ? rdwData.bouwjaar : f.bouwjaar,
            brandstof: rdwData.brandstof,
            apkVervaldatum: f.apkVervaldatum || (rdwData.apkVervaldatum ?? ""),
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rdwStatus, rdwData]);

    function handleRdwLookup() {
        rdw.reset();
        analyticsRDWLookup();
        const k = form.kenteken.trim();
        setForm((f) => ({ ...f, kenteken: k + " " }));
        setTimeout(() => setForm((f) => ({ ...f, kenteken: f.kenteken.trim() })), 20);
    }

    async function handleOpslaan(e: React.FormEvent) {
        e.preventDefault();

        // Normaliseer consistent met de backend: uppercase + strip spaties én hyphens.
        const normalKenteken = form.kenteken.toUpperCase().replace(/[\s-]/g, "");
        const merkTrimmed = form.merk.trim();
        const modelTrimmed = form.model.trim();

        // Vroege guards voor verplichte velden
        if (normalKenteken.length === 0) { setFout("Vul een geldig kenteken in."); return; }
        if (!merkTrimmed) { setFout("Merk is verplicht."); return; }
        if (!modelTrimmed) { setFout("Model is verplicht."); return; }

        // klantId is optioneel — voertuig mag zonder klant worden aangemaakt
        setBezig(true);
        setFout(null);
        try {
            // RDW-data: live rdwData heeft voorrang, anders preFill-data als fallback
            const rdw = rdwData ?? null;

            // Fix: locale datum-parsing — new Date("YYYY-MM-DD") = UTC midnight = dag eerder in NL
            const apkMs = form.apkVervaldatum
                ? (() => {
                    const [j, m, d] = (form.apkVervaldatum as string).split("-").map(Number);
                    return new Date(j, m - 1, d, 12, 0, 0).getTime();
                })()
                : undefined;

            await createVoertuig({
                klantId: gekozenKlantId ?? undefined,
                kenteken: normalKenteken,
                merk: merkTrimmed,
                model: modelTrimmed,
                bouwjaar: Number(form.bouwjaar),
                brandstof: form.brandstof,
                kilometerstand: form.kilometerstand ? Number(form.kilometerstand) : undefined,
                apkVervaldatum: apkMs,
                voertuigNotities: form.voertuigNotities || undefined,
                // ── RDW-verrijking ────────────────────────────────────────────
                voertuigsoort: rdw?.voertuigsoort ?? preFill?.voertuigsoort,
                kleur: rdw?.kleur ?? preFill?.kleur,
                tweedeKleur: rdw?.tweedeKleur ?? preFill?.tweedeKleur,
                massaRijklaar: rdw?.massaRijklaar ?? preFill?.massaRijklaar,
                maxTrekgewichtOngeremd: rdw?.maxTrekgewichtOngeremd ?? preFill?.maxTrekgewichtOngeremd,
                maxTrekgewichtGeremd: rdw?.maxTrekgewichtGeremd ?? preFill?.maxTrekgewichtGeremd,
                aantalZitplaatsen: rdw?.aantalZitplaatsen ?? preFill?.aantalZitplaatsen,
                eersteTenaamstelling: rdw?.eersteTenaamstelling ?? preFill?.eersteTenaamstelling,
                co2Uitstoot: rdw?.co2Uitstoot ?? preFill?.co2Uitstoot,
            });
            analyticsVoertuigNieuw(form.merk, form.brandstof);
            onSluit();
        } catch (err) {
            // Strip interne Convex prefix-codes voor nettere user-facing melding
            setFout(err instanceof Error ? err.message.replace(/^(INVALID|CONFLICT|FORBIDDEN): /, "") : "Onbekende fout");
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
        if (rdwStatus === "ok") return (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-success)", fontWeight: "var(--weight-semibold)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <IconCheck /> Gevonden
            </span>
        );
        if (rdwStatus === "notfound") return (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <IconX /> Niet gevonden
            </span>
        );
        if (rdwStatus === "error") return (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-warning)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <IconAlertTriangle /> Probeer opnieuw
            </span>
        );
        return null;
    };

    return (
        <ModalShell onSluit={onSluit} ariaLabel="Nieuw voertuig toevoegen" maxWidth="560px">
            {/* Header */}
            <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <IconCar /> Nieuw Voertuig
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
                {/* Klant-stap: toon alleen als klantKeuzeGedaan=false (handmatige aanmaak zonder keuze-modal) */}
                {!klantKeuzeGedaan ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                            <label style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)" }}>
                                Koppel aan klant <span style={{ color: "var(--color-muted)", fontWeight: "normal" }}>(optioneel)</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setSlaKlantOver(true)}
                                style={{
                                    fontSize: "var(--text-xs)", color: "var(--color-accent-text)",
                                    background: "none", border: "none", cursor: "pointer", padding: 0,
                                    textDecoration: "underline", textDecorationStyle: "dotted",
                                }}
                            >
                                Doorgaan zonder klant →
                            </button>
                        </div>
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
                                style={{
                                    textAlign: "left", padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--glass-bg-subtle)",
                                    cursor: "pointer", minHeight: "48px",
                                    transition: "border-color var(--transition-fast), background-color var(--transition-fast)",
                                }}
                            >
                                <strong style={{ color: "var(--color-heading)", display: "block", fontSize: "var(--text-sm)" }}>{k.voornaam} {k.achternaam}</strong>
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{k.emailadres}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Klant-chip: getoond als klant gekoppeld, anders 'Onbekende eigenaar' badge */}
                        {gekozenKlantId ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3)", background: "var(--color-success-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-success-border)" }}>
                                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-success)", display: "flex", alignItems: "center", gap: "var(--space-2)", fontWeight: "var(--weight-semibold)" }}>
                                    <IconUser />
                                    <strong>{gekozenKlantNaam}</strong>
                                </span>
                                {/* Alleen wijzigbaar als de keuze niet via preFill is gezet */}
                                {!preFill?.klantId && (
                                    <button
                                        type="button"
                                        onClick={() => { setGekozenKlantId(null); setGekozenKlantNaam(""); setSlaKlantOver(false); }}
                                        className="btn btn-ghost btn-sm"
                                        style={{ fontSize: "var(--text-xs)" }}
                                    >
                                        Wijzig
                                    </button>
                                )}
                            </div>
                        ) : (
                            /* Geen klant gekozen — badge tonen */
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-3)", background: "var(--glass-bg-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                    <IconCar />
                                    Voertuig wordt opgeslagen zonder klant-koppeling
                                </span>
                            </div>
                        )}

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
                                    className="btn btn-outline"
                                    style={{ minHeight: "44px", whiteSpace: "nowrap", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
                                    aria-label="Kenteken opzoeken via RDW"
                                >
                                    {rdwStatus === "loading" ? "Laden…" : <><IconSearch /> Ophalen</>}
                                </button>
                            </div>
                            {rdwBadge() && <div style={{ marginTop: "var(--space-1)" }}>{rdwBadge()}</div>}

                            {/* RDW signalen */}
                            {rdwStatus === "ok" && rdwData && (
                                <div style={{ marginTop: "var(--space-2)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                                    {rdwData.wok && (
                                        <div role="alert" style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", color: "var(--color-error)", fontWeight: "var(--weight-semibold)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                            <IconAlertTriangle /> WOK — Wacht op keuren: dit voertuig mag de openbare weg niet op
                                        </div>
                                    )}

                                    {/* Recalls: gedetailleerde lijst als beschikbaar, anders generieke melding */}
                                    {rdwData.recalls && rdwData.recalls.length > 0 ? (
                                        <div role="alert" style={{ padding: "var(--space-3)", background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", color: "var(--color-warning)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                                            <div style={{ fontWeight: "var(--weight-semibold)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                                <IconAlertTriangle /> {rdwData.recalls.length} openstaande terugroepactie{rdwData.recalls.length > 1 ? "s" : ""}
                                            </div>
                                            {rdwData.recalls.map((r, i) => (
                                                <div key={r.code ?? i} style={{ paddingLeft: "var(--space-4)", borderLeft: "2px solid var(--color-warning-border)", display: "flex", flexDirection: "column", gap: "2px" }}>
                                                    <span style={{ fontWeight: "var(--weight-semibold)", fontFamily: "var(--font-mono)" }}>{r.code}</span>
                                                    {r.omschrijving && <span style={{ color: "var(--color-warning-text, var(--color-warning))" }}>{r.omschrijving}</span>}
                                                    {r.oorzaak && <span style={{ color: "var(--color-muted)" }}>Oorzaak: {r.oorzaak}</span>}
                                                    {r.remedie && <span style={{ color: "var(--color-muted)" }}>Remedie: {r.remedie}</span>}
                                                    {r.datum && <span style={{ color: "var(--color-muted)" }}>Aankondiging: {r.datum}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : rdwData.heeftRecall ? (
                                        <div role="alert" style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", color: "var(--color-warning)", fontWeight: "var(--weight-semibold)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                            <IconAlertTriangle /> Openstaande terugroepactie (Recall)
                                        </div>
                                    ) : null}

                                    {rdwData.nap === "Onlogisch" && (
                                        <div role="alert" style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", color: "var(--color-warning)", fontWeight: "var(--weight-semibold)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                            <IconAlertTriangle /> Onlogische kilometerstand (NAP: verdacht)
                                        </div>
                                    )}

                                    {/* Info-badges: alle beschikbare RDW metadata */}
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                                        {rdwData.voertuigsoort && <span style={{ padding: "var(--space-1) var(--space-2)", background: "var(--color-accent-dim)", border: "1px solid var(--color-accent)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-accent-text, var(--color-heading))", fontWeight: "var(--weight-medium)" }}>{rdwData.voertuigsoort}</span>}
                                        {rdwData.kleur && <span style={{ padding: "var(--space-1) var(--space-2)", background: "var(--glass-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-body)" }}>Kleur: {rdwData.kleur}{rdwData.tweedeKleur ? ` / ${rdwData.tweedeKleur}` : ""}</span>}
                                        {rdwData.inrichting && <span style={{ padding: "var(--space-1) var(--space-2)", background: "var(--glass-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-body)" }}>{rdwData.inrichting}</span>}
                                        {rdwData.aantalZitplaatsen ? <span style={{ padding: "var(--space-1) var(--space-2)", background: "var(--glass-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-body)" }}>{rdwData.aantalZitplaatsen} zitplaatsen</span> : null}
                                        {rdwData.cilinderinhoud ? <span style={{ padding: "var(--space-1) var(--space-2)", background: "var(--glass-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-body)" }}>{rdwData.cilinderinhoud} cc</span> : null}
                                        {rdwData.vermogen ? <span style={{ padding: "var(--space-1) var(--space-2)", background: "var(--glass-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-body)" }}>{rdwData.vermogen} kW</span> : null}
                                        {rdwData.co2Uitstoot ? <span style={{ padding: "var(--space-1) var(--space-2)", background: "var(--glass-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-body)" }}>{rdwData.co2Uitstoot} g/km CO₂</span> : null}
                                        {rdwData.massaRijklaar ? <span style={{ padding: "var(--space-1) var(--space-2)", background: "var(--glass-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-body)" }}>{rdwData.massaRijklaar} kg rijklaar</span> : null}
                                        {rdwData.emissieklasse && <span style={{ padding: "var(--space-1) var(--space-2)", background: "var(--glass-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-body)" }}>{rdwData.emissieklasse}</span>}
                                        {rdwData.eersteTenaamstelling && <span style={{ padding: "var(--space-1) var(--space-2)", background: "var(--glass-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--color-body)" }}>1e tenaamstelling: {rdwData.eersteTenaamstelling}</span>}
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

                {/* Submit-knop: altijd tonen als klantKeuzeGedaan (offwel via preFill, offwel na selectie) */}
                {klantKeuzeGedaan && (
                    <button type="submit" disabled={bezig} className="btn btn-primary" style={{ minHeight: "52px", gap: "var(--space-2)" }}>
                        <IconCar />
                        {bezig ? "Aanmaken…" : "Voertuig registreren"}
                    </button>
                )}
            </form>
        </ModalShell>
    );
}
