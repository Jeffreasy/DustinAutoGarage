/**
 * src/components/WerkplaatsModule.tsx
 *
 * Rol-dispatcher voor de Werkplaats pagina.
 * Leest domeinRol en rendert de passende subview.
 *
 *   monteur / stagiair  →  MonteurWerkplaatsView  (Kanban, read-focus)
 *   balie               →  BalieWerkplaatsView  (planningslijst + Kanban)
 *   eigenaar            →  EigenaarWerkplaatsView  (Kanban + archief + werkplekken)
 */

import { useRol } from "../hooks/useRol";
import BalieWerkplaatsView from "./werkplaats/BalieWerkplaatsView";
import EigenaarWerkplaatsView from "./werkplaats/EigenaarWerkplaatsView";
import MonteurWerkplaatsView from "./werkplaats/MonteurWerkplaatsView";

export default function WerkplaatsModule() {
    const { domeinRol, isLoading } = useRol();

    if (isLoading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>⏳ Bord laden…</p>
            </div>
        );
    }

    if (domeinRol === "eigenaar") return <EigenaarWerkplaatsView />;
    if (domeinRol === "balie") return <BalieWerkplaatsView />;
    // monteur, stagiair, onbekend → Kanban via MonteurWerkplaatsView
    return <MonteurWerkplaatsView />;
}
