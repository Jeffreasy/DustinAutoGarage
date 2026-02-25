/**
 * src/components/voertuigen/VoertuigenModule.tsx
 *
 * Rol-dispatcher voor de Voertuigen module.
 * ui-ux-pro-max: spinner SVG ipv ⏳ emoji tekst.
 */

import { useRol } from "../../hooks/useRol";
import MonteurVoertuigenView from "./MonteurVoertuigenView";
import BalieVoertuigenView from "./BalieVoertuigenView";
import EigenaarVoertuigenView from "./EigenaarVoertuigenView";

function LadenSpinner() {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={2} strokeLinecap="round" aria-hidden="true" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", margin: 0 }}>Laden…</p>
            </div>
        </div>
    );
}

export default function VoertuigenModule() {
    const { domeinRol, isLoading } = useRol();
    if (isLoading) return <LadenSpinner />;
    if (domeinRol === "eigenaar") return <EigenaarVoertuigenView />;
    if (domeinRol === "balie") return <BalieVoertuigenView />;
    return <MonteurVoertuigenView />;
}
