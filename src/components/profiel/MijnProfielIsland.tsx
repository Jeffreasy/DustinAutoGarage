/**
 * src/components/profiel/MijnProfielIsland.tsx
 *
 * Eigen profiel — full-page view (geen modal) voor de ingelogde gebruiker.
 * Hergebruikt de tab-logica van MedewerkerProfielModal maar als pagina-layout.
 */

import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { LaventeConvexProvider } from "../providers/LaventeConvexProvider";
import MedewerkerProfielModal from "../modals/MedewerkerProfielModal";

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
                padding: "var(--space-20) var(--space-4)",
                color: "var(--color-muted)",
                fontSize: "var(--text-sm)",
            }}
        >
            <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                aria-hidden="true"
                style={{ animation: "spin 1s linear infinite" }}
            >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Profiel ophalen…
        </div>
    );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function ProfielSkeleton() {
    return (
        <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            {/* Hero */}
            <div style={{
                display: "flex", alignItems: "center", gap: "var(--space-5)",
                padding: "var(--space-6)", borderRadius: "var(--radius-2xl)",
                background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
            }}>
                <div style={{ width: 80, height: 80, borderRadius: "9999px", background: "var(--skeleton-base)", animation: "pulse 1.5s ease-in-out infinite", flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    <div style={{ width: "40%", height: 22, borderRadius: "var(--radius-md)", background: "var(--skeleton-base)", animation: "pulse 1.5s ease-in-out infinite" }} />
                    <div style={{ width: "20%", height: 18, borderRadius: "var(--radius-full)", background: "var(--skeleton-base)", animation: "pulse 1.5s ease-in-out infinite" }} />
                </div>
            </div>
            {/* Tabs */}
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {[120, 90, 60, 100, 110].map((w, i) => (
                    <div key={i} style={{ width: w, height: 36, borderRadius: "var(--radius-md)", background: "var(--skeleton-base)", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Geen profiel state — Cold start
// ---------------------------------------------------------------------------

function GeenProfielState() {
    const { isAuthenticated } = useConvexAuth();
    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "var(--space-16) var(--space-4)",
            textAlign: "center", gap: "var(--space-4)",
        }}>
            <div style={{ color: "var(--color-muted)", opacity: 0.6 }}>
                <svg viewBox="0 0 24 24" width={48} height={48} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            </div>
            <div>
                <p style={{ margin: "0 0 var(--space-2)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-base)", color: "var(--color-heading)" }}>
                    Nog geen werkplaatsprofiel
                </p>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-muted)", maxWidth: 320, lineHeight: 1.6 }}>
                    Je account is nog niet gekoppeld aan de garage.
                    Ga naar <a href="/medewerkers" style={{ color: "var(--color-accent-text)", textDecoration: "none" }}>Medewerkers</a> om je te registreren.
                </p>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// MijnProfielContent
// ---------------------------------------------------------------------------

function MijnProfielContent() {
    const profiel = useQuery(api.medewerkers.getMijnProfiel);
    // Check of de gebruiker eigenaar/admin is voor edit-rechten
    const [modalOpen, setModalOpen] = useState(true); // always open as page view

    // Loading
    if (profiel === undefined) return <ProfielSkeleton />;

    // Geen profiel (cold-start)
    if (profiel === null) return <GeenProfielState />;

    const medewerkerId = profiel._id as Id<"medewerkers">;

    return (
        <div>
            {/* Hergebruik MedewerkerProfielModal maar als embedded (geen overlay) */}
            <MedewerkerProfielModal
                medewerkerId={medewerkerId}
                isEigenaar={profiel.domeinRol === "eigenaar"}
                isZichzelf={true}
                onClose={() => {
                    // Op de profielpagina gaat "sluiten" terug naar dashboard
                    if (typeof window !== "undefined") {
                        window.location.href = "/dashboard";
                    }
                }}
                embedded={true}
            />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default function MijnProfielIsland() {
    return (
        <LaventeConvexProvider>
            <MijnProfielContent />
        </LaventeConvexProvider>
    );
}
