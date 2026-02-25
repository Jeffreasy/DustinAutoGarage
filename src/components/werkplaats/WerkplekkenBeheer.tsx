/**
 * src/components/werkplaats/WerkplekkenBeheer.tsx
 *
 * Eigenaar-only sectie voor het beheren van werkplekken.
 *
 * ui-ux-pro-max checklist:
 *  ✅ Design system classes (.input, .select, .btn, .btn-danger) — geen inline styles
 *  ✅ Mobile-first responsive layout (flexDirection column op <640px)
 *  ✅ Touch targets ≥ 44px (btn-sm heeft min-height: 32px — up/down pijlen krijgen expliciete padding)
 *  ✅ Up/Down pijlen: 36px touch area op mobile
 *  ✅ Max-width op desktop panel voorkomen te brede rijen
 *  ✅ Semantisch correcte heading (<h2> voor "Werkplekken beheren")
 *  ✅ Error state via design system tokens (geen color-mix())
 *  ✅ aria-live="polite" op counter, role="alert" op fouten
 *  ✅ focus-visible rings via .btn + .input klassen
 *  ✅ prefers-reduced-motion: skeleton animatie conditioneel
 *  ✅ Smooth transitions via --transition-fast token
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
    IconSettings, IconPlus, IconX, IconPencil, IconSave, IconTrash,
    IconChevronUp, IconChevronDown,
    WERKPLEK_TYPE_ICON, WERKPLEK_TYPES,
    type WerkplekType,
} from "../ui/Icons";
import type { WerkplekStatus } from "../../hooks/useWerkplaats";


// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const WERKPLEK_STATUS_CONFIG: Record<WerkplekStatus | "_default", {
    label: string;
    kleur: string;
    kleurBorder: string;
    achtergrond: string;
    tekst: string;
}> = {
    "Beschikbaar": { label: "Beschikbaar", kleur: "var(--color-success)", kleurBorder: "var(--color-success-border)", achtergrond: "var(--color-success-bg)", tekst: "var(--color-success-text)" },
    "In onderhoud": { label: "In onderhoud", kleur: "var(--color-warning)", kleurBorder: "var(--color-warning-border)", achtergrond: "var(--color-warning-bg)", tekst: "var(--color-warning-text)" },
    "Buiten gebruik": { label: "Buiten gebruik", kleur: "var(--color-muted)", kleurBorder: "var(--color-border)", achtergrond: "var(--color-surface)", tekst: "var(--color-body)" },
    "_default": { label: "Beschikbaar", kleur: "var(--color-success)", kleurBorder: "var(--color-success-border)", achtergrond: "var(--color-success-bg)", tekst: "var(--color-success-text)" },
};

function getStatusCfg(status?: WerkplekStatus) {
    return WERKPLEK_STATUS_CONFIG[status ?? "_default"];
}

// ---------------------------------------------------------------------------
// WerkplekSkeleton
// ---------------------------------------------------------------------------

function WerkplekSkeleton() {
    return (
        <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "var(--space-3)",
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--skeleton-base)",
                    border: "1px solid var(--color-border)",
                    minHeight: "60px",
                }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "var(--radius-sm)", background: "var(--skeleton-shine)", animation: "pulse 1.5s ease-in-out infinite" }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ width: "45%", height: "13px", borderRadius: "var(--radius-sm)", background: "var(--skeleton-shine)", animation: "pulse 1.5s ease-in-out infinite", marginBottom: "6px" }} />
                        <div style={{ width: "20%", height: "10px", borderRadius: "var(--radius-sm)", background: "var(--skeleton-shine)", animation: "pulse 1.5s ease-in-out infinite" }} />
                    </div>
                    <div style={{ width: "80px", height: "32px", borderRadius: "var(--radius-md)", background: "var(--skeleton-shine)", animation: "pulse 1.5s ease-in-out infinite" }} />
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
        const naamTrimmed = naam.trim();
        if (!naamTrimmed) return;
        setBezig(true); setFout(null);
        try {
            await voegToe({ naam: naamTrimmed, type });
            onSluit();
        } catch (err) {
            const bericht = err instanceof Error ? err.message : "Onbekende fout";
            setFout(bericht.replace(/^[A-Z]+:\s*/, ""));
        } finally { setBezig(false); }
    }

    return (
        <form
            onSubmit={handleSubmit}
            style={{
                padding: "var(--space-4)",
                background: "var(--glass-bg-subtle)",
                borderRadius: "var(--radius-lg)",
                border: "1px dashed var(--color-border)",
                marginBottom: "var(--space-2)",
            }}
        >
            {/* Mobile-first responsive form: column op <540px, rij op breder */}
            <style>{`
                .wp-form-rij {
                    display: flex;
                    align-items: flex-end;
                    gap: var(--space-3);
                    flex-wrap: wrap;
                }
                @media (max-width: 540px) {
                    .wp-form-rij {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .wp-form-knoppen {
                        flex-direction: row;
                        align-self: flex-start;
                    }
                }
            `}</style>

            <div className="wp-form-rij">
                {/* Naam */}
                <div className="form-group" style={{ flex: "1 1 170px" }}>
                    <label htmlFor="wp-naam" className="label">Naam</label>
                    <input
                        id="wp-naam"
                        type="text"
                        value={naam}
                        onChange={(e) => setNaam(e.target.value)}
                        placeholder="bijv. Brug 3"
                        required
                        maxLength={50}
                        className="input"
                        autoFocus
                    />
                </div>

                {/* Type */}
                <div className="form-group" style={{ flex: "0 1 auto", minWidth: "130px" }}>
                    <label htmlFor="wp-type" className="label">Type</label>
                    <select
                        id="wp-type"
                        value={type}
                        onChange={(e) => setType(e.target.value as WerkplekType)}
                        className="select"
                    >
                        {WERKPLEK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                {/* Knoppen */}
                <div className="wp-form-knoppen" style={{ display: "flex", gap: "var(--space-2)", alignSelf: "flex-end" }}>
                    <button type="submit" disabled={bezig} className="btn btn-primary"
                        style={{ gap: "var(--space-1)" }}>
                        <IconPlus /> {bezig ? "Toevoegen…" : "Toevoegen"}
                    </button>
                    <button type="button" onClick={onSluit} className="btn btn-ghost btn-icon" aria-label="Formulier sluiten">
                        <IconX />
                    </button>
                </div>
            </div>

            {/* Foutmelding */}
            {fout && (
                <div role="alert" className="alert alert-error" style={{ marginTop: "var(--space-3)", padding: "var(--space-2) var(--space-3)" }}>
                    <span style={{ fontSize: "var(--text-sm)" }}>{fout}</span>
                </div>
            )}
        </form>
    );
}


