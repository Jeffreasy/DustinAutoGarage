/**
 * src/components/MedewerkersIsland.tsx
 *
 * React Island — Medewerkers Beheer (Split-Role strategie)
 *
 * Design: volledig design-system conform (design-tokens.css + components.css)
 *   - Gebruikt: .card, .card-header, .card-title, .input, .select, .label,
 *               .btn, .btn-primary, .btn-ghost, .btn-danger, .btn-full,
 *               .badge, .alert, .section-title, .form-group
 *   - Responsive: single-column mobiel, twee-kolom desktop (≥640px) via CSS grid
 *   - Form classes: .input, .select, .label (NIET form-input/form-select/form-label)
 *
 * Features:
 *   - Real-time lijst van alle medewerkers (Convex useQuery)
 *   - Cold-start: eigenaar-bootstrap of medewerker-koppeling
 *   - Uitnodiging formulier → POST /api/invite → LaventeCare /users/invite
 *   - Domeinrol wijzigen (eigenaar only in Convex)
 *   - Medewerker deactiveren / reaktiveren (eigenaar only)
 */

import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useRol, type DomeinRol } from "../../hooks/useRol";
import { LaventeConvexProvider } from "../providers/LaventeConvexProvider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IdentityRole = "admin" | "editor" | "user" | "viewer";

interface InviteResult {
    token: string;
    link: string;
}

// ---------------------------------------------------------------------------
// Domein rol helpers
// ---------------------------------------------------------------------------

const ROL_LABELS: Record<DomeinRol, string> = {
    eigenaar: "Eigenaar",
    balie: "Balie / Receptie",
    monteur: "Monteur",
    stagiair: "Stagiair",
};

/** CSS-kleur per domeinrol — op basis van design system primitieven */
const ROL_BADGE_BG: Record<DomeinRol, string> = {
    eigenaar: "var(--color-accent-dim)",
    balie: "rgba(96,165,250,0.12)",
    monteur: "rgba(148,163,184,0.10)",
    stagiair: "rgba(250,204,21,0.10)",
};

const ROL_BADGE_COLOR: Record<DomeinRol, string> = {
    eigenaar: "var(--color-accent-text)",
    balie: "var(--primitive-blue-400, #60a5fa)",
    monteur: "var(--color-body)",
    stagiair: "var(--color-warning)",
};

// ---------------------------------------------------------------------------
// Sub-componenten
// ---------------------------------------------------------------------------

/** Pill-badge voor domeinrol weergave — design system conform */
function RolBadge({ rol }: { rol: DomeinRol }) {
    return (
        <span
            className="badge"
            style={{
                background: ROL_BADGE_BG[rol] ?? "var(--color-surface-3)",
                color: ROL_BADGE_COLOR[rol] ?? "var(--color-body)",
                border: "1px solid var(--color-border)",
            }}
        >
            {ROL_LABELS[rol] ?? rol}
        </span>
    );
}

/** Sectie-header met titel en optionele badge */
function SectieTitel({ children, badge }: { children: React.ReactNode; badge?: React.ReactNode }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
            <h2 className="section-title" style={{ margin: 0 }}>{children}</h2>
            {badge}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--space-3)",
                padding: "var(--space-16) var(--space-4)",
                color: "var(--color-muted)",
                fontSize: "var(--text-sm)",
            }}
        >
            <span
                aria-hidden="true"
                style={{
                    width: "var(--spinner-size)",
                    height: "var(--spinner-size)",
                    border: "2px solid currentColor",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.8s linear infinite",
                }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Profielen ophalen…
        </div>
    );
}

// ---------------------------------------------------------------------------
// Cold-Start Banner
// ---------------------------------------------------------------------------

/**
 * ColdStartBanner — toont wanneer de ingelogde gebruiker nog geen Convex-profiel heeft.
 *
 * Twee scenario's:
 *   1. Eerste login ooit (leeg systeem) → eigenaar bootstrappen
 *   2. Uitgenodigde medewerker (systeem bestaat al) → registreer als monteur (veilige default)
 */
