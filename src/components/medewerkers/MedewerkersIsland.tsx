/**
 * src/components/medewerkers/MedewerkersIsland.tsx
 *
 * React Island — Medewerkers Beheer (Split-Role strategie)
 * ui-ux-pro-max fixes:
 *   - Emoji icons → SVG (👋 🏪 👷 ✅ ❌ ⏳ 👥 🔒)
 *   - confirm() → inline bevestigingsdialog
 *   - "Laden…" text → pulse skeleton
 *   - MedewerkerRij → glassmorphism card met avatar gradient ring
 *   - ColdStartBanner → glassmorphism option cards
 *   - Empty state → SVG icon
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useRol, type DomeinRol } from "../../hooks/useRol";
import { LaventeConvexProvider } from "../providers/LaventeConvexProvider";
import MedewerkerProfielModal from "../modals/MedewerkerProfielModal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IdentityRole = "admin" | "editor" | "user" | "viewer";

interface InviteResult {
    token: string;
    link: string;
}

// ---------------------------------------------------------------------------
// Domeinrol helpers
// ---------------------------------------------------------------------------

const ROL_LABELS: Record<DomeinRol, string> = {
    eigenaar: "Eigenaar",
    balie: "Balie / Receptie",
    monteur: "Monteur",
    stagiair: "Stagiair",
};

const ROL_BADGE: Record<DomeinRol, { bg: string; color: string; border: string }> = {
    eigenaar: { bg: "var(--color-accent-dim)", color: "var(--color-accent-text)", border: "var(--color-border-luminous)" },
    balie: { bg: "var(--color-info-bg)", color: "var(--color-info-text)", border: "var(--color-info-border)" },
    monteur: { bg: "var(--color-surface-2)", color: "var(--color-body)", border: "var(--color-border)" },
    stagiair: { bg: "var(--color-warning-bg)", color: "var(--color-warning)", border: "var(--color-warning-border)" },
};

// Avatar gradient per rol
const ROL_AVATAR: Record<DomeinRol, string> = {
    eigenaar: "linear-gradient(135deg, var(--color-accent), #7c3aed)",
    balie: "linear-gradient(135deg, #3b82f6, #06b6d4)",
    monteur: "linear-gradient(135deg, #64748b, #475569)",
    stagiair: "linear-gradient(135deg, #f59e0b, #d97706)",
};

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function IconUsers() {
    return (
        <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function IconLock() {
    return (
        <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

function IconCheck() {
    return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function IconX() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function IconBuildingStore() {
    return (
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    );
}

function IconHardHat() {
    return (
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z" />
            <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
            <path d="M4 15v-3a6 6 0 0 1 6-6h0" />
            <path d="M14 6h0a6 6 0 0 1 6 6v3" />
        </svg>
    );
}

function IconWave() {
    return (
        <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7.5 5.6 5 7l1.4 2.3" />
            <path d="m16.5 5.6 2.5 1.4L17.6 9.3" />
            <path d="M10.5 14.5c0 0 .5 1 1.5 1s1.5-1 1.5-1" />
            <circle cx="12" cy="12" r="7" />
            <path d="M9 12h.01M15 12h.01" />
        </svg>
    );
}

function IconAlertCircle() {
    return (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// RolBadge
// ---------------------------------------------------------------------------

function RolBadge({ rol }: { rol: DomeinRol }) {
    const s = ROL_BADGE[rol] ?? ROL_BADGE.monteur;
    return (
        <span style={{
            fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)",
            background: s.bg, color: s.color,
            border: `1px solid ${s.border}`,
            borderRadius: "var(--radius-full)", padding: "var(--space-px) var(--space-2)",
        }}>
            {ROL_LABELS[rol] ?? rol}
        </span>
    );
}

// ---------------------------------------------------------------------------
// StatsHeader
// ---------------------------------------------------------------------------

function StatsHeader({ medewerkers }: { medewerkers: Array<{ domeinRol: string; actief: boolean }> }) {
    const actief = medewerkers.filter(m => m.actief).length;
    const perRol: Record<string, number> = {};
    for (const m of medewerkers) {
        if (!m.actief) continue;
        perRol[m.domeinRol] = (perRol[m.domeinRol] ?? 0) + 1;
    }
    const stats = [
        { label: "Actief", value: actief, accent: true },
        ...(["eigenaar", "balie", "monteur", "stagiair"] as DomeinRol[])
            .filter(r => perRol[r])
            .map(r => ({ label: ROL_LABELS[r], value: perRol[r], accent: false })),
    ];
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`,
            gap: "var(--space-3)",
            marginBottom: "var(--space-6)",
        }} className="stats-grid">
            <style>{`
                @media (max-width: 640px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
            `}</style>
            {stats.map(s => (
                <div key={s.label} style={{
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-xl)",
                    background: s.accent ? "var(--color-accent-dim)" : "var(--glass-bg)",
                    border: `1px solid ${s.accent ? "var(--color-border-luminous)" : "var(--glass-border)"}`,
                    backdropFilter: "blur(8px)",
                    display: "flex", flexDirection: "column", gap: "var(--space-1)",
                }}>
                    <span style={{
                        fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)",
                        color: s.accent ? "var(--color-accent-text)" : "var(--color-heading)",
                        lineHeight: 1,
                    }}>{s.value}</span>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>{s.label}</span>
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// ZoekFilterBar
// ---------------------------------------------------------------------------

type RolFilter = "alle" | DomeinRol;

function ZoekFilterBar({
    zoekterm, onZoek,
    actieveFilter, onFilter,
    beschikbareRollen,
}: {
    zoekterm: string;
    onZoek: (v: string) => void;
    actieveFilter: RolFilter;
    onFilter: (r: RolFilter) => void;
    beschikbareRollen: DomeinRol[];
}) {
    const filterOpties: { id: RolFilter; label: string }[] = [
        { id: "alle", label: "Alle" },
        ...beschikbareRollen.map(r => ({ id: r, label: ROL_LABELS[r] ?? r })),
    ];
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
            {/* Zoekbalk */}
            <div style={{ position: "relative" }}>
                <svg
                    width={15} height={15} viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2} strokeLinecap="round"
                    aria-hidden="true"
                    style={{
                        position: "absolute", left: "var(--space-3)",
                        top: "50%", transform: "translateY(-50%)",
                        color: "var(--color-muted)", pointerEvents: "none",
                    }}
                >
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="search"
                    className="input"
                    placeholder="Zoek op naam…"
                    value={zoekterm}
                    onChange={e => onZoek(e.target.value)}
                    style={{ paddingLeft: "calc(var(--space-3) + 15px + var(--space-2))" }}
                    aria-label="Zoek medewerkers op naam"
                />
            </div>
            {/* Rol-filters */}
            {filterOpties.length > 2 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }} role="group" aria-label="Filteren op functie">
                    {filterOpties.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => onFilter(opt.id)}
                            aria-pressed={actieveFilter === opt.id}
                            style={{
                                padding: "0.3em 0.85em",
                                borderRadius: "var(--radius-full)",
                                fontSize: "var(--text-xs)",
                                fontWeight: actieveFilter === opt.id ? "var(--weight-semibold)" : "var(--weight-normal)",
                                border: "1px solid",
                                cursor: "pointer",
                                minHeight: "32px",
                                transition: "all 150ms ease",
                                background: actieveFilter === opt.id ? "var(--color-accent-dim)" : "var(--glass-bg)",
                                color: actieveFilter === opt.id ? "var(--color-accent-text)" : "var(--color-muted)",
                                borderColor: actieveFilter === opt.id ? "var(--color-border-luminous)" : "var(--color-border)",
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// SectieTitel
// ---------------------------------------------------------------------------

function SectieTitel({ children, badge }: { children: React.ReactNode; badge?: React.ReactNode }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
            <h2 className="section-title" style={{ margin: 0 }}>{children}</h2>
            {badge}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Spinner (al goed, clean-up inline styles)
// ---------------------------------------------------------------------------

function Spinner() {
    return (
        <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-3)", padding: "var(--space-16) var(--space-4)", color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Profielen ophalen…
        </div>
    );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function MedewerkerSkeleton() {
    return (
        <div aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-4)", borderRadius: "var(--radius-xl)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "var(--radius-full)", background: "var(--skeleton-base)", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <div style={{ width: "45%", height: "14px", borderRadius: "var(--radius-md)", background: "var(--skeleton-base)", animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ width: "25%", height: "18px", borderRadius: "var(--radius-full)", background: "var(--skeleton-base)", animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// ColdStart Banner
// ---------------------------------------------------------------------------

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
            setBericht(result.created ? "Eigenaar-profiel aangemaakt! De pagina ververst automatisch." : result.reden ?? "Record bestond al.");
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
            <div style={{
                display: "flex", alignItems: "center", gap: "var(--space-3)",
                padding: "var(--space-4)", borderRadius: "var(--radius-xl)",
                background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)",
                color: "var(--color-success-text)",
            }} role="status">
                <span style={{ color: "var(--color-success)" }}><IconCheck /></span>
                {bericht}
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "540px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

            {/* Header */}
            <div style={{ textAlign: "center", padding: "var(--space-4) 0 var(--space-2)" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-3)", color: "var(--color-accent)" }}>
                    <IconWave />
                </div>
                <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", margin: "0 0 var(--space-2)" }}>
                    Welkom bij de garage!
                </h2>
                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", margin: 0 }}>
                    Je account is nog niet gekoppeld. Kies hoe je wilt beginnen.
                </p>
            </div>

            {/* Foutmelding */}
            {status === "error" && (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)", color: "var(--color-error-text)", fontSize: "var(--text-sm)" }} role="alert">
                    <IconX /> {bericht}
                </div>
            )}

            {/* Verbindingsstatus */}
            {!isAuthenticated && (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                    </svg>
                    Verbinding maken met Convex…
                </div>
            )}

            {/* Optie 1: Eigenaar */}
            <div style={{
                borderRadius: "var(--radius-xl)",
                background: "var(--color-accent-subtle)",
                border: "1px solid var(--color-border-luminous)",
                padding: "var(--space-4)",
            }}>
                <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                    <div style={{
                        width: "40px", height: "40px", borderRadius: "var(--radius-lg)",
                        background: "var(--color-accent-dim)", border: "1px solid var(--color-border-luminous)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--color-accent-text)", flexShrink: 0,
                    }}>
                        <IconBuildingStore />
                    </div>
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

            {/* Optie 2: Medewerker */}
            <div style={{
                borderRadius: "var(--radius-xl)",
                background: "var(--glass-bg)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid var(--glass-border)",
                padding: "var(--space-4)",
            }}>
                <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                    <div style={{
                        width: "40px", height: "40px", borderRadius: "var(--radius-lg)",
                        background: "var(--color-surface)", border: "1px solid var(--color-border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--color-muted)", flexShrink: 0,
                    }}>
                        <IconHardHat />
                    </div>
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
// InviteFormulier (al clean — enkel emoji alert verwijderd)
// ---------------------------------------------------------------------------

function InviteFormulier({ identityRole, isEigenaarDomein }: { identityRole: IdentityRole; isEigenaarDomein: boolean }) {
    const isAdmin = identityRole === "admin";
    const [email, setEmail] = useState("");
    const [identityRol, setIdentityRol] = useState<"user" | "editor" | "admin">("editor");
    const [domeinRolKeuze, setDomeinRolKeuze] = useState<DomeinRol>("monteur");
    const [naam, setNaam] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
    const [result, setResult] = useState<InviteResult | null>(null);
    const [fout, setFout] = useState("");

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        setStatus("loading"); setFout(""); setResult(null);
        try {
            const response = await fetch("/api/invite", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": document.cookie.split("; ").find((c) => c.startsWith("csrf_token="))?.split("=")[1] ?? "",
                },
                body: JSON.stringify({ email, role: identityRol }),
                credentials: "include",
            });
            if (!response.ok) {
                const tekst = await response.text();
                throw new Error(tekst || `Status ${response.status}`);
            }
            const inviteData: InviteResult = await response.json();
            setResult(inviteData); setStatus("ok"); setEmail(""); setNaam("");
        } catch (err) {
            setStatus("error");
            setFout(err instanceof Error ? err.message : "Onbekende fout");
        }
    }

    return (
        <form onSubmit={handleInvite} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <div className="form-group">
                <label htmlFor="invite-naam" className="label">Naam</label>
                <input id="invite-naam" type="text" className="input" value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Bijv. Jan de Vries" required />
            </div>
            <div className="form-group">
                <label htmlFor="invite-email" className="label">E-mailadres</label>
                <input id="invite-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jan@example.com" required />
            </div>
            <div className="invite-selects-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-4)" }}>
                <style>{`@media (min-width: 640px) { .invite-selects-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
                <div className="form-group">
                    <label htmlFor="invite-identity-rol" className="label">Platform-toegang (LaventeCare)</label>
                    <select id="invite-identity-rol" className="select" value={identityRol} onChange={(e) => setIdentityRol(e.target.value as "user" | "editor" | "admin")}>
                        <option value="user">Gebruiker — monteur / stagiair</option>
                        <option value="editor">Editor — balie / werkplaatschef</option>
                        {(isAdmin || isEigenaarDomein) && <option value="admin">Admin — mede-systeembeheerder</option>}
                    </select>
                    <p className="field-hint">Bepaalt toegang tot LaventeCare-beheer</p>
                </div>
                <div className="form-group">
                    <label htmlFor="invite-domein-rol" className="label">Garage-functie</label>
                    <select id="invite-domein-rol" className="select" value={domeinRolKeuze} onChange={(e) => setDomeinRolKeuze(e.target.value as DomeinRol)}>
                        {(isAdmin || isEigenaarDomein) && <option value="eigenaar">Eigenaar — volledig beheer</option>}
                        <option value="balie">Balie / Receptie</option>
                        <option value="monteur">Monteur</option>
                        <option value="stagiair">Stagiair</option>
                    </select>
                    <p className="field-hint">Bepaalt wat ze zien in de app</p>
                </div>
            </div>

            {/* Fout */}
            {fout && (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)", background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)", color: "var(--color-error-text)", fontSize: "var(--text-sm)" }} role="alert">
                    <IconAlertCircle /> {fout}
                </div>
            )}

            {/* Succes */}
            {result && (
                <div style={{ padding: "var(--space-4)", borderRadius: "var(--radius-xl)", background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }} role="status">
                    <p style={{ fontWeight: "var(--weight-semibold)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--color-success-text)" }}>
                        <span style={{ color: "var(--color-success)" }}><IconCheck /></span> Uitnodiging aangemaakt!
                    </p>
                    <p style={{ fontSize: "var(--text-xs)", margin: 0, color: "var(--color-muted)" }}>Deel deze link met de medewerker:</p>
                    <code style={{ display: "block", padding: "var(--space-2) var(--space-3)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", wordBreak: "break-all", fontFamily: "var(--font-mono)", color: "var(--color-heading)" }}>
                        {import.meta.env.PUBLIC_API_URL}{result.link}
                    </code>
                    <p style={{ fontSize: "var(--text-xs)", margin: 0, color: "var(--color-muted)" }}>
                        Medewerker koppelt zich zelf na eerste login. Jij wijst daarna de functie <strong>{ROL_LABELS[domeinRolKeuze]}</strong> toe.
                    </p>
                </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={status === "loading"} id="invite-submit-btn" style={{ alignSelf: "flex-start" }}>
                {status === "loading" ? "Bezig met uitnodigen…" : "Uitnodiging versturen"}
            </button>
        </form>
    );
}

// ---------------------------------------------------------------------------
// MedewerkerRij — glassmorphism card + inline bevestigingsdialog
// ---------------------------------------------------------------------------

function MedewerkerRij({ medewerker, isActerendEigenaar, actueelProfielId, onProfielKlik }: {
    medewerker: { _id: Id<"medewerkers">; naam: string; voornaam?: string; achternaam?: string; domeinRol: string; actief: boolean };
    isActerendEigenaar: boolean;
    actueelProfielId: Id<"medewerkers"> | undefined;
    onProfielKlik: (id: Id<"medewerkers">) => void;
}) {
    const wijzig = useMutation(api.medewerkers.wijzigDomeinRol);
    const deactiveer = useMutation(api.medewerkers.deactiveerMedewerker);
    const aktiveer = useMutation(api.medewerkers.activeerMedewerker);
    const [bezig, setBezig] = useState(false);
    const [fout, setFout] = useState("");
    const [bevestigDeactiveer, setBevestigDeactiveer] = useState(false);

    const isZichzelf = medewerker._id === actueelProfielId;
    const rol = medewerker.domeinRol as DomeinRol;
    const avatarGradient = ROL_AVATAR[rol] ?? ROL_AVATAR.monteur;

    // Toon voornaam + achternaam als beschikbaar, anders naam
    const weergaveNaam = [medewerker.voornaam, medewerker.achternaam].filter(Boolean).join(" ") || medewerker.naam;

    async function handleRolWijziging(nieuweRol: DomeinRol) {
        setBezig(true); setFout("");
        try { await wijzig({ medewerkerId: medewerker._id, nieuweDomeinRol: nieuweRol }); }
        catch (err) { setFout(err instanceof Error ? err.message : "Fout"); }
        finally { setBezig(false); }
    }

    async function handleDeactiveer() {
        setBezig(true); setFout(""); setBevestigDeactiveer(false);
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
            style={{
                borderRadius: "var(--radius-xl)",
                background: medewerker.actief ? "var(--glass-bg)" : "var(--color-surface)",
                backdropFilter: medewerker.actief ? "blur(12px)" : "none",
                WebkitBackdropFilter: medewerker.actief ? "blur(12px)" : "none",
                border: "1px solid var(--glass-border)",
                padding: "var(--space-4)",
                opacity: medewerker.actief ? 1 : 0.55,
                display: "flex", gap: "var(--space-3)", alignItems: "flex-start", flexWrap: "wrap",
                transition: "opacity 200ms ease, background 150ms ease, box-shadow 150ms ease",
                cursor: "pointer",
            }}
            onClick={() => onProfielKlik(medewerker._id)}
            role="button"
            tabIndex={0}
            aria-label={`Profiel van ${weergaveNaam} bekijken`}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onProfielKlik(medewerker._id); } }}
            className="medewerker-kaart"
        >
            {/* Avatar — gradient gebaseerd op rol */}
            <div aria-hidden="true" style={{
                width: "44px", height: "44px", borderRadius: "9999px",
                background: avatarGradient,
                border: "2px solid var(--glass-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: "var(--weight-bold)", fontSize: "var(--text-base)",
                color: "var(--color-on-accent)", flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}>
                {weergaveNaam.charAt(0).toUpperCase()}
            </div>

            {/* Info + acties */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Naam + badges */}
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-1)" }}>
                    <span style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", color: "var(--color-heading)" }}>
                        {weergaveNaam}
                    </span>
                    {isZichzelf && (
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>(jij)</span>
                    )}
                    <RolBadge rol={rol} />
                    {!medewerker.actief && (
                        <span style={{
                            fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)",
                            color: "var(--color-warning-text)", background: "var(--color-warning-bg)",
                            border: "1px solid var(--color-warning-border)",
                            borderRadius: "var(--radius-full)", padding: "var(--space-px) var(--space-2)",
                        }}>
                            Gedeactiveerd
                        </span>
                    )}
                    {/* Actieve status dot */}
                    {medewerker.actief && (
                        <span aria-label="Actief" style={{
                            display: "inline-block", width: 7, height: 7,
                            borderRadius: "9999px", background: "var(--color-success)",
                            marginLeft: "auto", flexShrink: 0,
                        }} />
                    )}
                </div>

                {/* Eigenaar-acties */}
                {isActerendEigenaar && !isZichzelf && (
                    medewerker.domeinRol === "eigenaar" ? (
                        /* Peer-eigenaar: geen wijzigknoppen, alleen leesstatus */
                        <span style={{
                            fontSize: "var(--text-xs)", color: "var(--color-muted)",
                            fontStyle: "italic",
                        }}>
                            Mede-eigenaar — rol kan niet worden gewijzigd
                        </span>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
                                <select
                                    aria-label={`Wijzig garage-functie van ${medewerker.naam}`}
                                    className="select"
                                    style={{ width: "auto", minWidth: "160px", fontSize: "var(--text-xs)", minHeight: "var(--control-height-sm)" }}
                                    value={medewerker.domeinRol}
                                    onChange={(e) => handleRolWijziging(e.target.value as DomeinRol)}
                                    disabled={bezig}
                                >
                                    {(Object.keys(ROL_LABELS) as DomeinRol[]).map((r) => (
                                        <option key={r} value={r}>{ROL_LABELS[r]}</option>
                                    ))}
                                </select>

                                {medewerker.actief ? (
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => setBevestigDeactiveer(true)}
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

                            {/* Inline bevestigingsdialog — vervangt confirm() */}
                            {bevestigDeactiveer && (
                                <div style={{
                                    display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap",
                                    padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                                    background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)",
                                }}>
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error-text)", fontWeight: "var(--weight-medium)", flex: 1 }}>
                                        Weet je zeker dat je {medewerker.naam} wilt deactiveren?
                                    </span>
                                    <button onClick={handleDeactiveer} className="btn btn-danger btn-sm" disabled={bezig}>
                                        Ja, deactiveer
                                    </button>
                                    <button onClick={() => setBevestigDeactiveer(false)} className="btn btn-ghost btn-sm">
                                        Annuleren
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                )}

                {/* Inline foutmelding */}
                {fout && (
                    <p role="alert" style={{ color: "var(--color-error)", fontSize: "var(--text-xs)", marginTop: "var(--space-2)", display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                        <IconAlertCircle /> {fout}
                    </p>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// MedewerkersContent
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// TenantRepairBanner — eenmalig zichtbaar als tokenIdentifiers niet kloppen
// ---------------------------------------------------------------------------

function TenantRepairBanner() {
    const fixeer = useMutation(api.medewerkers.fixeerTenantTokens);
    const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
    const [resultaat, setResultaat] = useState("");

    async function handleFix() {
        setStatus("loading");
        try {
            const res = await fixeer({});
            setStatus("ok");
            setResultaat(`${res.bijgewerkt} records gerepareerd, ${res.overgeslagen} al correct.`);
        } catch (err) {
            setStatus("error");
            setResultaat(err instanceof Error ? err.message : "Onbekende fout");
        }
    }

    if (status === "ok") {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-lg)", background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)", color: "var(--color-success-text)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
                <IconCheck /> {resultaat} — herlaad de pagina om het resultaat te zien.
            </div>
        );
    }

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-lg)", background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)", fontSize: "var(--text-sm)", flexWrap: "wrap" }} role="alert">
            <span style={{ flex: 1, color: "var(--color-warning-text)", minWidth: "200px" }}>
                <strong>Niet alle medewerkers zichtbaar?</strong> Oude records gebruiken nog de verkeerde tenant-koppeling. Klik om dit eenmalig te repareren.
            </span>
            {status === "error" && <span style={{ color: "var(--color-error-text)", fontSize: "var(--text-xs)" }}>{resultaat}</span>}
            <button className="btn btn-ghost btn-sm" onClick={handleFix} disabled={status === "loading"} style={{ borderColor: "var(--color-warning-border)", color: "var(--color-warning-text)" }}>
                {status === "loading" ? "Bezig…" : "Repareer records"}
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// MedewerkersContent
// ---------------------------------------------------------------------------

function MedewerkersContent({ identityRole }: { identityRole: IdentityRole }) {
    const isAdmin = identityRole === "admin";
    const { isEigenaar, domeinRol, isLoading, isNietGekoppeld } = useRol();
    const profiel = useQuery(api.medewerkers.getMijnProfiel);
    const kanLijstZien = !isLoading && !isNietGekoppeld && (isEigenaar || domeinRol === "balie" || isAdmin);
    const alleMedewerkers = useQuery(api.medewerkers.listMedewerkers, kanLijstZien ? {} : "skip");
    const medewerkers = kanLijstZien ? alleMedewerkers : null;
    const [geselecteerdProfielId, setGeselecteerdProfielId] = useState<Id<"medewerkers"> | null>(null);

    // Zoek + filter state
    const [zoekterm, setZoekterm] = useState("");
    const [actieveFilter, setActieveFilter] = useState<RolFilter>("alle");

    // Toon repair banner voor eigenaar als de lijst slechts 1 record bevat
    const toonRepairBanner = isEigenaar && Array.isArray(medewerkers) && medewerkers.length === 1;

    // Gefilterde + gezochte lijst
    const gefilterdeMediawerkers = useMemo(() => {
        if (!Array.isArray(medewerkers)) return [];
        return medewerkers.filter(m => {
            const weergaveNaam = [m.voornaam, m.achternaam].filter(Boolean).join(" ") || m.naam;
            const matchZoek = !zoekterm ||
                weergaveNaam.toLowerCase().includes(zoekterm.toLowerCase()) ||
                m.naam.toLowerCase().includes(zoekterm.toLowerCase());
            const matchFilter = actieveFilter === "alle" || m.domeinRol === actieveFilter;
            return matchZoek && matchFilter;
        });
    }, [medewerkers, zoekterm, actieveFilter]);

    // Beschikbare rollen voor filter buttons
    const beschikbareRollen = useMemo(() => {
        if (!Array.isArray(medewerkers)) return [];
        const rollen = new Set(medewerkers.map(m => m.domeinRol as DomeinRol));
        return (["eigenaar", "balie", "monteur", "stagiair"] as DomeinRol[]).filter(r => rollen.has(r));
    }, [medewerkers]);

    if (isLoading) return <Spinner />;

    if (isNietGekoppeld) {
        const naam =
            typeof window !== "undefined"
                ? (document.cookie.split("; ").find((c) => c.startsWith("lc_name="))?.split("=")?.[1] ?? "") || "Medewerker"
                : "Medewerker";
        return <ColdStartBanner naam={decodeURIComponent(naam)} />;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>

            {/* Stats header — alleen voor eigenaar/balie/admin die de lijst zien */}
            {Array.isArray(medewerkers) && medewerkers.length > 0 && (
                <StatsHeader medewerkers={medewerkers} />
            )}

            {/* Repair banner */}
            {toonRepairBanner && <TenantRepairBanner />}

            {/* Medewerkers lijst met zoek + filter */}
            {(isEigenaar || domeinRol === "balie" || isAdmin) && (
                <section aria-labelledby="medewerkers-lijst-heading">
                    <SectieTitel>Alle medewerkers</SectieTitel>

                    {/* Zoek + filter bar — alleen tonen als er medewerkers zijn */}
                    {Array.isArray(medewerkers) && medewerkers.length > 1 && (
                        <ZoekFilterBar
                            zoekterm={zoekterm}
                            onZoek={setZoekterm}
                            actieveFilter={actieveFilter}
                            onFilter={setActieveFilter}
                            beschikbareRollen={beschikbareRollen}
                        />
                    )}

                    {medewerkers == null ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                            {Array.from({ length: 3 }).map((_, i) => <MedewerkerSkeleton key={i} />)}
                        </div>
                    ) : medewerkers.length === 0 ? (
                        <div className="empty-state" style={{ padding: "var(--space-10) var(--space-4)" }}>
                            <span className="empty-state-icon"><IconUsers /></span>
                            <p className="empty-state-title">Geen medewerkers gevonden</p>
                            <p className="empty-state-desc">Nodig medewerkers uit via het formulier hieronder.</p>
                        </div>
                    ) : gefilterdeMediawerkers.length === 0 ? (
                        <div className="empty-state" style={{ padding: "var(--space-10) var(--space-4)" }}>
                            <span className="empty-state-icon"><IconUsers /></span>
                            <p className="empty-state-title">Geen resultaten</p>
                            <p className="empty-state-desc">Geen medewerkers gevonden voor "{zoekterm || ROL_LABELS[actieveFilter as DomeinRol]}".</p>
                        </div>
                    ) : (
                        <>
                            {/* Grid layout: 1 kolom op mobiel, 2 kolommen op ≥1024px */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-3)" }} className="medewerkers-grid">
                                <style>{`
                                    @media (min-width: 1024px) { .medewerkers-grid { grid-template-columns: repeat(2, 1fr) !important; } }
                                    .medewerker-kaart:hover { background: var(--glass-bg-strong) !important; box-shadow: var(--shadow-md); }
                                    .medewerker-kaart:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
                                `}</style>
                                {gefilterdeMediawerkers.map((m: { _id: Id<"medewerkers">; naam: string; voornaam?: string; achternaam?: string; domeinRol: string; actief: boolean }) => (
                                    <MedewerkerRij
                                        key={m._id}
                                        medewerker={m}
                                        isActerendEigenaar={isEigenaar}
                                        actueelProfielId={profiel?._id}
                                        onProfielKlik={(id) => setGeselecteerdProfielId(id)}
                                    />
                                ))}
                            </div>
                            {/* Aantal resultaten */}
                            {(zoekterm || actieveFilter !== "alle") && (
                                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", marginTop: "var(--space-3)", textAlign: "center" }}>
                                    {gefilterdeMediawerkers.length} van {medewerkers.length} medewerkers
                                </p>
                            )}
                        </>
                    )}
                </section>
            )}

            {/* Eigen profiel knop voor monteur/stagiair/balie — link naar /profiel */}
            {!isEigenaar && profiel && (
                <section>
                    <SectieTitel>Jouw profiel</SectieTitel>
                    <div style={{
                        display: "flex", alignItems: "center", gap: "var(--space-4)",
                        padding: "var(--space-4)", borderRadius: "var(--radius-xl)",
                        background: "var(--glass-bg)", backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)", border: "1px solid var(--glass-border)",
                    }}>
                        <div aria-hidden="true" style={{
                            width: "48px", height: "48px", borderRadius: "9999px", flexShrink: 0,
                            background: ROL_AVATAR[profiel.domeinRol as DomeinRol] ?? ROL_AVATAR.monteur,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: "var(--weight-bold)", fontSize: "var(--text-lg)",
                            color: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
                        }}>
                            {profiel.naam.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: "0 0 var(--space-1)", fontWeight: "var(--weight-bold)", fontSize: "var(--text-base)", color: "var(--color-heading)" }}>
                                {profiel.naam}
                            </p>
                            <RolBadge rol={profiel.domeinRol as DomeinRol} />
                        </div>
                        <a
                            href="/profiel"
                            className="btn btn-ghost btn-sm"
                            style={{ flexShrink: 0 }}
                        >
                            Bekijken
                        </a>
                    </div>
                </section>
            )}

            {/* Profiel Modal */}
            {geselecteerdProfielId && (
                <MedewerkerProfielModal
                    medewerkerId={geselecteerdProfielId}
                    isEigenaar={isEigenaar}
                    isZichzelf={geselecteerdProfielId === profiel?._id}
                    onClose={() => setGeselecteerdProfielId(null)}
                />
            )}

            {/* Uitnodiging formulier */}
            {(isEigenaar || domeinRol === "balie" || isAdmin) && (
                <section aria-labelledby="invite-heading">
                    <SectieTitel badge={
                        (isAdmin || isEigenaar) ? (
                            <span className="badge badge-accent">
                                {isAdmin ? "admin-modus" : "eigenaar-modus"}
                            </span>
                        ) : undefined
                    }>
                        Medewerker uitnodigen
                    </SectieTitel>
                    <div className="card">
                        <InviteFormulier identityRole={identityRole} isEigenaarDomein={isEigenaar} />
                    </div>
                </section>
            )}

            {/* Monteur/stagiair: geen beheer */}
            {!isEigenaar && domeinRol !== "balie" && (
                <div className="empty-state" style={{ padding: "var(--space-12) var(--space-4)" }}>
                    <span className="empty-state-icon"><IconLock /></span>
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
// Default export
// ---------------------------------------------------------------------------

export default function MedewerkersIsland({ identityRole }: { identityRole: IdentityRole }) {
    return (
        <LaventeConvexProvider>
            <MedewerkersContent identityRole={identityRole} />
        </LaventeConvexProvider>
    );
}