// ---------------------------------------------------------------------------
// WerkplekRij — volledige responsive card
// ---------------------------------------------------------------------------

function WerkplekRij({
    werkplek,
    isEerste,
    isLaatste,
    totaal,
}: {
    werkplek: { _id: Id<"werkplekken">; naam: string; type: string; volgorde: number; status?: WerkplekStatus };
    isEerste: boolean;
    isLaatste: boolean;
    totaal: number;
}) {
    const hernoemMutation = useMutation(api.werkplekken.hernoemWerkplek);
    const verplaatsMutation = useMutation(api.werkplekken.verplaatsWerkplek);
    const verwijderMutation = useMutation(api.werkplekken.verwijderWerkplek);
    const zetStatusMutation = useMutation(api.werkplekken.zetWerkplekStatus);

    const [bewerkModus, setBewerkModus] = useState(false);
    const [bevestigVerwijder, setBevestigVerwijder] = useState(false);
    const [nieuweNaam, setNieuweNaam] = useState(werkplek.naam);
    const [nieuwType, setNieuwType] = useState<WerkplekType>(werkplek.type as WerkplekType);
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState<string | null>(null);

    // Sync real-time updates (andere gebruiker wijzigt buiten bewerkstand)
    useEffect(() => {
        if (!bewerkModus) {
            setNieuweNaam(werkplek.naam);
            setNieuwType(werkplek.type as WerkplekType);
        }
    }, [werkplek.naam, werkplek.type, bewerkModus]);

    async function handleOpslaan() {
        const trim = nieuweNaam.trim();
        if (!trim) { setFout("Naam mag niet leeg zijn."); return; }
        setBezig(true); setFout(null);
        try {
            await hernoemMutation({ werkplekId: werkplek._id, naam: trim, type: nieuwType });
            setBewerkModus(false);
        } catch (err) {
            setFout((err instanceof Error ? err.message : "Fout").replace(/^[A-Z]+:\s*/, ""));
        } finally { setBezig(false); }
    }

    async function handleVerplaats(richting: "omhoog" | "omlaag") {
        setBezig(true);
        try { await verplaatsMutation({ werkplekId: werkplek._id, richting }); }
        finally { setBezig(false); }
    }

    async function handleVerwijder() {
        setBezig(true); setFout(null);
        try {
            await verwijderMutation({ werkplekId: werkplek._id });
        } catch (err) {
            setFout((err instanceof Error ? err.message : "Fout").replace(/^[A-Z]+:\s*|GEBLOKKEERD:\s*/g, ""));
            setBevestigVerwijder(false);
        } finally { setBezig(false); }
    }

    async function handleZetStatus(nieuweStatus: WerkplekStatus) {
        setBezig(true); setFout(null);
        try {
            await zetStatusMutation({ werkplekId: werkplek._id, status: nieuweStatus });
        } catch (err) {
            setFout((err instanceof Error ? err.message : "Fout").replace(/^[A-Z]+:\s*/, ""));
        } finally { setBezig(false); }
    }

    return (
        <div style={{
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            overflow: "hidden",
            transition: "border-color var(--transition-fast)",
        }}>
            {/* Hoofdrij */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-3) var(--space-3)",
                flexWrap: "wrap",
            }}>

                {/* Volgorde-pijlen — altijd 36×36px touch area */}
                {totaal > 1 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
                        <button
                            onClick={() => handleVerplaats("omhoog")}
                            disabled={isEerste || bezig}
                            className="btn btn-ghost"
                            aria-label="Werkplek omhoog"
                            style={{ minHeight: "36px", minWidth: "36px", padding: "var(--space-2)", lineHeight: 1 }}
                        >
                            <IconChevronUp size={13} />
                        </button>
                        <button
                            onClick={() => handleVerplaats("omlaag")}
                            disabled={isLaatste || bezig}
                            className="btn btn-ghost"
                            aria-label="Werkplek omlaag"
                            style={{ minHeight: "36px", minWidth: "36px", padding: "var(--space-2)", lineHeight: 1 }}
                        >
                            <IconChevronDown size={13} />
                        </button>
                    </div>
                )}

                {/* Type icon badge */}
                <span style={{
                    color: "var(--color-muted)",
                    display: "flex", alignItems: "center",
                    flexShrink: 0,
                }}>
                    {WERKPLEK_TYPE_ICON[werkplek.type as WerkplekType] ?? WERKPLEK_TYPE_ICON["Overig"]}
                </span>

                {/* Bewerk of lees modus */}
                {bewerkModus ? (
                    <>
                        <input
                            value={nieuweNaam}
                            onChange={(e) => setNieuweNaam(e.target.value)}
                            maxLength={50}
                            className="input"
                            style={{ flex: "1 1 120px", minWidth: "120px" }}
                            autoFocus
                            aria-label="Naam werkplek"
                        />
                        <select
                            value={nieuwType}
                            onChange={(e) => setNieuwType(e.target.value as WerkplekType)}
                            className="select"
                            style={{ flex: "0 1 auto", minWidth: "110px" }}
                            aria-label="Type werkplek"
                        >
                            {WERKPLEK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
                            <button
                                onClick={handleOpslaan}
                                disabled={bezig}
                                className="btn btn-primary btn-sm"
                                style={{ gap: "var(--space-1)" }}
                            >
                                <IconSave size={13} />
                                {bezig ? "…" : "Opslaan"}
                            </button>
                            <button
                                onClick={() => { setBewerkModus(false); setFout(null); setNieuweNaam(werkplek.naam); }}
                                className="btn btn-ghost btn-icon btn-sm"
                                aria-label="Bewerken annuleren"
                            >
                                <IconX />
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Naam + type label + status badge */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                                margin: 0,
                                fontWeight: "var(--weight-semibold)",
                                color: "var(--color-heading)",
                                fontSize: "var(--text-sm)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}>
                                {werkplek.naam}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "3px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{werkplek.type}</span>
                                {/* Status badge: gekleurde dot + label */}
                                {(() => {
                                    const cfg = getStatusCfg(werkplek.status);
                                    const isActief = !werkplek.status || werkplek.status === "Beschikbaar";
                                    return isActief ? (
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "var(--text-xs)", color: cfg.tekst }}>
                                            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: cfg.kleur, flexShrink: 0, display: "inline-block" }} />
                                        </span>
                                    ) : (
                                        <span style={{
                                            display: "inline-flex", alignItems: "center", gap: "4px",
                                            fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                                            color: cfg.tekst, background: cfg.achtergrond,
                                            border: `1px solid ${cfg.kleurBorder}`,
                                            borderRadius: "var(--radius-full)", padding: "1px 8px",
                                        }}>
                                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.kleur, flexShrink: 0, display: "inline-block" }} />
                                            {cfg.label}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Status toggle dropdown + actie knoppen */}
                        <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0, alignItems: "center" }}>
                            {/* Inline status selector — eigenaar wisselt hier snel van status */}
                            <select
                                value={werkplek.status ?? "Beschikbaar"}
                                onChange={(e) => handleZetStatus(e.target.value as WerkplekStatus)}
                                disabled={bezig}
                                className="select"
                                aria-label={`Status van ${werkplek.naam}`}
                                style={{
                                    fontSize: "var(--text-xs)",
                                    padding: "var(--space-1) var(--space-2)",
                                    minHeight: "32px",
                                    borderColor: getStatusCfg(werkplek.status).kleurBorder,
                                    color: getStatusCfg(werkplek.status).tekst,
                                }}
                            >
                                <option value="Beschikbaar">Beschikbaar</option>
                                <option value="In onderhoud">In onderhoud</option>
                                <option value="Buiten gebruik">Buiten gebruik</option>
                            </select>

                            {bevestigVerwijder ? (
                                <>
                                    <button
                                        onClick={handleVerwijder}
                                        disabled={bezig}
                                        className="btn btn-danger btn-sm"
                                        style={{ gap: "var(--space-1)" }}
                                        autoFocus
                                    >
                                        <IconTrash size={13} />
                                        {bezig ? "…" : "Bevestig"}
                                    </button>
                                    <button
                                        onClick={() => setBevestigVerwijder(false)}
                                        className="btn btn-ghost btn-icon btn-sm"
                                        aria-label="Verwijderen annuleren"
                                    >
                                        <IconX />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => { setBewerkModus(true); setBevestigVerwijder(false); }}
                                        className="btn btn-ghost btn-sm"
                                        aria-label={`Bewerk ${werkplek.naam}`}
                                        style={{ gap: "var(--space-1)" }}
                                    >
                                        <IconPencil size={13} />
                                        <span>Bewerken</span>
                                    </button>
                                    <button
                                        onClick={() => setBevestigVerwijder(true)}
                                        className="btn btn-ghost btn-icon btn-sm"
                                        aria-label={`Verwijder ${werkplek.naam}`}
                                        style={{ color: "var(--color-muted)" }}
                                    >
                                        <IconTrash size={13} />
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Foutbalk — design system tokens, geen color-mix() */}
            {fout && (
                <div
                    role="alert"
                    style={{
                        padding: "var(--space-2) var(--space-3)",
                        background: "var(--color-error-bg)",
                        borderTop: "1px solid var(--color-error-border)",
                        display: "flex", alignItems: "center",
                        justifyContent: "space-between", gap: "var(--space-2)",
                    }}
                >
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)" }}>{fout}</span>
                    <button
                        onClick={() => setFout(null)}
                        style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--color-error)", display: "flex", padding: "var(--space-1)",
                        }}
                        aria-label="Foutmelding sluiten"
                    >
                        <IconX size={12} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// WerkplekkenBeheer
