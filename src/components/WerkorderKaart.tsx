/**
 * src/components/WerkorderKaart.tsx
 *
 * Het werkorder-kaartje op het Werkplaatsbord.
 *
 * UX verbeteringen t.o.v. v1:
 *   • Gap 2: Één "→ Verplaatsen" knop opent een inline action sheet met
 *            grote tiles per werkplek. Van 4 kleine knoppen naar 1 grote.
 *   • Gap 3: "⏳ Wacht op onderdelen" snelknop met inline notitie-invoer,
 *            rechtstreeks vanuit de kaart (gecombineerde mutatie).
 *   • Gap 4: Initialen-avatar in gekleurde cirkel — deterministisch op naam,
 *            geen foto-opslag nodig.
 *   • Gap 5: "✅ Afsluiten" knop voor balie+ — opent WerkorderAfsluitenModal.
 *
 * Tablet-first: alle interactieve elementen minstens 48px hoog.
 */

import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import type { WerkorderVerrijkt, WerkplekDoc } from "../hooks/useWerkplaats";
import { useVerplaatsNaarWerkplek, useUpdateStatus } from "../hooks/useWerkplaats";
import type { DomeinRol } from "../../convex/helpers";
import WerkorderAfsluitenModal from "./WerkorderAfsluitenModal";
import WerkorderDetailModal from "./modals/WerkorderDetailModal";

// ---------------------------------------------------------------------------
// Avatar helpers
// ---------------------------------------------------------------------------

const AVATAR_KLEUREN = [
    "#0d7a5f", "#2563eb", "#d97706", "#dc2626",
    "#0891b2", "#65a30d", "#9333ea", "#db2777",
];

function avatarInitialen(naam: string): string {
    const delen = naam.trim().split(/\s+/);
    if (delen.length === 1) return delen[0].slice(0, 2).toUpperCase();
    return (delen[0][0] + delen[delen.length - 1][0]).toUpperCase();
}

