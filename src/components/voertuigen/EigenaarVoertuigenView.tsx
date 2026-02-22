/**
 * src/components/voertuigen/EigenaarVoertuigenView.tsx
 *
 * Eigenaar view: fleet-stats dashboard + volledige BalieVoertuigenView.
 */

import { useVoertuigenLijst, useApkWaarschuwingen } from "../../hooks/useVoertuigen";
import BalieVoertuigenView from "./BalieVoertuigenView";

function FleetStats() {
    const voertuigen = useVoertuigenLijst();
    const bijnaVerlopen = useApkWaarschuwingen(30);
    const nu = Date.now();
    const verlopen = (voertuigen ?? []).filter(
        (v) => v.apkVervaldatum && v.apkVervaldatum < nu
    );

    const stats = [
        { label: "Totaal voertuigen", waarde: voertuigen?.length ?? "…", kleur: "var(--color-heading)" },
        { label: "APK verlopen", waarde: verlopen.length, kleur: verlopen.length > 0 ? "var(--color-error, #dc2626)" : "var(--color-success, #16a34a)" },
        { label: "APK binnen 30d", waarde: (bijnaVerlopen?.length ?? 0) - verlopen.length, kleur: (bijnaVerlopen?.length ?? 0) > verlopen.length ? "var(--color-warning, #d97706)" : "var(--color-success, #16a34a)" },
    ];

    return (
        <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", color: "var(--color-heading)", margin: 0 }}>
                📊 Vloot-overzicht
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)" }}>
                {stats.map(({ label, waarde, kleur }) => (
                    <div key={label} className="card" style={{ padding: "var(--space-4)", textAlign: "center" }}>
                        <p style={{ fontSize: "var(--text-3xl, 2rem)", fontWeight: 900, color: kleur, margin: "0 0 var(--space-1)", lineHeight: 1 }}>
                            {waarde}
                        </p>
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {label}
                        </p>
                    </div>
                ))}
            </div>

            {/* APK-alarmen */}
            {verlopen.length > 0 && (
                <div className="alert alert-error" role="alert">
                    <strong>⚠️ {verlopen.length} voertuig{verlopen.length > 1 ? "en" : ""} met verlopen APK:</strong>
                    {" "}{verlopen.map((v) => v.kenteken).join(" · ")}
                </div>
            )}
        </section>
    );
}

export default function EigenaarVoertuigenView() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
            <FleetStats />
            <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: 0 }} />
            <BalieVoertuigenView />
        </div>
    );
}
