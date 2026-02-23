/**
 * src/components/werkplaats/WerkplekkenBeheer.tsx
 *
 * Eigenaar-only sectie voor het beheren van werkplekken (brug-kolommen).
 *
 * Functies:
 *   - Lijst van bestaande werkplekken (naam, type, volgorde)
 *   - Werkplek hernoemen of type wijzigen
 *   - Volgorde aanpassen (omhoog / omlaag knoppen)
 *   - Nieuwe werkplek toevoegen
 *   - Seed standaard werkplekken als er nog geen zijn
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WerkplekType = "Brug" | "Uitlijnbrug" | "Wasplaats" | "Buiten" | "Overig";

const WERKPLEK_TYPES: WerkplekType[] = ["Brug", "Uitlijnbrug", "Wasplaats", "Buiten", "Overig"];

const TYPE_ICOON: Record<WerkplekType, string> = {
    Brug: "🔩", Uitlijnbrug: "📐", Wasplaats: "🚿", Buiten: "🌤️", Overig: "🏗️",
};

const inputStyle = {
    padding: "var(--space-2) var(--space-3)",
    borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
    background: "var(--color-surface)", color: "var(--color-heading)",
    fontSize: "var(--text-sm)", minHeight: "40px", boxSizing: "border-box" as const,
};

// ---------------------------------------------------------------------------
// NieuweWerkplekForm
// ---------------------------------------------------------------------------

function NieuweWerkplekForm({ onSluit }: { onSluit: () => void }) {
    const voegToe = useMutation(api.werkplekken.voegWerkplekToe);
    const [naam, setNaam] = useState("");
    const [type, setType] = useState<WerkplekType>("Brug");
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!naam.trim()) return;
        setBezig(true); setFout(null);
        try {
            await voegToe({ naam: naam.trim(), type });
            onSluit();
        } catch (err) {
            setFout(err instanceof Error ? err.message : "Onbekende fout");
        } finally { setBezig(false); }
    }

    return (
        <form onSubmit={handleSubmit} style={{
            display: "flex", gap: "var(--space-3)", alignItems: "flex-end",
            flexWrap: "wrap", padding: "var(--space-4)",
            background: "var(--glass-bg-subtle)", borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--color-border)",
        }}>
            <div style={{ flex: 1, minWidth: "160px" }}>
                <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--color-muted)", marginBottom: "4px" }}>Naam</label>
                <input
                    type="text" value={naam} onChange={(e) => setNaam(e.target.value)}
                    placeholder="bijv. Brug 3" required style={{ ...inputStyle, width: "100%" }} autoFocus
                />
            </div>
            <div>
                <label style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--color-muted)", marginBottom: "4px" }}>Type</label>
                <select value={type} onChange={(e) => setType(e.target.value as WerkplekType)} style={{ ...inputStyle, cursor: "pointer" }}>
                    {WERKPLEK_TYPES.map((t) => <option key={t} value={t}>{TYPE_ICOON[t]} {t}</option>)}
                </select>
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button type="submit" disabled={bezig} className="btn btn-primary btn-sm" style={{ minHeight: "40px" }}>
                    {bezig ? "…" : "✅ Toevoegen"}
                </button>
                <button type="button" onClick={onSluit} className="btn btn-ghost btn-sm" style={{ minHeight: "40px" }}>✕</button>
            </div>
            {fout && <p role="alert" style={{ width: "100%", color: "var(--color-error)", fontSize: "var(--text-xs)" }}>{fout}</p>}
        </form>
    );
}

// ---------------------------------------------------------------------------
// WerkplekRij
// ---------------------------------------------------------------------------

function WerkplekRij({
    werkplek,
    isEerste,
    isLaatste,
}: {
    werkplek: { _id: Id<"werkplekken">; naam: string; type: string; volgorde: number };
    isEerste: boolean;
    isLaatste: boolean;
}) {
    const hernoemMutation = useMutation(api.werkplekken.hernoemWerkplek);
    const verplaatsMutation = useMutation(api.werkplekken.verplaatsWerkplek);
    const [bewerkModus, setBewerkModus] = useState(false);
    const [nieuweNaam, setNieuweNaam] = useState(werkplek.naam);
    const [nieuwType, setNieuwType] = useState<WerkplekType>(werkplek.type as WerkplekType);
    const [bezig, setBezig] = useState(false);

    async function handleOpslaan() {
        setBezig(true);
        try {
            await hernoemMutation({ werkplekId: werkplek._id, naam: nieuweNaam.trim(), type: nieuwType });
            setBewerkModus(false);
        } finally { setBezig(false); }
    }

    async function handleVerplaats(richting: "omhoog" | "omlaag") {
        setBezig(true);
        try { await verplaatsMutation({ werkplekId: werkplek._id, richting }); }
        finally { setBezig(false); }
    }

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)",
            background: "var(--color-surface)", border: "1px solid var(--color-border)", flexWrap: "wrap",
        }}>
            {/* Volgorde-pijlen */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <button onClick={() => handleVerplaats("omhoog")} disabled={isEerste || bezig}
                    className="btn btn-ghost btn-sm" aria-label="Omhoog" style={{ padding: "2px 6px", lineHeight: 1, minHeight: "auto" }}>▲</button>
                <button onClick={() => handleVerplaats("omlaag")} disabled={isLaatste || bezig}
                    className="btn btn-ghost btn-sm" aria-label="Omlaag" style={{ padding: "2px 6px", lineHeight: 1, minHeight: "auto" }}>▼</button>
            </div>

            <span style={{ fontSize: "var(--text-xl)", lineHeight: 1 }}>{TYPE_ICOON[werkplek.type as WerkplekType] ?? "🏗️"}</span>

            {bewerkModus ? (
                <>
                    <input value={nieuweNaam} onChange={(e) => setNieuweNaam(e.target.value)}
                        style={{ ...inputStyle, flex: 1, minWidth: "120px" }} autoFocus />
                    <select value={nieuwType} onChange={(e) => setNieuwType(e.target.value as WerkplekType)} style={{ ...inputStyle, cursor: "pointer" }}>
                        {WERKPLEK_TYPES.map((t) => <option key={t} value={t}>{TYPE_ICOON[t]} {t}</option>)}
                    </select>
                    <button onClick={handleOpslaan} disabled={bezig} className="btn btn-primary btn-sm" style={{ minHeight: "40px" }}>
                        {bezig ? "…" : "💾 Opslaan"}
                    </button>
                    <button onClick={() => { setBewerkModus(false); setNieuweNaam(werkplek.naam); }} className="btn btn-ghost btn-sm" style={{ minHeight: "40px" }}>✕</button>
                </>
            ) : (
                <>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", fontSize: "var(--text-sm)" }}>{werkplek.naam}</p>
                        <p style={{ margin: "1px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{werkplek.type} · volgorde {werkplek.volgorde}</p>
                    </div>
                    <button onClick={() => setBewerkModus(true)} className="btn btn-ghost btn-sm" aria-label="Bewerk werkplek" style={{ minHeight: "36px" }}>
                        ✏️ Bewerken
                    </button>
                </>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default function WerkplekkenBeheer() {
    const werkplekken = useQuery(api.werkplekken.lijstWerkplekken);
    const seed = useMutation(api.werkplekken.seedDefaultWerkplekken);
    const [toonNieuw, setToonNieuw] = useState(false);
    const [seedBezig, setSeedBezig] = useState(false);

    async function handleSeed() {
        setSeedBezig(true);
        try { await seed(); } finally { setSeedBezig(false); }
    }

    return (
        <section className="card" style={{ padding: "var(--space-5)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
                <div>
                    <p className="card-title" style={{ margin: 0 }}>🏗️ Werkplekken beheren</p>
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                        Bruggen en locaties in de garage — bepalen de kolommen op het bord
                    </p>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    {werkplekken?.length === 0 && (
                        <button onClick={handleSeed} disabled={seedBezig} className="btn btn-ghost btn-sm" style={{ minHeight: "40px" }}>
                            {seedBezig ? "Seeden…" : "🌱 Standaard seeden"}
                        </button>
                    )}
                    <button onClick={() => setToonNieuw((v) => !v)} className="btn btn-primary btn-sm" style={{ minHeight: "40px" }}>
                        {toonNieuw ? "✕ Annuleren" : "+ Werkplek toevoegen"}
                    </button>
                </div>
            </div>

            {toonNieuw && <NieuweWerkplekForm onSluit={() => setToonNieuw(false)} />}

            <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {werkplekken === undefined ? (
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>⏳ Laden…</p>
                ) : werkplekken.length === 0 ? (
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic", textAlign: "center", padding: "var(--space-6) 0" }}>
                        Nog geen werkplekken geconfigureerd. Voeg een werkplek toe of seed de standaard bruggen.
                    </p>
                ) : (
                    werkplekken.map((wp, idx) => (
                        <WerkplekRij
                            key={wp._id}
                            werkplek={wp}
                            isEerste={idx === 0}
                            isLaatste={idx === werkplekken.length - 1}
                        />
                    ))
                )}
            </div>
        </section>
    );
}
