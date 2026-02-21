/**
 * src/components/VoertuigenDashboard.tsx
 *
 * React Island — toont de lijst met voertuigen en APK-meldingen.
 * Wordt gemount binnen LaventeConvexProvider (die de Convex auth regelt).
 *
 * Queries:
 *   - api.voertuigen.list               → alle voertuigen van de tenant
 *   - api.voertuigen.getBijnaVerlopenApk → APK's die binnen 30 dagen verlopen
 */

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

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
    const voertuigen = useQuery(api.voertuigen.list);
    const apkWaarschuwingen = useQuery(api.voertuigen.getBijnaVerlopenApk, {
        dagenVooruit: 30,
    });

    // ── Loading state ─────────────────────────────────────────────────────
    if (voertuigen === undefined || apkWaarschuwingen === undefined) {
        return (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-muted)" }}>
                <p>Voertuigendata laden…</p>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

            {/* APK Waarschuwingen */}
            {apkWaarschuwingen.length > 0 && (
                <section>
                    <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem", color: "var(--color-error-text)" }}>
                        ⚠️ APK verloopt binnenkort ({apkWaarschuwingen.length})
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {apkWaarschuwingen.map((v) => (
                            <div
                                key={v._id}
                                style={{
                                    padding: "0.75rem 1rem",
                                    borderRadius: "var(--radius-md)",
                                    background: "var(--color-error-bg)",
                                    border: "1px solid var(--color-error-border)",
                                    color: "var(--color-error-text)",
                                    fontSize: "0.875rem",
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
                <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>
                    Voertuigen ({voertuigen.length})
                </h2>

                {voertuigen.length === 0 ? (
                    <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>
                        Nog geen voertuigen geregistreerd.
                    </p>
                ) : (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                            gap: "1rem",
                        }}
                    >
                        {voertuigen.map((v) => (
                            <div
                                key={v._id}
                                style={{
                                    padding: "1.25rem",
                                    borderRadius: "var(--radius-lg)",
                                    background: "var(--color-surface-2)",
                                    border: "1px solid var(--color-border)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.5rem",
                                }}
                            >
                                {/* Kenteken badge */}
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span
                                        style={{
                                            fontFamily: "monospace",
                                            fontWeight: 700,
                                            fontSize: "0.9rem",
                                            color: "var(--color-heading)",
                                            background: "var(--color-accent-dim)",
                                            border: "1px solid var(--color-accent)",
                                            borderRadius: "var(--radius-md)",
                                            padding: "0.2rem 0.6rem",
                                            letterSpacing: "0.05em",
                                        }}
                                    >
                                        {v.kenteken}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "0.75rem",
                                            color: "var(--color-muted)",
                                            background: "var(--color-surface)",
                                            padding: "0.15rem 0.5rem",
                                            borderRadius: "var(--radius-md)",
                                            border: "1px solid var(--color-border)",
                                        }}
                                    >
                                        {v.brandstof}
                                    </span>
                                </div>

                                {/* Voertuiginfo */}
                                <p style={{ color: "var(--color-heading)", fontWeight: 600, fontSize: "1rem" }}>
                                    {v.merk} {v.model}
                                </p>
                                <p style={{ color: "var(--color-muted)", fontSize: "0.8rem" }}>
                                    Bouwjaar: {v.bouwjaar}
                                    {v.kilometerstand !== undefined && ` · ${v.kilometerstand.toLocaleString("nl-NL")} km`}
                                </p>

                                {/* APK datum */}
                                {v.apkVervaldatum && (
                                    <p style={{ fontSize: "0.8rem", color: "var(--color-body)" }}>
                                        APK: {formatDatum(v.apkVervaldatum)}
                                    </p>
                                )}

                                {/* Notities */}
                                {v.voertuigNotities && (
                                    <p
                                        style={{
                                            fontSize: "0.78rem",
                                            color: "var(--color-muted)",
                                            fontStyle: "italic",
                                            borderTop: "1px solid var(--color-border)",
                                            paddingTop: "0.5rem",
                                            marginTop: "0.25rem",
                                        }}
                                    >
                                        {v.voertuigNotities}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