function ColdStartBanner({ naam }: { naam: string }) {
    const { isAuthenticated } = useConvexAuth();
    const ensureEigenaar = useMutation(api.medewerkers.ensureEigenaar);
    const registreer = useMutation(api.medewerkers.registreerMedewerker);
    const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
    const [bericht, setBericht] = useState("");

    async function handleBootstrapEigenaar() {
        if (!isAuthenticated) return;
        setStatus("loading");
        try {
            const result = await ensureEigenaar({ naam });
            setStatus("ok");
            setBericht(
                result.created
                    ? "Eigenaar-profiel aangemaakt! De pagina ververst automatisch."
                    : result.reden ?? "Record bestond al."
            );
        } catch (err) {
            setStatus("error");
            setBericht(err instanceof Error ? err.message : "Onbekende fout");
        }
    }

    async function handleRegistreerAlsMedewerker() {
        if (!isAuthenticated) return;
        setStatus("loading");
        try {
            await registreer({ naam, domeinRol: "monteur" });
            setStatus("ok");
            setBericht("Profiel aangemaakt! De eigenaar kan je garage-functie nu aanpassen.");
        } catch (err) {
            setStatus("error");
            setBericht(err instanceof Error ? err.message : "Onbekende fout");
        }
    }

    if (status === "ok") {
        return (
            <div className="alert alert-success" role="status">
                ✅ {bericht}
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "540px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {/* Header */}
            <div style={{ textAlign: "center", padding: "var(--space-4) 0 var(--space-2)" }}>
                <div style={{ fontSize: "2.5rem", lineHeight: 1, marginBottom: "var(--space-3)" }}>👋</div>
                <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", margin: "0 0 var(--space-2)" }}>
                    Welkom bij de garage!
                </h2>
                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", margin: 0 }}>
                    Je account is nog niet gekoppeld. Kies hoe je wilt beginnen.
                </p>
            </div>

            {/* Foutmelding */}
            {status === "error" && (
                <div className="alert alert-error" role="alert">❌ {bericht}</div>
            )}

            {/* Verbindingsstatus */}
            {!isAuthenticated && (
                <div className="alert alert-info">⏳ Verbinding maken met Convex…</div>
            )}

            {/* Optie 1: eerste eigenaar */}
            <div className="card" style={{ borderColor: "var(--color-border-luminous)", background: "var(--color-accent-subtle)" }}>
                <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "var(--text-xl)", lineHeight: 1, flexShrink: 0 }}>🏪</span>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)", margin: "0 0 var(--space-1)" }}>
                            Ik ben de garage-eigenaar
                        </p>
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)", margin: "0 0 var(--space-4)" }}>
                            Start het systeem en registreer jezelf als eerste eigenaar van de garage.
                        </p>
                        <button
                            className="btn btn-primary btn-full"
                            onClick={handleBootstrapEigenaar}
                            disabled={status === "loading" || !isAuthenticated}
                            id="bootstrap-eigenaar-btn"
                        >
                            {status === "loading" ? "Bezig…" : "Registreer als eigenaar"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Optie 2: uitgenodigde medewerker */}
            <div className="card">
                <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "var(--text-xl)", lineHeight: 1, flexShrink: 0 }}>👷</span>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)", margin: "0 0 var(--space-1)" }}>
                            Ik ben uitgenodigd als medewerker
                        </p>
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)", margin: "0 0 var(--space-4)" }}>
                            Koppel je account aan de garage. De eigenaar wijst daarna je definitieve functie toe.
                        </p>
                        <button
                            className="btn btn-ghost btn-full"
                            onClick={handleRegistreerAlsMedewerker}
                            disabled={status === "loading" || !isAuthenticated}
                            id="registreer-medewerker-btn"
                        >
                            {status === "loading" ? "Bezig…" : "Koppel mijn account"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Invite formulier
// ---------------------------------------------------------------------------

function InviteFormulier({
    identityRole,
    isEigenaarDomein,
}: {
    identityRole: IdentityRole;
    isEigenaarDomein: boolean;
}) {
    const isAdmin = identityRole === "admin";
    const [email, setEmail] = useState("");
    const [identityRol, setIdentityRol] = useState<"user" | "editor" | "admin">("editor");
    const [domeinRolKeuze, setDomeinRolKeuze] = useState<DomeinRol>("monteur");
    const [naam, setNaam] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
    const [result, setResult] = useState<InviteResult | null>(null);
    const [fout, setFout] = useState("");

    // Geen pre-flight Convex record: inviteData.token is een LaventeCare invite-token
    // en heeft een ander formaat dan een Convex tokenIdentifier (issuer|sub).
    // De medewerker koppelt zichzelf via de cold-start banner na eerste login.

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        setStatus("loading");
        setFout("");
        setResult(null);

        try {
            const response = await fetch("/api/invite", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": document.cookie
                        .split("; ")
                        .find((c) => c.startsWith("csrf_token="))
                        ?.split("=")[1] ?? "",
                },
                body: JSON.stringify({ email, role: identityRol }),
                credentials: "include",
            });

            if (!response.ok) {
                const tekst = await response.text();
                throw new Error(tekst || `Status ${response.status}`);
            }

            const inviteData: InviteResult = await response.json();
            setResult(inviteData);
            setStatus("ok");
            setEmail("");
            setNaam("");
        } catch (err) {
            setStatus("error");
            setFout(err instanceof Error ? err.message : "Onbekende fout");
        }
    }

    return (
        <form onSubmit={handleInvite} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

            {/* Naam + E-mail */}
            <div className="form-group">
                <label htmlFor="invite-naam" className="label">Naam</label>
                <input
                    id="invite-naam"
                    type="text"
                    className="input"
                    value={naam}
                    onChange={(e) => setNaam(e.target.value)}
                    placeholder="Bijv. Jan de Vries"
                    required
                />
            </div>

            <div className="form-group">
                <label htmlFor="invite-email" className="label">E-mailadres</label>
                <input
                    id="invite-email"
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jan@example.com"
                    required
                />
            </div>

            {/* Twee selects — stapelt op mobiel, naast elkaar op ≥640px */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "var(--space-4)",
            }}>
                <style>{`
                    @media (min-width: 640px) {
                        .invite-selects-grid { grid-template-columns: 1fr 1fr !important; }
                    }
                `}</style>
                <div className="invite-selects-grid" style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: "var(--space-4)",
                }}>
                    <div className="form-group">
                        <label htmlFor="invite-identity-rol" className="label">
                            Platform-toegang (LaventeCare)
                        </label>
                        <select
                            id="invite-identity-rol"
                            className="select"
                            value={identityRol}
                            onChange={(e) => setIdentityRol(e.target.value as "user" | "editor" | "admin")}
                        >
                            <option value="user">Gebruiker — monteur / stagiair</option>
                            <option value="editor">Editor — balie / werkplaatschef</option>
                            {(isAdmin || isEigenaarDomein) && (
                                <option value="admin">Admin — mede-systeembeheerder</option>
                            )}
                        </select>
                        <p className="field-hint">Bepaalt toegang tot LaventeCare-beheer</p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="invite-domein-rol" className="label">
                            Garage-functie
                        </label>
                        <select
                            id="invite-domein-rol"
                            className="select"
                            value={domeinRolKeuze}
                            onChange={(e) => setDomeinRolKeuze(e.target.value as DomeinRol)}
                        >
                            {(isAdmin || isEigenaarDomein) && (
                                <option value="eigenaar">Eigenaar — volledig beheer</option>
                            )}
                            <option value="balie">Balie / Receptie</option>
                            <option value="monteur">Monteur</option>
                            <option value="stagiair">Stagiair</option>
                        </select>
                        <p className="field-hint">Bepaalt wat ze zien in de app</p>
                    </div>
                </div>
            </div>

            {/* Fout */}
            {fout && (
                <div className="alert alert-error" role="alert">❌ {fout}</div>
            )}

            {/* Succes */}
            {result && (
                <div className="alert alert-success" role="status">
                    <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: "var(--weight-semibold)", margin: "0 0 var(--space-2)" }}>✅ Uitnodiging aangemaakt!</p>
                        <p style={{ fontSize: "var(--text-xs)", margin: "0 0 var(--space-2)", color: "inherit", opacity: 0.8 }}>
                            Deel deze link met de medewerker:
                        </p>
                        <code style={{
                            display: "block",
                            padding: "var(--space-2) var(--space-3)",
                            background: "rgba(0,0,0,0.2)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "var(--text-xs)",
                            wordBreak: "break-all",
                            fontFamily: "var(--font-mono)",
                        }}>
                            {import.meta.env.PUBLIC_API_URL}{result.link}
                        </code>
                        <p style={{ fontSize: "var(--text-xs)", margin: "var(--space-2) 0 0", opacity: 0.8 }}>
                            Medewerker koppelt zich zelf na eerste login. Jij wijst daarna de functie{" "}
                            <strong>{ROL_LABELS[domeinRolKeuze]}</strong> toe.
                        </p>
                    </div>
                </div>
            )}

            <button
                type="submit"
                className="btn btn-primary"
                disabled={status === "loading"}
                id="invite-submit-btn"
                style={{ alignSelf: "flex-start" }}
            >
                {status === "loading" ? "Bezig met uitnodigen…" : "Uitnodiging versturen"}
            </button>
        </form>
    );
}

