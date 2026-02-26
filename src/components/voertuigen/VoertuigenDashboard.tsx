/**
 * src/components/VoertuigenDashboard.tsx
 *
 * React Island — toont de lijst met voertuigen en APK-meldingen.
 * Wordt gemount binnen LaventeConvexProvider (die de Convex auth regelt).
 *
 * Fixes (ui-ux-pro-max audit):
 *   - Emoji icons vervangen door SVG (Lucide-style inline SVG)
 *   - alert() vervangen door inline toast notification
 *   - Skeleton loader toegevoegd voor loading state
 *   - Active state (scale) toegevoegd op voertuig-cards
 *   - prefers-reduced-motion guard op transitions
 */

import { useState, useEffect } from "react";
import { useVoertuigenLijst, useApkWaarschuwingen } from "../../hooks/useVoertuigen";
import { useRol } from "../../hooks/useRol";
import type { Doc } from "../../../convex/_generated/dataModel";
import NieuwVoertuigModal from "../modals/NieuwVoertuigModal";
import NieuweKlantModal from "../modals/NieuweKlantModal";
import VoertuigDetailPanel from "../modals/VoertuigDetailPanel";
import ScanKlantKeuzeModal from "../modals/ScanKlantKeuzeModal";
import type { ScanKlantKeuzeResult } from "../modals/ScanKlantKeuzeModal";
import type { NieuwVoertuigPreFill } from "../modals/NieuwVoertuigModal";

// ---------------------------------------------------------------------------
// SVG Icons (inline, Lucide-stijl, 24×24 viewBox)
// ---------------------------------------------------------------------------

function IconWarning() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            width={16}
            height={16}
            aria-hidden="true"
        >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

function IconDownload() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            width={14}
            height={14}
            aria-hidden="true"
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Toast Notification
// ---------------------------------------------------------------------------

interface ToastProps {
    message: string;
    type?: "info" | "success" | "warning";
    onClose: () => void;
}

function Toast({ message, type = "info", onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgMap = {
        info: "var(--color-surface)",
        success: "var(--color-success-bg)",
        warning: "var(--color-warning-bg)",
    };
    const borderMap = {
        info: "var(--color-border)",
        success: "var(--color-success-border)",
        warning: "var(--color-warning-border)",
    };

    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                position: "fixed",
                bottom: "var(--space-6)",
                right: "var(--space-6)",
                zIndex: 9999,
                padding: "var(--space-3) var(--space-5)",
                borderRadius: "var(--radius-lg)",
                background: bgMap[type],
                border: `1px solid ${borderMap[type]}`,
                boxShadow: "var(--glass-shadow)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                fontSize: "var(--text-sm)",
                color: "var(--color-heading)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                "@media (prefers-reduced-motion: no-preference)": {
                    animation: "slideInUp 200ms ease",
                },
            } as React.CSSProperties}
        >
            <span>{message}</span>
            <button
                onClick={onClose}
                aria-label="Melding sluiten"
                style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-muted)",
                    lineHeight: 1,
                    padding: 0,
                    fontSize: "var(--text-base)",
                }}
            >
                ×
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Skeleton Loader
// ---------------------------------------------------------------------------

function VoertuigSkeleton() {
    return (
        <div
            aria-hidden="true"
            style={{
                padding: "var(--space-5)",
                borderRadius: "var(--radius-xl)",
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
            }}
        >
            {/* Kenteken + brandstof rij */}
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <div style={skeletonBlock("80px", "20px")} />
                <div style={skeletonBlock("52px", "20px")} />
            </div>
            <div style={skeletonBlock("60%", "16px")} />
            <div style={skeletonBlock("40%", "14px")} />
        </div>
    );
}

function skeletonBlock(width: string, height: string): React.CSSProperties {
    return {
        width,
        height,
        borderRadius: "var(--radius-md)",
        background: "var(--skeleton-base)",
        animation: "pulse 1.5s ease-in-out infinite",
    };
}