function avatarKleur(naam: string): string {
    let hash = 0;
    for (const c of naam) hash = (hash + c.charCodeAt(0)) % AVATAR_KLEUREN.length;
    return AVATAR_KLEUREN[hash];
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, {
    label: string;
    accentKleur: string;
    badgeBg: string;
    badgeBorder: string;
    badgeTekst: string;
}> = {
    // ── Vóór binnenkomst ───────────────────────────────────────────────────
    "Gepland": {
        label: "📅 Gepland",
        accentKleur: "#8b5cf6",
        badgeBg: "#f5f3ff",
        badgeBorder: "#c4b5fd",
        badgeTekst: "#5b21b6",
    },
    "Aanwezig": {
        label: "🏁 Aanwezig",
        accentKleur: "#0891b2",
        badgeBg: "#ecfeff",
        badgeBorder: "#67e8f9",
        badgeTekst: "#164e63",
    },
    // ── In behandeling ─────────────────────────────────────────────────────
    "Wachtend": {
        label: "Wachtend",
        accentKleur: "#6b7280",
        badgeBg: "var(--color-surface)",
        badgeBorder: "var(--color-border)",
        badgeTekst: "var(--color-muted)",
    },
    "Bezig": {
        label: "🔧 Bezig",
        accentKleur: "#f59e0b",
        badgeBg: "#fffbeb",
        badgeBorder: "#fcd34d",
        badgeTekst: "#92400e",
    },
    "Wacht op onderdelen": {
        label: "⏳ Wacht op onderdelen",
        accentKleur: "#3b82f6",
        badgeBg: "#eff6ff",
        badgeBorder: "#93c5fd",
        badgeTekst: "#1e3a5f",
    },
    // ── Afgerond ──────────────────────────────────────────────────────────
    "Klaar": {
        label: "✅ Klaar",
        accentKleur: "#22c55e",
        badgeBg: "#f0fdf4",
        badgeBorder: "#86efac",
        badgeTekst: "#14532d",
    },
    "Afgerond": {
        label: "🏆 Afgerond",
        accentKleur: "#16a34a",
        badgeBg: "#f0fdf4",
        badgeBorder: "#4ade80",
        badgeTekst: "#14532d",
    },
    "Geannuleerd": {
        label: "🚫 Geannuleerd",
        accentKleur: "#dc2626",
        badgeBg: "#fef2f2",
        badgeBorder: "#fca5a5",
        badgeTekst: "#7f1d1d",
    },
} as const;

// Veilige getter — onbekende status krijgt een neutrale config
function getStatusCfg(status: string) {
    return STATUS_CONFIG[status] ?? {
        label: status,
        accentKleur: "#6b7280",
        badgeBg: "var(--color-surface)",
        badgeBorder: "var(--color-border)",
        badgeTekst: "var(--color-muted)",
    };
}

// ---------------------------------------------------------------------------
// WerkorderKaart
// ---------------------------------------------------------------------------

interface WerkorderKaartProps {
    order: WerkorderVerrijkt;
    werkplekken: WerkplekDoc[];
    domeinRol: DomeinRol | null;
    onOpenLogboek: (orderId: Id<"werkorders">) => void;
}

export default function WerkorderKaart({
    order,
    werkplekken,
    domeinRol,
    onOpenLogboek,
}: WerkorderKaartProps) {
    // UI state
    const [toonVerplaatsSheet, setToonVerplaatsSheet] = useState(false);
    const [toonWachtInput, setToonWachtInput] = useState(false);
    const [wachtNotitie, setWachtNotitie] = useState("");
    const [toonAfsluitenModal, setToonAfsluitenModal] = useState(false);
    const [toonDetail, setToonDetail] = useState(false);
    const [bezig, setBezig] = useState(false);

    // Mutations
    const verplaats = useVerplaatsNaarWerkplek();
    const updateStatus = useUpdateStatus();

    // Role gates
    const isMonteur = domeinRol === "monteur" || domeinRol === "balie" || domeinRol === "eigenaar";
    const isBalie = domeinRol === "balie" || domeinRol === "eigenaar";

    const statusCfg = getStatusCfg(order.status);
    const beschikbarePlekken = werkplekken.filter((p) => p._id !== order.werkplekId);

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------

    async function handleVerplaats(werkplekId: Id<"werkplekken"> | undefined) {
        setBezig(true);
        setToonVerplaatsSheet(false);
        try {
            await verplaats({
                werkorderId: order._id,
                werkplekId,
                // Als order Gepland/Aanwezig was en op brug gezet wordt → Bezig
                // Als terug naar buiten → Wachtend
                nieuweStatus: werkplekId ? "Bezig" : "Wachtend",
            });
        } finally {
            setBezig(false);
        }
    }

    // Gepland → Aanwezig (balie+): klant is er — zet auto als aanwezig op terrein
    async function handleAanwezig() {
        setBezig(true);
        try {
            await updateStatus({
                werkorderId: order._id,
                nieuweStatus: "Aanwezig",
                notitie: "Auto aanwezig op terrein",
            });
        } finally {
            setBezig(false);
        }
    }

    // Aanwezig → Wachtend (balie+): auto staat op het terrein, klaar voor de brug
    async function handleNaarWachtend() {
        setBezig(true);
        try {
            await updateStatus({
                werkorderId: order._id,
                nieuweStatus: "Wachtend",
                notitie: "Auto klaargezet voor brug",
            });
        } finally {
            setBezig(false);
        }
    }

    // Geannuleerd (balie+): afspraak ongedaan gemaakt
    async function handleGeannuleerd() {
        if (!window.confirm(`Werkorder voor ${order.voertuig?.kenteken ?? "dit voertuig"} annuleren? Dit kan niet ongedaan worden gemaakt.`)) return;
        setBezig(true);
        try {
            await updateStatus({
                werkorderId: order._id,
                nieuweStatus: "Geannuleerd",
                notitie: "Geannuleerd door balie",
            });
        } finally {
            setBezig(false);
        }
    }
    // Wacht op onderdelen snelactie (monteur+)
    async function handleWachtOpOnderdelen() {
        setBezig(true);
        setToonWachtInput(false);
        try {
            await updateStatus({
                werkorderId: order._id,
                nieuweStatus: "Wacht op onderdelen",
                notitie: wachtNotitie.trim() || undefined,
            });
            setWachtNotitie("");
        } finally {
            setBezig(false);
        }
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <>
            <div
                style={{
                    borderRadius: "var(--radius-xl)",
                    background: "var(--glass-bg)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: `1px solid ${statusCfg.accentKleur}44`,
                    boxShadow: "var(--glass-shadow)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-3)",
                    position: "relative",
                    overflow: "hidden",
                    transition: "border-color var(--transition-base)",
                }}
            >
                {/* Accent streep boven */}
                <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "3px",
                    background: statusCfg.accentKleur,
                }} />

                {/* === Klikbare kaart-inhoud (balie+ → detail modal) === */}
                <div
                    style={{ padding: "calc(var(--space-4) + 3px) var(--space-4) 0", cursor: isBalie ? "pointer" : "default" }}
                    onClick={isBalie ? () => setToonDetail(true) : undefined}
                    role={isBalie ? "button" : undefined}
                    aria-label={isBalie ? `Werkorder details ${order.voertuig?.kenteken ?? ""}` : undefined}
                    tabIndex={isBalie ? 0 : undefined}
                    onKeyDown={isBalie ? (e) => { if (e.key === "Enter" || e.key === " ") setToonDetail(true); } : undefined}
                >

                    {/* 1. Kenteken + Status badge */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-2)", flexWrap: "wrap" }}>
                        <span
                            style={{
                                fontFamily: "var(--font-mono)",
                                fontWeight: 900,
                                fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
                                letterSpacing: "0.08em",
                                color: "var(--color-heading)",
                                background: "var(--gradient-accent-subtle)",
                                border: "2px solid var(--color-border-luminous)",
                                borderRadius: "var(--radius-md)",
                                padding: "0.1em 0.4em",
                                lineHeight: 1.2,
                            }}
                            aria-label={`Kenteken ${order.voertuig?.kenteken ?? "onbekend"}`}
                        >
                            {order.voertuig?.kenteken ?? "—"}
                        </span>

                        <span style={{
                            fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)",
                            color: statusCfg.badgeTekst, background: statusCfg.badgeBg,
                            border: `1px solid ${statusCfg.badgeBorder}`,
                            borderRadius: "var(--radius-full, 9999px)",
                            padding: "0.2em 0.65em", whiteSpace: "nowrap", marginTop: "4px",
                        }}>
                            {statusCfg.label}
                        </span>
                    </div>

                    {/* 2. Merk + Model */}
                    <p style={{ color: "var(--color-heading)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", margin: "var(--space-2) 0 0", lineHeight: 1.3 }}>
                        {order.voertuig ? `${order.voertuig.merk} ${order.voertuig.model}` : "Voertuig onbekend"}
                    </p>

                    {/* 3. Klacht — rood block */}
                    <div style={{
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)", marginTop: "var(--space-2)",
                    }}>
                        <p style={{ color: "#dc2626", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", margin: 0, lineHeight: 1.4 }}>
                            🔴 {order.klacht}
                        </p>
                    </div>

                    {/* 4. Afsprakendatum + Monteur */}
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-2)", flexWrap: "wrap" }}>
                        {/* Afsprakendatum */}
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            📅 {new Date(order.afspraakDatum).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
                        </span>

                        {/* Monteur avatar + naam */}
                        {order.monteur ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                <span
                                    aria-label={`Monteur: ${order.monteur.naam}`}
                                    style={{
                                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                                        width: "24px", height: "24px", borderRadius: "50%",
                                        background: avatarKleur(order.monteur.naam),
                                        color: "#fff", fontSize: "10px", fontWeight: 700,
                                        flexShrink: 0, letterSpacing: "0.03em",
                                    }}
                                >
                                    {avatarInitialen(order.monteur.naam)}
                                </span>
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                    {order.monteur.naam}
                                </span>
                            </div>
                        ) : (
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", fontStyle: "italic" }}>
                                Geen monteur
                            </span>
                        )}
                    </div>
                </div>

                {/* Actiezone — stopPropagation zodat klik hier NIET de detail modal opent */}
                {isMonteur && (
                    <div
                        style={{ padding: "0 var(--space-4) var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
                        onClick={(e) => e.stopPropagation()}
                    >

                        {/* Rij 1: Verplaatsen + Wacht op onderdelen + Logboek */}
                        <div style={{ display: "flex", gap: "var(--space-2)" }}>
                            {/* Bug 2 fix: Verplaats-knop NIET bij eindstatussen */}
                            {!["Klaar", "Afgerond", "Geannuleerd"].includes(order.status) && (
                                <button
                                    onClick={() => { setToonVerplaatsSheet(!toonVerplaatsSheet); setToonWachtInput(false); }}
                                    disabled={bezig}
                                    className="btn btn-primary btn-sm"
                                    aria-expanded={toonVerplaatsSheet}
                                    aria-label="Verplaatsen"
                                    style={{ flex: 1, minHeight: "48px", fontSize: "var(--text-sm)" }}
                                >
                                    🚗 {toonVerplaatsSheet ? "Annuleren" : "Verplaatsen →"}
                                </button>
                            )}

                            {/* Wacht op onderdelen snelknop */}
                            {isMonteur && order.status === "Bezig" && (
                                <button
                                    onClick={() => { setToonWachtInput(!toonWachtInput); setToonVerplaatsSheet(false); }}
                                    disabled={bezig}
                                    className="btn btn-ghost btn-sm"
                                    title="Wacht op onderdelen"
                                    aria-label="Wacht op onderdelen"
                                    style={{ minHeight: "48px", minWidth: "48px", padding: "0 var(--space-2)", fontSize: "1em" }}
                                >
                                    ⏳
                                </button>
                            )}

                            {/* Logboek */}
                            <button
                                onClick={() => onOpenLogboek(order._id)}
                                className="btn btn-ghost btn-sm"
                                title="Logboek bekijken"
                                aria-label="Logboek bekijken"
                                style={{ minHeight: "48px", minWidth: "48px", padding: "0 var(--space-2)", fontSize: "1em" }}
                            >
                                📋
                            </button>
                        </div>

                        {/* Bug 3 fix: Gepland → Aanwezig knop (balie+) */}
                        {isBalie && order.status === "Gepland" && (
                            <button
                                onClick={handleAanwezig}
                                disabled={bezig}
                                className="btn btn-sm"
                                aria-label="Markeer als aanwezig"
                                style={{
                                    minHeight: "48px", width: "100%",
                                    background: "linear-gradient(135deg, #0891b2, #0e7490)",
                                    color: "#fff", border: "none",
                                    borderRadius: "var(--radius-md)", fontWeight: "var(--weight-semibold)",
                                    fontSize: "var(--text-sm)", cursor: "pointer",
                                }}
                            >
                                {bezig ? "…" : "🏁 Auto aanwezig"}
                            </button>
                        )}

                        {/* Aanwezig → Wachtend knop (balie+) */}
                        {isBalie && order.status === "Aanwezig" && (
                            <button
                                onClick={handleNaarWachtend}
                                disabled={bezig}
                                className="btn btn-ghost btn-sm"
                                aria-label="Klaarzetten voor brug"
                                style={{
                                    minHeight: "48px", width: "100%",
                                    fontWeight: "var(--weight-semibold)",
                                    fontSize: "var(--text-sm)",
                                }}
                            >
                                {bezig ? "…" : "⏩ Klaarzetten voor brug"}
                            </button>
                        )}

                        {/* Afsluiten (balie+, alleen als Klaar) */}
                        {isBalie && order.status === "Klaar" && (
                            <button
                                onClick={() => setToonAfsluitenModal(true)}
                                className="btn btn-sm"
                                style={{
                                    minHeight: "48px", width: "100%",
                                    background: "linear-gradient(135deg,#16a34a,#15803d)",
                                    color: "#fff", border: "none",
                                    borderRadius: "var(--radius-md)", fontWeight: "var(--weight-semibold)",
                                    fontSize: "var(--text-sm)", cursor: "pointer",
                                }}
                                aria-label="Werkorder definitief afsluiten"
                            >
                                ✅ Auto klaar — Doorsturen
                            </button>
                        )}

                        {/* Bug 4 fix: Geannuleerd-knop (balie+, niet bij eindstatussen) */}
                        {isBalie && !["Klaar", "Afgerond", "Geannuleerd"].includes(order.status) && (
                            <button
                                onClick={handleGeannuleerd}
                                disabled={bezig}
                                className="btn btn-ghost btn-sm"
                                aria-label="Werkorder annuleren"
                                style={{
                                    minHeight: "40px",
                                    width: "100%",
                                    color: "var(--color-error, #dc2626)",
                                    fontSize: "var(--text-xs)",
                                    fontWeight: "var(--weight-semibold)",
                                    borderColor: "rgba(220,38,38,0.3)",
                                }}
                            >
                                {bezig ? "…" : "🚫 Afspraak annuleren"}
                            </button>
                        )}

                        {/* Inline action sheet: werkplek tiles */}
                        {toonVerplaatsSheet && (
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "var(--space-2)",
                                padding: "var(--space-3)",
                                borderRadius: "var(--radius-lg)",
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                            }}>
                                {beschikbarePlekken.map((plek) => (
                                    <button
                                        key={plek._id}
                                        onClick={() => handleVerplaats(plek._id)}
                                        disabled={bezig}
                                        style={{
                                            minHeight: "56px", borderRadius: "var(--radius-md)",
                                            border: "1px solid var(--color-border)",
                                            background: "var(--glass-bg)",
                                            color: "var(--color-heading)", cursor: "pointer",
                                            fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)",
                                            display: "flex", flexDirection: "column",
                                            alignItems: "center", justifyContent: "center", gap: "2px",
                                            transition: "background var(--transition-base), border-color var(--transition-base)",
                                        }}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-primary, #0d7a5f)"; }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; }}
                                        aria-label={`Verplaats naar ${plek.naam}`}
                                    >
                                        <span style={{ fontSize: "1.3em" }}>
                                            {{ Brug: "🔩", Uitlijnbrug: "📐", Wasplaats: "🚿", Buiten: "🅿️", Overig: "🔲" }[plek.type] ?? "🔲"}
                                        </span>
                                        <span style={{ fontSize: "var(--text-xs)" }}>{plek.naam}</span>
                                    </button>
                                ))}

                                {/* Terugplaatsen naar buiten */}
                                {order.werkplekId && (
                                    <button
                                        onClick={() => handleVerplaats(undefined)}
                                        disabled={bezig}
                                        style={{
                                            minHeight: "56px", borderRadius: "var(--radius-md)",
                                            border: "1px dashed var(--color-border)",
                                            background: "transparent", color: "var(--color-muted)",
                                            cursor: "pointer", fontSize: "var(--text-xs)",
                                            fontWeight: "var(--weight-semibold)",
                                            display: "flex", flexDirection: "column",
                                            alignItems: "center", justifyContent: "center", gap: "2px",
                                        }}
                                        aria-label="Terug naar Wachtend / Buiten"
                                    >
                                        <span style={{ fontSize: "1.3em" }}>⬅️</span>
                                        <span>Buiten</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Inline wacht-op-onderdelen notitie-invoer */}
                        {toonWachtInput && (
                            <div style={{
                                display: "flex", flexDirection: "column", gap: "var(--space-2)",
                                padding: "var(--space-3)", borderRadius: "var(--radius-lg)",
                                background: "#eff6ff", border: "1px solid #93c5fd",
                            }}>
                                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "#1e3a5f", fontWeight: "var(--weight-semibold)" }}>
                                    ⏳ Wacht op onderdelen — voeg een notitie toe:
                                </p>
                                <input
                                    type="text"
                                    value={wachtNotitie}
                                    onChange={(e) => setWachtNotitie(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleWachtOpOnderdelen(); }}
                                    placeholder="bijv. Draagarmrubber bestellen bij Van Mossel"
                                    aria-label="Notitie voor wacht op onderdelen"
                                    style={{
                                        padding: "var(--space-2) var(--space-3)",
                                        borderRadius: "var(--radius-md)",
                                        border: "1px solid #93c5fd",
                                        background: "#fff",
                                        color: "#1e3a5f", fontSize: "var(--text-sm)",
                                        minHeight: "44px",
                                    }}
                                    autoFocus
                                />
                                <button
                                    onClick={handleWachtOpOnderdelen}
                                    disabled={bezig}
                                    style={{
                                        minHeight: "44px", borderRadius: "var(--radius-md)",
                                        background: "#3b82f6", color: "#fff",
                                        border: "none", cursor: "pointer",
                                        fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)",
                                    }}
                                    aria-label="Bevestigen: wacht op onderdelen"
                                >
                                    {bezig ? "…" : "⏳ Bevestig — Wacht op onderdelen"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Afsluiten modal (buiten de card DOM — geen z-index problemen) */}
            {toonAfsluitenModal && (
                <WerkorderAfsluitenModal
                    werkorderId={order._id}
                    kenteken={order.voertuig?.kenteken ?? "—"}
                    klacht={order.klacht}
                    onSluit={() => setToonAfsluitenModal(false)}
                />
            )}

            {/* Detail modal — read-only, voor balie+ */}
            {toonDetail && (
                <WerkorderDetailModal
                    order={order}
                    onSluit={() => setToonDetail(false)}
                />
            )}
        </>
    );
}