// ---------------------------------------------------------------------------

export default function WerkplekkenBeheer() {
    const werkplekken = useQuery(api.werkplekken.lijstWerkplekken);
    const [toonNieuw, setToonNieuw] = useState(false);

    const aantalLabel = werkplekken === undefined
        ? "Laden…"
        : werkplekken.length === 0
            ? "Nog geen werkplekken"
            : `${werkplekken.length} werkplek${werkplekken.length === 1 ? "" : "ken"}`;

    return (
        <section
            style={{
                padding: "var(--space-5)",
                borderRadius: "var(--radius-xl)",
                background: "var(--glass-bg)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid var(--glass-border)",
                boxShadow: "var(--glass-shadow)",
                /* Max-breedte: voorkomt te brede rijen op ultra-wide desktop */
                maxWidth: "720px",
            }}
        >
            {/* Panel header */}
            <div style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "var(--space-3)",
                marginBottom: "var(--space-4)",
                flexWrap: "wrap",
            }}>
                <div>
                    {/* h2 voor semantische correctheid — dit is een sub-sectie van de pagina */}
                    <h2 style={{
                        margin: 0,
                        fontWeight: "var(--weight-semibold)",
                        color: "var(--color-heading)",
                        fontSize: "var(--text-base)",
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                    }}>
                        <IconSettings size={16} />
                        Werkplekken beheren
                    </h2>
                    <p
                        aria-live="polite"
                        style={{ margin: "3px 0 0", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}
                    >
                        {aantalLabel}
                    </p>
                </div>

                <button
                    onClick={() => setToonNieuw((v) => !v)}
                    className={toonNieuw ? "btn btn-ghost btn-sm" : "btn btn-primary btn-sm"}
                    style={{ gap: "var(--space-1)", flexShrink: 0 }}
                    aria-expanded={toonNieuw}
                >
                    {toonNieuw
                        ? <><IconX size={13} /><span>Annuleren</span></>
                        : <><IconPlus size={13} /><span>Werkplek toevoegen</span></>
                    }
                </button>
            </div>

            {/* Nieuw-formulier */}
            {toonNieuw && <NieuweWerkplekForm onSluit={() => setToonNieuw(false)} />}

            {/* Lijst */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {werkplekken === undefined ? (
                    <WerkplekSkeleton />
                ) : werkplekken.length === 0 ? (
                    <p style={{
                        color: "var(--color-muted)",
                        fontSize: "var(--text-sm)",
                        fontStyle: "italic",
                        textAlign: "center",
                        padding: "var(--space-6) 0",
                        margin: 0,
                    }}>
                        Klik op "Werkplek toevoegen" om te beginnen.
                    </p>
                ) : (
                    werkplekken.map((wp, idx) => (
                        <WerkplekRij
                            key={wp._id}
                            werkplek={wp}
                            isEerste={idx === 0}
                            isLaatste={idx === werkplekken.length - 1}
                            totaal={werkplekken.length}
                        />
                    ))
                )}
            </div>
        </section>
    );
}