function DashboardSkeleton() {
    return (
        <section aria-label="Laden..." aria-busy="true">
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "var(--space-4)",
                }}
            >
                {Array.from({ length: 6 }).map((_, i) => (
                    <VoertuigSkeleton key={i} />
                ))}
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatDatum(ms: number): string {
    return new Date(ms).toLocaleDateString("nl-NL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VoertuigenDashboard() {
    const voertuigen = useVoertuigenLijst();
    const apkWaarschuwingen = useApkWaarschuwingen(30);
    const { isBalie, isEigenaar, domeinRol, isLoading: rolLaden } = useRol();

    const [toonVoertuigKlantKeuze, setToonVoertuigKlantKeuze] = useState(false);
    const [toonVoertuigModal, setToonVoertuigModal] = useState(false);
    const [voertuigPreFill, setVoertuigPreFill] = useState<NieuwVoertuigPreFill | undefined>(undefined);
    const [toonKlantModal, setToonKlantModal] = useState(false);
    const [geselecteerdVoertuig, setGeselecteerdVoertuig] = useState<Doc<"voertuigen"> | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "info" | "success" | "warning" } | null>(null);

    function openNieuwVoertuig() {
        setVoertuigPreFill(undefined);
        setToonVoertuigKlantKeuze(true);
    }

    function handleKlantKeuze(keuze: ScanKlantKeuzeResult) {
        setToonVoertuigKlantKeuze(false);
        setVoertuigPreFill(keuze.klantId ? { klantId: keuze.klantId, klantNaam: keuze.klantNaam } : {});
        setToonVoertuigModal(true);
    }

    function sluitVoertuigModals() {
        setToonVoertuigKlantKeuze(false);
        setToonVoertuigModal(false);
        setVoertuigPreFill(undefined);
    }

    // ── Loading state — skeleton ───────────────────────────────────────────
    if (voertuigen === undefined || apkWaarschuwingen === undefined) {
        return <DashboardSkeleton />;
    }

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>

            {/* Toast notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Domein-rol banner voor niet-gekoppelde gebruikers */}
            {!rolLaden && !domeinRol && (
                <div
                    role="status"
                    style={{
                        padding: "var(--space-3) var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        background: "var(--color-warning-bg)",
                        border: "1px solid var(--color-warning-border)",
                        color: "var(--color-warning)",
                        fontSize: "var(--text-sm)",
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                    }}
                >
                    <IconWarning />
                    Je bent nog niet gekoppeld als garage-medewerker. Vraag de eigenaar om je toe te voegen via{" "}
                    <a href="/medewerkers" style={{ textDecoration: "underline" }}>Medewerkers</a>.
                </div>
            )}

            {/* ── Snelacties: alleen voor balie-rol en hoger ── */}
            {isBalie && (
                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                        className="btn btn-primary btn-sm"
                        id="voertuig-toevoegen-btn"
                        aria-label="Voertuig toevoegen"
                        onClick={openNieuwVoertuig}
                    >
                        + Voertuig toevoegen
                    </button>

                    <button
                        className="btn btn-ghost btn-sm"
                        id="klant-toevoegen-btn"
                        aria-label="Klant toevoegen"
                        onClick={() => setToonKlantModal(true)}
                    >
                        + Klant toevoegen
                    </button>

                    {isEigenaar && (
                        <button
                            className="btn btn-ghost btn-sm"
                            id="exporteer-btn"
                            aria-label="Exporteer klantdata als CSV"
                            style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}
                            onClick={() =>
                                setToast({
                                    message: "Export-functionaliteit wordt binnenkort beschikbaar gesteld.",
                                    type: "info",
                                })
                            }
                        >
                            <IconDownload />
                            Exporteer klantdata
                        </button>
                    )}
                </div>
            )}

            {/* APK Waarschuwingen */}
            {apkWaarschuwingen.length > 0 && (
                <section>
                    <h2 style={{
                        fontSize: "var(--text-base)",
                        fontWeight: "var(--weight-semibold)",
                        marginBottom: "var(--space-3)",
                        color: "var(--color-error)",
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                    }}>
                        <IconWarning />
                        APK verloopt binnenkort ({apkWaarschuwingen.length})
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        {apkWaarschuwingen.map((v) => (
                            <div
                                key={v._id}
                                style={{
                                    padding: "var(--space-3) var(--space-4)",
                                    borderRadius: "var(--radius-md)",
                                    background: "var(--color-error-bg)",
                                    border: "1px solid var(--color-error-border)",
                                    color: "var(--color-error)",
                                    fontSize: "var(--text-sm)",
                                }}
                            >
                                <strong>{v.kenteken}</strong> — {v.merk} {v.model}{" "}
                                | APK verloopt: {v.apkVervaldatum ? formatDatum(v.apkVervaldatum) : "onbekend"}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Voertuigenlijst */}
            <section>
                <h2 style={{
                    fontSize: "var(--text-base)",
                    fontWeight: "var(--weight-semibold)",
                    marginBottom: "var(--space-3)",
                    color: "var(--color-heading)",
                }}>
                    Voertuigen ({voertuigen.length})
                </h2>

                {voertuigen.length === 0 ? (
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>
                        Nog geen voertuigen geregistreerd.
                    </p>
                ) : (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                            gap: "var(--space-4)",
                        }}
                    >
                        {voertuigen.map((v) => (
                            <VoertuigCard
                                key={v._id}
                                voertuig={v}
                                onClick={() => setGeselecteerdVoertuig(v)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* ── Modals ── */}
            {toonVoertuigKlantKeuze && (
                <ScanKlantKeuzeModal
                    onKeuze={handleKlantKeuze}
                    onSluit={sluitVoertuigModals}
                />
            )}
            {toonVoertuigModal && (
                <NieuwVoertuigModal
                    preFill={voertuigPreFill}
                    onSluit={sluitVoertuigModals}
                />
            )}
            {toonKlantModal && (
                <NieuweKlantModal onSluit={() => setToonKlantModal(false)} />
            )}
            {geselecteerdVoertuig && (
                <VoertuigDetailPanel voertuig={geselecteerdVoertuig} onSluit={() => setGeselecteerdVoertuig(null)} />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// VoertuigCard — professionele herdesign met volledige data-hiërarchie
// ---------------------------------------------------------------------------

type BrandstofType = "Benzine" | "Diesel" | "Hybride" | "EV" | "LPG";

const BRANDSTOF_CONFIG: Record<BrandstofType, { color: string; bg: string }> = {
    Benzine: { color: "var(--color-warning-text)", bg: "var(--color-warning-bg)" },
    Diesel: { color: "var(--color-info-text)", bg: "var(--color-info-bg)" },
    Hybride: { color: "var(--color-success-text)", bg: "var(--color-success-bg)" },
    EV: { color: "var(--color-info-text)", bg: "var(--color-info-bg)" },
    LPG: { color: "var(--color-muted)", bg: "var(--color-surface)" },
};

function apkUrgency(apkMs: number): { label: string; color: string; bg: string; border: string } {
    const daysLeft = Math.ceil((apkMs - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { label: `Verlopen (${Math.abs(daysLeft)}d)`, color: "var(--color-error-text)", bg: "var(--color-error-bg)", border: "var(--color-error-border)" };
    if (daysLeft <= 14) return { label: `${daysLeft}d resterend`, color: "var(--color-warning-text)", bg: "var(--color-warning-bg)", border: "var(--color-warning-border)" };
    if (daysLeft <= 30) return { label: formatDatum(apkMs), color: "var(--color-warning-text)", bg: "var(--color-warning-bg)", border: "var(--color-warning-border)" };
    return { label: formatDatum(apkMs), color: "var(--color-muted)", bg: "transparent", border: "var(--color-border)" };
}

interface VoertuigCardProps {
    voertuig: Doc<"voertuigen">;
    onClick: () => void;
}

function VoertuigCard({ voertuig: v, onClick }: VoertuigCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    const prefersReducedMotion =
        typeof window !== "undefined"
            ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
            : false;

    const transition = prefersReducedMotion
        ? "none"
        : "border-color var(--transition-base), box-shadow var(--transition-base), background var(--transition-base), transform 100ms ease";

    const fuel = BRANDSTOF_CONFIG[v.brandstof as BrandstofType] ?? { color: "var(--color-muted)", bg: "var(--color-surface)" };
    const apk = v.apkVervaldatum ? apkUrgency(v.apkVervaldatum) : null;

    // Fix: voorkom "Mitsubishi Mitsubishi Colt" wanneer model al het merk bevat
    const displayModel = v.model.toLowerCase().startsWith(v.merk.toLowerCase())
        ? v.model
        : `${v.merk} ${v.model}`;

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`Bekijk details van ${v.kenteken}`}
            onClick={onClick}
            onKeyDown={(e) => e.key === "Enter" && onClick()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            style={{
                borderRadius: "var(--radius-xl)",
                background: isHovered ? "var(--glass-bg-strong)" : "var(--glass-bg)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: `1px solid ${isHovered ? "var(--color-border-luminous)" : "var(--glass-border)"}`,
                boxShadow: isHovered ? "var(--shadow-accent)" : "var(--glass-shadow)",
                transition,
                transform: isPressed && !prefersReducedMotion ? "scale(0.98)" : "scale(1)",
                cursor: "pointer",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* ── Header: kenteken + brandstof badge ── */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "var(--space-3) var(--space-4)",
                borderBottom: "1px solid var(--glass-border)",
            }}>
                <span style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: "var(--weight-bold)",
                    fontSize: "var(--text-base)",
                    color: "var(--color-heading)",
                    letterSpacing: "var(--tracking-wider)",
                    background: "var(--gradient-accent-subtle)",
                    border: "1px solid var(--color-border-luminous)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.25em 0.75em",
                }}>
                    {v.kenteken}
                </span>

                <span style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-medium)",
                    color: fuel.color,
                    background: fuel.bg,
                    border: `1px solid ${fuel.color}40`,
                    borderRadius: "var(--radius-full)",
                    padding: "0.2em 0.7em",
                }}>
                    {v.brandstof}
                </span>
            </div>

            {/* ── Body ── */}
            <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)", flex: 1 }}>

                {/* Merk + Model (grote naam) */}
                <div>
                    <p style={{
                        color: "var(--color-heading)",
                        fontWeight: "var(--weight-bold)",
                        fontSize: "var(--text-lg, 1.125rem)",
                        lineHeight: 1.2,
                        margin: 0,
                    }}>
                        {displayModel}
                    </p>
                    <p style={{ color: "var(--color-muted)", fontSize: "var(--text-xs)", marginTop: "var(--space-1)" }}>
                        Bouwjaar {v.bouwjaar}
                        {v.meldcode && (
                            <> · <span style={{
                                fontFamily: "var(--font-mono)",
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-sm)",
                                padding: "0 0.4em",
                                fontSize: "0.9em",
                            }}>{v.meldcode}</span></>
                        )}
                    </p>
                </div>

                {/* ── Data badges: km + APK ── */}
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                    {v.kilometerstand !== undefined && (
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3em",
                            fontSize: "var(--text-xs)",
                            color: "var(--color-body)",
                            background: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-md)",
                            padding: "0.25em 0.6em",
                        }}>
                            {/* Speedometer icon */}
                            <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {v.kilometerstand.toLocaleString("nl-NL")} km
                        </div>
                    )}

                    {apk && (
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3em",
                            fontSize: "var(--text-xs)",
                            fontWeight: "var(--weight-medium)",
                            color: apk.color,
                            background: apk.bg,
                            border: `1px solid ${apk.border}`,
                            borderRadius: "var(--radius-md)",
                            padding: "0.25em 0.6em",
                        }}>
                            {/* Calendar icon */}
                            <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            APK {apk.label}
                        </div>
                    )}
                </div>

                {/* VIN — compact en monospace */}
                {v.vin && (
                    <p style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--text-xs)",
                        color: "var(--color-muted)",
                        letterSpacing: "0.04em",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        margin: 0,
                    }}>
                        {v.vin}
                    </p>
                )}

                {/* Notities */}
                {v.voertuigNotities && (
                    <p style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-muted)",
                        fontStyle: "italic",
                        borderTop: "1px solid var(--color-border)",
                        paddingTop: "var(--space-2)",
                        margin: 0,
                        lineHeight: 1.4,
                    }}>
                        {v.voertuigNotities}
                    </p>
                )}
            </div>

            {/* ── Footer: details hint (verschijnt bij hover) ── */}
            <div style={{
                padding: "var(--space-2) var(--space-4)",
                borderTop: "1px solid var(--glass-border)",
                fontSize: "var(--text-xs)",
                color: "var(--color-muted)",
                display: "flex",
                justifyContent: "flex-end",
                opacity: isHovered ? 1 : 0,
                transition: prefersReducedMotion ? "none" : "opacity 150ms ease",
            }}>
                Klik voor details →
            </div>
        </div>
    );
}