// ---------------------------------------------------------------------------
// Medewerker rij
// ---------------------------------------------------------------------------

function MedewerkerRij({
    medewerker,
    isActerendEigenaar,
    actueelProfielId,
}: {
    medewerker: {
        _id: Id<"medewerkers">;
        naam: string;
        domeinRol: string;
        actief: boolean;
    };
    isActerendEigenaar: boolean;
    actueelProfielId: Id<"medewerkers"> | undefined;
}) {
    const wijzig = useMutation(api.medewerkers.wijzigDomeinRol);
    const deactiveer = useMutation(api.medewerkers.deactiveerMedewerker);
    const aktiveer = useMutation(api.medewerkers.activeerMedewerker);
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState("");

    const isZichzelf = medewerker._id === actueelProfielId;

    async function handleRolWijziging(nieuweRol: DomeinRol) {
        setBezig(true); setFout("");
        try { await wijzig({ medewerkerId: medewerker._id, nieuweDomeinRol: nieuweRol }); }
        catch (err) { setFout(err instanceof Error ? err.message : "Fout"); }
        finally { setBezig(false); }
    }

    async function handleDeactiveer() {
        if (!confirm(`Weet je zeker dat je ${medewerker.naam} wilt deactiveren?`)) return;
        setBezig(true); setFout("");
        try { await deactiveer({ medewerkerId: medewerker._id }); }
        catch (err) { setFout(err instanceof Error ? err.message : "Fout"); }
        finally { setBezig(false); }
    }

    async function handleAktiveer() {
        setBezig(true); setFout("");
        try { await aktiveer({ medewerkerId: medewerker._id }); }
        catch (err) { setFout(err instanceof Error ? err.message : "Fout"); }
        finally { setBezig(false); }
    }

    return (
        <div
            className="card card-sm"
            style={{
                opacity: medewerker.actief ? 1 : 0.6,
                display: "flex",
                gap: "var(--space-3)",
                alignItems: "flex-start",
                flexWrap: "wrap",
            }}
        >
            {/* Avatar */}
            <div
                aria-hidden="true"
                style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "var(--radius-full)",
                    background: "var(--color-accent-dim)",
                    border: "1px solid var(--color-border-luminous)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "var(--weight-bold)",
                    fontSize: "var(--text-sm)",
                    color: "var(--color-accent-text)",
                    flexShrink: 0,
                }}
            >
                {medewerker.naam.charAt(0).toUpperCase()}
            </div>

            {/* Info + acties */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Naam + rol badge */}
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-2)" }}>
                    <span style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>
                        {medewerker.naam}
                    </span>
                    {isZichzelf && (
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>(jij)</span>
                    )}
                    <RolBadge rol={medewerker.domeinRol as DomeinRol} />
                    {!medewerker.actief && (
                        <span className="badge badge-warning">Gedeactiveerd</span>
                    )}
                </div>

                {/* Eigenaar-acties: rol wijzigen + deactiveren */}
                {isActerendEigenaar && !isZichzelf && (
                    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
                        <select
                            aria-label={`Wijzig garage-functie van ${medewerker.naam}`}
                            className="select"
                            style={{ width: "auto", minWidth: "160px", fontSize: "var(--text-xs)", minHeight: "var(--control-height-sm)" }}
                            value={medewerker.domeinRol}
                            onChange={(e) => handleRolWijziging(e.target.value as DomeinRol)}
                            disabled={bezig}
                        >
                            {(Object.keys(ROL_LABELS) as DomeinRol[]).map((rol) => (
                                <option key={rol} value={rol}>{ROL_LABELS[rol]}</option>
                            ))}
                        </select>

                        {medewerker.actief ? (
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={handleDeactiveer}
                                disabled={bezig}
                                aria-label={`Deactiveer ${medewerker.naam}`}
                            >
                                Deactiveer
                            </button>
                        ) : (
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={handleAktiveer}
                                disabled={bezig}
                                aria-label={`Heractiveer ${medewerker.naam}`}
                            >
                                Heractiveer
                            </button>
                        )}
                    </div>
                )}

                {/* Foutmelding */}
                {fout && (
                    <p role="alert" style={{ color: "var(--color-error)", fontSize: "var(--text-xs)", marginTop: "var(--space-2)" }}>
                        ❌ {fout}
                    </p>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Hoofd Island
// ---------------------------------------------------------------------------

function MedewerkersContent({ identityRole }: { identityRole: IdentityRole }) {
    const isAdmin = identityRole === "admin";
    const { isEigenaar, domeinRol, isLoading, isNietGekoppeld } = useRol();
    const profiel = useQuery(api.medewerkers.getMijnProfiel);
    const kanLijstZien = !isLoading && !isNietGekoppeld && (isEigenaar || domeinRol === "balie" || isAdmin);
    const alleMedewerkers = useQuery(
        api.medewerkers.listMedewerkers,
        kanLijstZien ? {} : "skip"
    );
    const medewerkers = kanLijstZien ? alleMedewerkers : null;

    if (isLoading) return <Spinner />;

    // Cold-start: no medewerker record yet
    if (isNietGekoppeld) {
        const naam =
            typeof window !== "undefined"
                ? (document.cookie
                    .split("; ")
                    .find((c) => c.startsWith("lc_name="))
                    ?.split("=")?.[1] ?? "") || "Medewerker"
                : "Medewerker";

        return <ColdStartBanner naam={decodeURIComponent(naam)} />;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>

            {/* ── Jouw profiel ──────────────────────────────────────────── */}
            {profiel && (
                <section aria-labelledby="jouw-profiel-heading">
                    <SectieTitel>Jouw profiel</SectieTitel>
                    <div className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
                        <div
                            aria-hidden="true"
                            style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "var(--radius-full)",
                                background: "var(--color-accent-dim)",
                                border: "1px solid var(--color-border-luminous)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "var(--weight-bold)",
                                fontSize: "var(--text-lg)",
                                color: "var(--color-accent-text)",
                                flexShrink: 0,
                            }}
                        >
                            {profiel.naam.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: "0 0 var(--space-1)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>
                                {profiel.naam}
                            </p>
                            <RolBadge rol={profiel.domeinRol as DomeinRol} />
                        </div>
                    </div>
                </section>
            )}

            {/* ── Medewerkers lijst (balie+) ─────────────────────────── */}
            {(isEigenaar || domeinRol === "balie") && (
                <section aria-labelledby="medewerkers-lijst-heading">
                    <SectieTitel>Alle medewerkers</SectieTitel>
                    {medewerkers == null ? (
                        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>Laden…</p>
                    ) : medewerkers.length === 0 ? (
                        <div className="empty-state" style={{ padding: "var(--space-10) var(--space-4)" }}>
                            <span className="empty-state-icon">👥</span>
                            <p className="empty-state-title">Geen medewerkers gevonden</p>
                            <p className="empty-state-desc">Nodig medewerkers uit via het formulier hieronder.</p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                            {medewerkers.map((m: { _id: import("../../../convex/_generated/dataModel").Id<"medewerkers">; naam: string; domeinRol: string; actief: boolean }) => (
                                <MedewerkerRij
                                    key={m._id}
                                    medewerker={m}
                                    isActerendEigenaar={isEigenaar}
                                    actueelProfielId={profiel?._id}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* ── Uitnodiging formulier ─────────────────────────────── */}
            {(isEigenaar || domeinRol === "balie" || isAdmin) && (
                <section aria-labelledby="invite-heading">
                    <SectieTitel
                        badge={
                            (isAdmin || isEigenaar) ? (
                                <span className="badge badge-accent">
                                    {isAdmin ? "admin-modus" : "eigenaar-modus"}
                                </span>
                            ) : undefined
                        }
                    >
                        Medewerker uitnodigen
                    </SectieTitel>
                    <div className="card">
                        <InviteFormulier identityRole={identityRole} isEigenaarDomein={isEigenaar} />
                    </div>
                </section>
            )}

            {/* ── Monteur / stagiair: geen beheer-opties ────────────── */}
            {!isEigenaar && domeinRol !== "balie" && (
                <div className="empty-state" style={{ padding: "var(--space-12) var(--space-4)" }}>
                    <span className="empty-state-icon">🔒</span>
                    <p className="empty-state-title">Beperkt toegang</p>
                    <p className="empty-state-desc">
                        Je bent ingelogd als <strong>{ROL_LABELS[domeinRol!] ?? domeinRol}</strong>.
                        Alleen balie-medewerkers en de eigenaar kunnen medewerkers beheren.
                    </p>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Default export — wraps in LaventeConvexProvider
// ---------------------------------------------------------------------------

export default function MedewerkersIsland({ identityRole }: { identityRole: IdentityRole }) {
    return (
        <LaventeConvexProvider>
            <MedewerkersContent identityRole={identityRole} />
        </LaventeConvexProvider>
    );
}
