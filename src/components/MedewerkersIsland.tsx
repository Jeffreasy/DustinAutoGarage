/**
 * src/components/MedewerkersIsland.tsx
 *
 * React Island — Medewerkers Beheer (Split-Role strategie)
 *
 * Features:
 *   - Real-time lijst van alle medewerkers (Convex useQuery)
 *   - Cold-start: eigenaar-bootstrap via ensureEigenaar
 *   - Uitnodiging formulier → POST /api/invite → LaventeCare /users/invite
 *   - Admin-only: admin uitnodigen + eigenaar domeinrol toewijzen
 *   - Domeinrol wijzigen (eigenaar only in Convex)
 *   - Medewerker deactiveren / reaktiveren (eigenaar only)
 *
 * Props:
 *   identityRole — LaventeCare identity-rol van de ingelogde gebruiker.
 *                  Doorgegeven vanuit medewerkers.astro (server-side).
 *                  Bepaalt welke invite-opties zichtbaar zijn.
 *
 * Dient gerenderd te worden binnen een LaventeConvexProvider context.
 */

import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useRol, type DomeinRol } from "../hooks/useRol";
import { LaventeConvexProvider } from "./LaventeConvexProvider";

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

const ROL_BADGE_COLORS: Record<DomeinRol, string> = {
    eigenaar: "#0d7a5f",   // teal-700
    balie: "#1a6fa3",      // sky-700
    monteur: "#5c5c8a",    // slate-600
    stagiair: "#7a5c1a",   // amber-700
};

// ---------------------------------------------------------------------------
// Sub-componenten
// ---------------------------------------------------------------------------

/** Pill-badge voor domeinrol weergave */
function RolBadge({ rol }: { rol: DomeinRol }) {
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 10px",
                borderRadius: "var(--radius-full, 9999px)",
                fontSize: "var(--text-xs, 0.75rem)",
                fontWeight: "600",
                color: "#fff",
                background: ROL_BADGE_COLORS[rol] ?? "var(--color-muted)",
                letterSpacing: "0.02em",
            }}
        >
            {ROL_LABELS[rol] ?? rol}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Cold-Start Banner
// ---------------------------------------------------------------------------

