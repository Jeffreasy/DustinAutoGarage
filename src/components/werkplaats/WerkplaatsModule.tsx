/**
 * src/components/werkplaats/WerkplaatsModule.tsx
 *
 * Rol-dispatcher voor de Werkplaats pagina.
 */

import { useRol } from "../../hooks/useRol";
import BalieWerkplaatsView from "./BalieWerkplaatsView";
import EigenaarWerkplaatsView from "./EigenaarWerkplaatsView";
import MonteurWerkplaatsView from "./MonteurWerkplaatsView";

function LadenSpinner() {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth={2} strokeLinecap="round" aria-label="Laden" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
        </div>
    );
}

export default function WerkplaatsModule() {
    const { domeinRol, isLoading } = useRol();

    if (isLoading) return <LadenSpinner />;

    if (domeinRol === "eigenaar") return <EigenaarWerkplaatsView />;
    if (domeinRol === "balie") return <BalieWerkplaatsView />;
    return <MonteurWerkplaatsView />;
}
