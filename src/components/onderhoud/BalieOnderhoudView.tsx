/**
 * src/components/onderhoud/BalieOnderhoudView.tsx
 *
 * Balie / Receptie weergave voor Onderhoudshistorie.
 *
 * Functies:
 *   - Zoek voertuig op kenteken
 *   - Bekijk volledig onderhoudsdossier
 *   - Nieuwe onderhoudsbeurt registreren (modal)
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useVoertuigHistorie } from "../../hooks/useOnderhoud";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TypeWerk =
    | "Grote Beurt" | "Kleine Beurt" | "APK" | "Reparatie"
    | "Bandenwisseling" | "Schadeherstel" | "Diagnostiek" | "Overig";

const TYPE_WERK_OPTIES: TypeWerk[] = [
    "Grote Beurt", "Kleine Beurt", "APK", "Reparatie",
    "Bandenwisseling", "Schadeherstel", "Diagnostiek", "Overig",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDatum(ms: number) {
    return new Date(ms).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const TYPE_ICOON: Record<TypeWerk, string> = {
    "Grote Beurt": "🔧", "Kleine Beurt": "🪛", "APK": "📋",
    "Reparatie": "🔨", "Bandenwisseling": "🔄", "Schadeherstel": "🚗",
    "Diagnostiek": "🔍", "Overig": "📦",
};

const inputStyle = {
    width: "100%", padding: "var(--space-2) var(--space-3)",
    borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
    background: "var(--color-surface)", color: "var(--color-heading)",
    fontSize: "var(--text-sm)", minHeight: "44px", boxSizing: "border-box" as const,
};

// ---------------------------------------------------------------------------
// NieuweBeurtModal
// ---------------------------------------------------------------------------

function NieuweBeurtModal({
    voertuig,
    onSluit,
}: {
    voertuig: Doc<"voertuigen">;
    onSluit: () => void;
}) {
    const registreer = useMutation(api.onderhoudshistorie.registreer);
    const [form, setForm] = useState({
        typeWerk: "Kleine Beurt" as TypeWerk,
        datumUitgevoerd: new Date().toISOString().split("T")[0],
        kmStandOnderhoud: voertuig.kilometerstand?.toString() ?? "",
        werkNotities: "",
        documentUrl: "",
    });
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.kmStandOnderhoud) return;
        setBezig(true);
        setFout(null);
        try {
            await registreer({
                voertuigId: voertuig._id,
                typeWerk: form.typeWerk,
                datumUitgevoerd: new Date(form.datumUitgevoerd).getTime(),
                kmStandOnderhoud: parseInt(form.kmStandOnderhoud),
                werkNotities: form.werkNotities || undefined,
                documentUrl: form.documentUrl || undefined,
            });
            onSluit();
        } catch (err) {
            setFout(err instanceof Error ? err.message : "Onbekende fout");
        } finally {
            setBezig(false);
        }
    }

    return (
        <div
            onClick={onSluit}
            style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
                justifyContent: "center", zIndex: 9999, padding: "var(--space-4)",
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "100%", maxWidth: "520px", background: "var(--color-surface)",
                    border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)",
                    overflow: "hidden", boxShadow: "var(--shadow-xl)",
                    maxHeight: "90vh", display: "flex", flexDirection: "column",
                }}
            >
                {/* Header */}
                <div style={{
                    padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", color: "var(--color-heading)" }}>
                            + Onderhoudsbeurt registreren
                        </h2>
                        <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}>
                            {voertuig.kenteken} — {voertuig.merk} {voertuig.model}
                        </p>
                    </div>
                    <button onClick={onSluit} className="btn btn-ghost btn-sm" style={{ minHeight: "40px" }}>✕</button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)", overflowY: "auto" }}>
                    {/* Type werk */}
                    <div>
                        <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                            Type werk <span style={{ color: "var(--color-error)" }}>*</span>
                        </label>
                        <select
                            value={form.typeWerk}
                            onChange={(e) => setForm((f) => ({ ...f, typeWerk: e.target.value as TypeWerk }))}
                            style={{ ...inputStyle, cursor: "pointer" }}
                            required
                        >
                            {TYPE_WERK_OPTIES.map((t) => (
                                <option key={t} value={t}>{TYPE_ICOON[t]} {t}</option>
                            ))}
                        </select>
                    </div>

                    {/* Datum + KM in grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                                Datum uitgevoerd <span style={{ color: "var(--color-error)" }}>*</span>
                            </label>
                            <input
                                type="date"
                                value={form.datumUitgevoerd}
                                onChange={(e) => setForm((f) => ({ ...f, datumUitgevoerd: e.target.value }))}
                                required
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                                Kilometerstand <span style={{ color: "var(--color-error)" }}>*</span>
                            </label>
                            <input
                                type="number"
                                value={form.kmStandOnderhoud}
                                onChange={(e) => setForm((f) => ({ ...f, kmStandOnderhoud: e.target.value }))}
                                placeholder="bijv. 125000"
                                required
                                min={0}
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    {/* Notities */}
                    <div>
                        <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                            Werknotities
                        </label>
                        <textarea
                            value={form.werkNotities}
                            onChange={(e) => setForm((f) => ({ ...f, werkNotities: e.target.value }))}
                            placeholder="bijv. Distributieriem vervangen, filters bijgewerkt…"
                            rows={3}
                            style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
                        />
                    </div>

                    {/* Document URL */}
                    <div>
                        <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--color-heading)", marginBottom: "var(--space-1)" }}>
                            Factuur / Rapportage URL
                        </label>
                        <input
                            type="url"
                            value={form.documentUrl}
                            onChange={(e) => setForm((f) => ({ ...f, documentUrl: e.target.value }))}
                            placeholder="https://…"
                            style={inputStyle}
                        />
                    </div>

                    {fout && (
                        <div className="alert alert-error" role="alert">{fout}</div>
                    )}

                    <button type="submit" disabled={bezig} className="btn btn-primary" style={{ minHeight: "52px" }}>
                        {bezig ? "Registreren…" : "✅ Onderhoudsbeurt opslaan"}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// OnderhoudsDossier — voor één geselecteerd voertuig