function ColdStartBanner({ naam }: { naam: string }) {
    const { isAuthenticated } = useConvexAuth();
    const ensureEigenaar = useMutation(api.medewerkers.ensureEigenaar);
    const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
    const [bericht, setBericht] = useState("");

    async function handleBootstrap() {
        if (!isAuthenticated) return;
        setStatus("loading");
        try {
            const result = await ensureEigenaar({ naam });
            if (result.created) {
                setStatus("ok");
                setBericht("Eigenaar-profiel aangemaakt! De pagina ververst automatisch.");
            } else {
                setStatus("ok");
                setBericht(result.reden ?? "Record bestond al.");
            }
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
        <div
            style={{
                padding: "var(--space-6)",
                borderRadius: "var(--radius-lg)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                textAlign: "center",
                maxWidth: "480px",
                margin: "0 auto",
            }}
        >
            <h2 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-2)" }}>
                👋 Welkom bij de garage!
            </h2>
            <p style={{ color: "var(--color-muted)", marginBottom: "var(--space-5)" }}>
                Er zijn nog geen medewerkers gekoppeld. Klik hieronder om jezelf
                als <strong>eigenaar</strong> te registreren en het systeem te starten.
            </p>

            {status === "error" && (
                <p style={{ color: "var(--color-error)", marginBottom: "var(--space-3)" }}>
                    ❌ {bericht}
                </p>
            )}

            {!isAuthenticated && (
                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>
                    ⏳ Sessie verbinden met Convex…
                </p>
            )}

            <button
                className="btn btn-primary"
                onClick={handleBootstrap}
                disabled={status === "loading" || !isAuthenticated}
                id="bootstrap-eigenaar-btn"
            >
                {!isAuthenticated
                    ? "Verbinding maken…"
                    : status === "loading"
                        ? "Bezig…"
                        : "Registreer als eigenaar"}
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Invite formulier
// ---------------------------------------------------------------------------

function InviteFormulier({ identityRole }: { identityRole: IdentityRole }) {
    const isAdmin = identityRole === "admin";
    const [email, setEmail] = useState("");
    const [identityRol, setIdentityRol] = useState<"user" | "editor" | "admin">("user");
    const [domeinRolKeuze, setDomeinRolKeuze] = useState<DomeinRol>("monteur");
    const [naam, setNaam] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
    const [result, setResult] = useState<InviteResult | null>(null);
    const [fout, setFout] = useState("");

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        setStatus("loading");
        setFout("");
        setResult(null);

        try {
            // Stap 1: LaventeCare uitnodiging aanmaken (identity)
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

            // Reset formulier
            setEmail("");
            setNaam("");
        } catch (err) {
            setStatus("error");
            setFout(err instanceof Error ? err.message : "Onbekende fout");
        }
    }

    return (
        <div
            style={{
                padding: "var(--space-5)",
                borderRadius: "var(--radius-lg)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
            }}
        >
            <h3 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-4)", fontWeight: 600 }}>
                Nieuwe medewerker uitnodigen
            </h3>

            <form onSubmit={handleInvite} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div>
                    <label htmlFor="invite-naam" className="form-label">Naam</label>
                    <input
                        id="invite-naam"
                        type="text"
                        className="form-input"
                        value={naam}
                        onChange={(e) => setNaam(e.target.value)}
                        placeholder="Bijv. Jan de Vries"
                        required
                        aria-label="Naam van de nieuwe medewerker"
                    />
                </div>

                <div>
                    <label htmlFor="invite-email" className="form-label">E-mailadres</label>
                    <input
                        id="invite-email"
                        type="email"
                        className="form-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jan@example.com"
                        required
                        aria-label="E-mailadres van de nieuwe medewerker"
                    />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                    <div>
                        <label htmlFor="invite-identity-rol" className="form-label">
                            Platform-toegang (LaventeCare)
                        </label>
                        <select
                            id="invite-identity-rol"
                            className="form-select"
                            value={identityRol}
                            onChange={(e) => setIdentityRol(e.target.value as "user" | "editor" | "admin")}
                            aria-label="LaventeCare identity rol"
                        >
                            <option value="user">Gebruiker (monteur / stagiair)</option>
                            <option value="editor">Editor (balie / werkplaatschef)</option>
                            {isAdmin && (
                                <option value="admin">Admin (mede-systeembeheerder)</option>
                            )}
                        </select>
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginTop: "4px" }}>
                            Bepaalt wie LaventeCare mag beheren
                            {isAdmin && " — als admin kun jij ook nieuwe admins uitnodigen"}
                        </p>
                    </div>

                    <div>
                        <label htmlFor="invite-domein-rol" className="form-label">
                            Garage-functie (Convex)
                        </label>
                        <select
                            id="invite-domein-rol"
                            className="form-select"
                            value={domeinRolKeuze}
                            onChange={(e) => setDomeinRolKeuze(e.target.value as DomeinRol)}
                            aria-label="Garage domein rol"
                        >
                            {isAdmin && (
                                <option value="eigenaar">Eigenaar (volledig beheer)</option>
                            )}
                            <option value="balie">Balie / Receptie</option>
                            <option value="monteur">Monteur</option>
                            <option value="stagiair">Stagiair</option>
                        </select>
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginTop: "4px" }}>
                            Bepaalt wat ze mogen zien in de app
                            {isAdmin && " — als admin kun jij ook een nieuwe eigenaar aanwijzen"}
                        </p>
                    </div>
                </div>

                {fout && (
                    <p role="alert" style={{ color: "var(--color-error)", fontSize: "var(--text-sm)" }}>
                        ❌ {fout}
                    </p>
                )}

                {result && (
                    <div
                        role="status"
                        style={{
                            padding: "var(--space-3) var(--space-4)",
                            borderRadius: "var(--radius-md)",
                            background: "var(--color-success-bg, #f0faf4)",
                            border: "1px solid var(--color-success-border, #a3e6cc)",
                            color: "var(--color-success, #0d7a5f)",
                        }}
                    >
                        <strong>✅ Uitnodiging aangemaakt!</strong>
                        <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-sm)" }}>
                            Deel deze link met de medewerker:
                        </p>
                        <code
                            style={{
                                display: "block",
                                marginTop: "var(--space-2)",
                                padding: "var(--space-2)",
                                background: "rgba(0,0,0,0.05)",
                                borderRadius: "var(--radius-sm)",
                                fontSize: "var(--text-xs)",
                                wordBreak: "break-all",
                            }}
                        >
                            {import.meta.env.PUBLIC_API_URL}{result.link}
                        </code>
                        <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                            Na registratie moet de medewerker inloggen om automatisch gekoppeld te worden.
                        </p>
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
        </div>
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
        setBezig(true);
        setFout("");
        try {
            await wijzig({ medewerkerId: medewerker._id, nieuweDomeinRol: nieuweRol });
        } catch (err) {
            setFout(err instanceof Error ? err.message : "Fout");
        } finally {
            setBezig(false);
        }
    }

    async function handleDeactiveer() {
        if (!confirm(`Weet je zeker dat je ${medewerker.naam} wilt deactiveren?`)) return;
        setBezig(true);
        setFout("");
        try {
            await deactiveer({ medewerkerId: medewerker._id });
        } catch (err) {
            setFout(err instanceof Error ? err.message : "Fout");
        } finally {
            setBezig(false);
        }
    }

    async function handleAktiveer() {
        setBezig(true);
        setFout("");
        try {
            await aktiveer({ medewerkerId: medewerker._id });
        } catch (err) {
            setFout(err instanceof Error ? err.message : "Fout");
        } finally {
            setBezig(false);
        }
    }

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-3)",
                padding: "var(--space-4)",
                borderRadius: "var(--radius-md)",
                background: medewerker.actief ? "var(--color-surface)" : "var(--color-surface-alt, rgba(0,0,0,0.03))",
                border: "1px solid var(--color-border)",
                opacity: medewerker.actief ? 1 : 0.6,
                flexWrap: "wrap",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <div
                    aria-hidden="true"
                    style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "var(--radius-full)",
                        background: "var(--color-primary-muted, #e0f5ef)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "var(--text-sm)",
                        color: "var(--color-primary)",
                        flexShrink: 0,
                    }}
                >
                    {medewerker.naam.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                        {medewerker.naam}
                        {isZichzelf && (
                            <span style={{ marginLeft: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                                (jij)
                            </span>
                        )}
                    </div>
                    {!medewerker.actief && (
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>Gedeactiveerd</span>
                    )}
                </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <RolBadge rol={medewerker.domeinRol as DomeinRol} />

                {isActerendEigenaar && !isZichzelf && (
                    <>
                        <select
                            aria-label={`Wijzig domeinrol van ${medewerker.naam}`}
                            className="form-select"
                            style={{ fontSize: "var(--text-xs)", padding: "4px 8px" }}
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
                                className="btn btn-ghost btn-sm"
                                onClick={handleDeactiveer}
                                disabled={bezig}
                                aria-label={`Deactiveer ${medewerker.naam}`}
                                style={{ color: "var(--color-error)" }}
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
                    </>
                )}
            </div>

            {fout && (
                <p role="alert" style={{ width: "100%", color: "var(--color-error)", fontSize: "var(--text-xs)" }}>
                    ❌ {fout}
                </p>
            )}
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
    // Skip list query while: (1) role loading, (2) not yet registered, (3) insufficient access
    const kanLijstZien = !isLoading && !isNietGekoppeld && (isEigenaar || domeinRol === "balie" || isAdmin);
    const alleMedewerkers = useQuery(
        api.medewerkers.listMedewerkers,
        kanLijstZien ? {} : "skip"
    );
    const medewerkers = kanLijstZien ? alleMedewerkers : null;

    if (isLoading) {
        return (
            <div
                role="status"
                aria-live="polite"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "200px",
                    gap: "var(--space-3)",
                    color: "var(--color-muted)",
                }}
            >
                <span
                    aria-hidden="true"
                    style={{
                        width: "20px",
                        height: "20px",
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

    // Cold-start: nog geen enkel medewerkers-record
    if (isNietGekoppeld) {
        const naam =
            typeof window !== "undefined"
                ? (document.cookie
                    .split("; ")
                    .find((c) => c.startsWith("lc_name="))
                    ?.split("=")?.[1] ?? "") ||
                "Eigenaar"
                : "Eigenaar";

        return <ColdStartBanner naam={decodeURIComponent(naam)} />;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

            {/* Jouw profiel */}
            {profiel && (
                <section aria-labelledby="jouw-profiel-heading">
                    <h2 id="jouw-profiel-heading" style={{ fontSize: "var(--text-lg)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
                        Jouw profiel
                    </h2>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-3)",
                            padding: "var(--space-4)",
                            borderRadius: "var(--radius-lg)",
                            background: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: 600 }}>{profiel.naam}</div>
                            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)", marginTop: "2px" }}>
                                Garage-functie:
                            </div>
                        </div>
                        <RolBadge rol={profiel.domeinRol as DomeinRol} />
                    </div>
                </section>
            )}

            {/* Medewerkers lijst (balie+) */}
            {(isEigenaar || domeinRol === "balie") && (
                <section aria-labelledby="medewerkers-lijst-heading">
                    <h2 id="medewerkers-lijst-heading" style={{ fontSize: "var(--text-lg)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
                        Alle medewerkers
                    </h2>
                    {medewerkers == null ? (
                        <p style={{ color: "var(--color-muted)" }}>Laden…</p>
                    ) : medewerkers.length === 0 ? (
                        <p style={{ color: "var(--color-muted)" }}>Geen medewerkers gevonden.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                            {medewerkers!.map((m: { _id: import("../../convex/_generated/dataModel").Id<"medewerkers">; naam: string; domeinRol: string; actief: boolean }) => (
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

            {/* Uitnodiging formulier (balie+) */}
            {(isEigenaar || domeinRol === "balie" || isAdmin) && (
                <section aria-labelledby="invite-heading">
                    <h2 id="invite-heading" style={{ fontSize: "var(--text-lg)", fontWeight: 600, marginBottom: "var(--space-3)" }}>
                        Medewerker uitnodigen
                        {isAdmin && (
                            <span
                                style={{
                                    marginLeft: "var(--space-2)",
                                    fontSize: "var(--text-xs)",
                                    fontWeight: 500,
                                    color: "var(--color-primary)",
                                    background: "var(--color-primary-muted, rgba(13,122,95,0.12))",
                                    padding: "2px 8px",
                                    borderRadius: "var(--radius-full)",
                                    letterSpacing: "0.02em",
                                }}
                            >
                                admin-modus
                            </span>
                        )}
                    </h2>
                    <InviteFormulier identityRole={identityRole} />
                </section>
            )}

            {/* Monteur / stagiair: geen beheer-opties */}
            {!isEigenaar && domeinRol !== "balie" && (
                <div
                    style={{
                        padding: "var(--space-5)",
                        borderRadius: "var(--radius-lg)",
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        textAlign: "center",
                        color: "var(--color-muted)",
                    }}
                >
                    <p>
                        Je bent ingelogd als <RolBadge rol={domeinRol!} />.
                    </p>
                    <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-sm)" }}>
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
