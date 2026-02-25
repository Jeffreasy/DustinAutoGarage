/**
 * src/components/voertuigen/EigenaarVoertuigenView.tsx
 *
 * Eigenaar view: vloot-stats + volledige BalieVoertuigenView.
 * ui-ux-pro-max: 📊 → SVG BarChart, glassmorphism stat cards met icon.
 */

import { useVoertuigenLijst, useApkWaarschuwingen, useVerlopenApk } from "../../hooks/useVoertuigen";
import BalieVoertuigenView from "./BalieVoertuigenView";

// ---------------------------------------------------------------------------
// SVG icons
// ---------------------------------------------------------------------------

function IconBarChart() {
    return (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
        </svg>
    );
}

function IconShield() {
    return (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    );
}

function IconShieldAlert() {
    return (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}

function IconCar() {
    return (
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2" />
            <circle cx="9" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function VlootStatCard({ icon, label, waarde, kleur }: { icon: React.ReactNode; label: string; waarde: string | number; kleur: string }) {
    return (
        <div style={{
            padding: "var(--space-4)", borderRadius: "var(--radius-xl)",
            background: "var(--glass-bg)", backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)", border: "1px solid var(--glass-border)",
            display: "flex", flexDirection: "column", gap: "var(--space-2)",
        }}>
            <div style={{
                width: "36px", height: "36px", borderRadius: "var(--radius-md)",
                background: `${kleur}18`, border: `1px solid ${kleur}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: kleur,
            }}>
                {icon}
            </div>
            <p style={{ fontSize: "var(--text-3xl, 2rem)", fontWeight: 900, color: kleur, margin: 0, lineHeight: 1.1 }}>
                {waarde}
            </p>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {label}
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Skeleton voor stat cards
// ---------------------------------------------------------------------------

function StatSkeleton() {
    return (
        <div aria-hidden="true" style={{ padding: "var(--space-4)", borderRadius: "var(--radius-xl)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "var(--radius-md)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ width: "50%", height: "32px", borderRadius: "var(--radius-md)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ width: "70%", height: "12px", borderRadius: "var(--radius-md)", background: "var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// FleetStats
// ---------------------------------------------------------------------------

function FleetStats() {
    const voertuigen = useVoertuigenLijst();
    const verlopen = useVerlopenApk() ?? [];         // APK < nu — eigen geïndexeerde query
    const bijna = useApkWaarschuwingen(30) ?? []; // APK 0..30d — eigen geïndexeerde query

    const isLoading = voertuigen === undefined;

    return (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <IconBarChart /> Vloot-overzicht
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)" }}>
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
                ) : (
                    <>
                        <VlootStatCard
                            icon={<IconCar />}
                            label="Totaal voertuigen"
                            waarde={voertuigen.length}
                            kleur="#6366f1"
                        />
                        <VlootStatCard
                            icon={<IconShieldAlert />}
                            label="APK verlopen"
                            waarde={verlopen.length}
                            kleur={verlopen.length > 0 ? "#dc2626" : "#16a34a"}
                        />
                        <VlootStatCard
                            icon={<IconShield />}
                            label="APK binnen 30d"
                            waarde={bijna.length}
                            kleur={bijna.length > 0 ? "#d97706" : "#16a34a"}
                        />
                    </>
                )}
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// EigenaarVoertuigenView
// ---------------------------------------------------------------------------

export default function EigenaarVoertuigenView() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
            <FleetStats />
            <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: 0 }} />
            <BalieVoertuigenView />
        </div>
    );
}
