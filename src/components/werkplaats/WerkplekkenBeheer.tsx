/**
 * src/components/werkplaats/WerkplekkenBeheer.tsx
 *
 * Eigenaar-only sectie voor het beheren van werkplekken.
 * ui-ux-pro-max: SVG icons vervangen alle emoji's, skeleton loader, ChevronUp/Down pijlen.
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type WerkplekType = "Brug" | "Uitlijnbrug" | "Wasplaats" | "Buiten" | "Overig";
const WERKPLEK_TYPES: WerkplekType[] = ["Brug", "Uitlijnbrug", "Wasplaats", "Buiten", "Overig"];

// ---------------------------------------------------------------------------
// SVG icons
// ---------------------------------------------------------------------------

function IconWrench() {
    return <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>;
}
function IconRuler() {
    return <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7l4-4 14 14-4 4z" /><line x1="8" y1="12" x2="12" y2="8" /><line x1="12" y1="16" x2="16" y2="12" /></svg>;
}
function IconDroplets() {
    return <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" /><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" /></svg>;
}
function IconParking() {
    return <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></svg>;
}
function IconGrid() {
    return <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>;
}
function IconSettings() {
    return <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}
function IconChevronUp() {
    return <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15" /></svg>;
}
function IconChevronDown() {
    return <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>;
}
function IconPencil() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}
function IconSave() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>;
}
function IconPlus() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
function IconZap() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
}
function IconX() {
    return <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}

const TYPE_SVG: Record<WerkplekType, React.ReactNode> = {
    Brug: <IconWrench />,
    Uitlijnbrug: <IconRuler />,
    Wasplaats: <IconDroplets />,
    Buiten: <IconParking />,
    Overig: <IconGrid />,
};

// ---------------------------------------------------------------------------
// inputStyle
// ---------------------------------------------------------------------------

const inputStyle = {
    padding: "var(--space-2) var(--space-3)",
    borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
    background: "var(--color-surface)", color: "var(--color-heading)",
    fontSize: "var(--text-sm)", minHeight: "40px", boxSizing: "border-box" as const,
};

// ---------------------------------------------------------------------------
// WerkplekSkeleton
// ---------------------------------------------------------------------------

function WerkplekSkeleton() {
    return (
        <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "var(--radius-sm)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ width: "40%", height: "14px", borderRadius: "var(--radius-sm)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite", marginBottom: "6px" }} />
                        <div style={{ width: "25%", height: "11px", borderRadius: "var(--radius-sm)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
                    </div>
                    <div style={{ width: "72px", height: "32px", borderRadius: "var(--radius-md)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
                </div>
            ))}
        </div>
    );
}

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
                    {WERKPLEK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button type="submit" disabled={bezig} className="btn btn-primary btn-sm"
                    style={{ minHeight: "40px", display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                    <IconPlus /> {bezig ? "…" : "Toevoegen"}
                </button>
                <button type="button" onClick={onSluit} className="btn btn-ghost btn-sm"
                    style={{ minHeight: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconX />
                </button>
            </div>
            {fout && <p role="alert" style={{ width: "100%", color: "var(--color-error)", fontSize: "var(--text-xs)" }}>{fout}</p>}
        </form>
    );
}

// ---------------------------------------------------------------------------
// WerkplekRij
// ---------------------------------------------------------------------------

function WerkplekRij({
    werkplek, isEerste, isLaatste,
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
            {/* SVG ChevronUp/Down volgorde-pijlen */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <button onClick={() => handleVerplaats("omhoog")} disabled={isEerste || bezig}
                    className="btn btn-ghost btn-sm" aria-label="Omhoog"
                    style={{ padding: "3px 5px", lineHeight: 1, minHeight: "auto", display: "flex" }}>
                    <IconChevronUp />
                </button>
                <button onClick={() => handleVerplaats("omlaag")} disabled={isLaatste || bezig}
                    className="btn btn-ghost btn-sm" aria-label="Omlaag"
                    style={{ padding: "3px 5px", lineHeight: 1, minHeight: "auto", display: "flex" }}>
                    <IconChevronDown />
                </button>
            </div>

            {/* Type icon */}
            <span style={{ color: "var(--color-muted)", display: "flex", alignItems: "center" }}>
                {TYPE_SVG[werkplek.type as WerkplekType] ?? <IconGrid />}
            </span>

            {bewerkModus ? (
                <>
                    <input value={nieuweNaam} onChange={(e) => setNieuweNaam(e.target.value)}
                        style={{ ...inputStyle, flex: 1, minWidth: "120px" }} autoFocus />
                    <select value={nieuwType} onChange={(e) => setNieuwType(e.target.value as WerkplekType)}
                        style={{ ...inputStyle, cursor: "pointer" }}>
                        {WERKPLEK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={handleOpslaan} disabled={bezig} className="btn btn-primary btn-sm"
                        style={{ minHeight: "40px", display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                        <IconSave /> {bezig ? "…" : "Opslaan"}
                    </button>
                    <button onClick={() => { setBewerkModus(false); setNieuweNaam(werkplek.naam); }}
                        className="btn btn-ghost btn-sm"
                        style={{ minHeight: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <IconX />
                    </button>
                </>
            ) : (
                <>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", fontSize: "var(--text-sm)" }}>{werkplek.naam}</p>
                        <p style={{ margin: "1px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{werkplek.type} · volgorde {werkplek.volgorde}</p>
                    </div>
                    <button onClick={() => setBewerkModus(true)} className="btn btn-ghost btn-sm"
                        aria-label="Bewerk werkplek"
                        style={{ minHeight: "36px", display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                        <IconPencil /> Bewerken
                    </button>
                </>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// WerkplekkenBeheer
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
        <section style={{
            padding: "var(--space-5)", borderRadius: "var(--radius-xl)",
            background: "var(--glass-bg)", backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)", border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-shadow)",
        }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
                <div>
                    <p style={{ margin: 0, fontWeight: "var(--weight-semibold)", color: "var(--color-heading)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <IconSettings /> Werkplekken beheren
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                        Bruggen en locaties in de garage
                    </p>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    {werkplekken?.length === 0 && (
                        <button onClick={handleSeed} disabled={seedBezig} className="btn btn-ghost btn-sm"
                            style={{ minHeight: "40px", display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                            <IconZap /> {seedBezig ? "Seeden…" : "Standaard seeden"}
                        </button>
                    )}
                    <button onClick={() => setToonNieuw((v) => !v)} className="btn btn-primary btn-sm"
                        style={{ minHeight: "40px", display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
                        {toonNieuw ? <><IconX /> Annuleren</> : <><IconPlus /> Werkplek toevoegen</>}
                    </button>
                </div>
            </div>

            {toonNieuw && <NieuweWerkplekForm onSluit={() => setToonNieuw(false)} />}

            <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {werkplekken === undefined ? (
                    <WerkplekSkeleton />
                ) : werkplekken.length === 0 ? (
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", fontStyle: "italic", textAlign: "center", padding: "var(--space-6) 0" }}>
                        Nog geen werkplekken geconfigureerd.
                    </p>
                ) : (
                    werkplekken.map((wp, idx) => (
                        <WerkplekRij
                            key={wp._id} werkplek={wp}
                            isEerste={idx === 0} isLaatste={idx === werkplekken.length - 1}
                        />
                    ))
                )}
            </div>
        </section>
    );
}