// ---------------------------------------------------------------------------

function OnderhoudsDossier({
    voertuig,
    onTerug,
}: {
    voertuig: Doc<"voertuigen">;
    onTerug: () => void;
}) {
    const historie = useVoertuigHistorie(voertuig._id);
    const verwijder = useMutation(api.onderhoudshistorie.verwijder);
    const [toonNieuw, setToonNieuw] = useState(false);
    const [verwijderBezig, setVerwijderBezig] = useState<Id<"onderhoudshistorie"> | null>(null);

    async function handleVerwijder(id: Id<"onderhoudshistorie">) {
        if (!confirm("Weet je zeker dat je deze onderhoudsbeurt wil verwijderen?")) return;
        setVerwijderBezig(id);
        try {
            await verwijder({ historieId: id });
        } finally {
            setVerwijderBezig(null);
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* Terug + voertuig header */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
                <button onClick={onTerug} className="btn btn-ghost btn-sm" style={{ minHeight: "40px" }}>
                    ← Terug
                </button>
                <div>
                    <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)" }}>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{voertuig.kenteken}</span>
                        {" "}&mdash; {voertuig.merk} {voertuig.model}
                    </h2>
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                        {voertuig.bouwjaar} · {voertuig.brandstof}
                        {voertuig.kilometerstand !== undefined && ` · ${voertuig.kilometerstand.toLocaleString("nl-NL")} km`}
                    </p>
                </div>
                <div style={{ marginLeft: "auto" }}>
                    <button onClick={() => setToonNieuw(true)} className="btn btn-primary" style={{ minHeight: "44px" }}>
                        + Beurt registreren
                    </button>
                </div>
            </div>

            {/* Dossier */}
            {historie === undefined ? (
                <p style={{ color: "var(--color-muted)" }}>⏳ Dossier laden…</p>
            ) : historie.length === 0 ? (
                <div className="card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
                    <p style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-3)" }}>📋</p>
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>
                        Nog geen onderhoudsbeurten geregistreerd voor dit voertuig.
                    </p>
                    <button onClick={() => setToonNieuw(true)} className="btn btn-primary" style={{ marginTop: "var(--space-4)", minHeight: "48px" }}>
                        + Eerste beurt toevoegen
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    {historie.map((beurt) => (
                        <div key={beurt._id} className="card" style={{ padding: "var(--space-4)" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
                                <div style={{ display: "flex", gap: "var(--space-3)", flex: 1 }}>
                                    <span style={{ fontSize: "var(--text-2xl)", lineHeight: 1 }}>
                                        {TYPE_ICOON[beurt.typeWerk as TypeWerk] ?? "🔧"}
                                    </span>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", fontSize: "var(--text-sm)" }}>
                                            {beurt.typeWerk}
                                        </p>
                                        <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                            {formatDatum(beurt.datumUitgevoerd)} · {beurt.kmStandOnderhoud.toLocaleString("nl-NL")} km
                                        </p>
                                        {beurt.werkNotities && (
                                            <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--color-body)", fontStyle: "italic" }}>
                                                {beurt.werkNotities}
                                            </p>
                                        )}
                                        {beurt.documentUrl && (
                                            <a
                                                href={beurt.documentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-primary)" }}
                                            >
                                                📄 Document bekijken
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleVerwijder(beurt._id)}
                                    disabled={verwijderBezig === beurt._id}
                                    className="btn btn-ghost btn-sm"
                                    aria-label="Verwijder onderhoudsbeurt"
                                    style={{ color: "var(--color-error)", minHeight: "36px", flexShrink: 0 }}
                                >
                                    {verwijderBezig === beurt._id ? "…" : "🗑️"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {toonNieuw && <NieuweBeurtModal voertuig={voertuig} onSluit={() => setToonNieuw(false)} />}
        </div>
    );
}

// ---------------------------------------------------------------------------
// VoertuigKiezer — zoek op kenteken
// ---------------------------------------------------------------------------

function VoertuigKiezer({ onSelecteer }: { onSelecteer: (v: Doc<"voertuigen">) => void }) {
    const [zoek, setZoek] = useState("");
    const resultaten = useQuery(
        api.voertuigen.zoekOpKenteken,
        zoek.length >= 2 ? { term: zoek } : "skip"
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <div>
                <h2 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)" }}>
                    🔍 Zoek voertuig
                </h2>
                <input
                    type="search"
                    value={zoek}
                    onChange={(e) => setZoek(e.target.value)}
                    placeholder="Kenteken zoeken (min. 2 tekens)…"
                    className="input"
                    style={{ maxWidth: "320px", minHeight: "48px" }}
                    autoFocus
                />
            </div>

            {zoek.length >= 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {resultaten === undefined ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>⏳ Zoeken…</p>
                    ) : resultaten.length === 0 ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic" }}>
                            Geen voertuigen gevonden voor "{zoek}".
                        </p>
                    ) : (
                        resultaten.map((v) => (
                            <button
                                key={v._id}
                                onClick={() => onSelecteer(v)}
                                className="card card-interactive"
                                style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", width: "100%", cursor: "pointer" }}
                                aria-label={`Selecteer ${v.kenteken}`}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-base)", color: "var(--color-heading)" }}>
                                        {v.kenteken}
                                    </span>
                                    <span style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", flex: 1 }}>
                                        {v.merk} {v.model} · {v.bouwjaar} · {v.brandstof}
                                    </span>
                                    {v.kilometerstand !== undefined && (
                                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                            {v.kilometerstand.toLocaleString("nl-NL")} km
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default function BalieOnderhoudView() {
    const [geselecteerd, setGeselecteerd] = useState<Doc<"voertuigen"> | null>(null);

    if (geselecteerd) {
        return <OnderhoudsDossier voertuig={geselecteerd} onTerug={() => setGeselecteerd(null)} />;
    }

    return <VoertuigKiezer onSelecteer={setGeselecteerd} />;
}
