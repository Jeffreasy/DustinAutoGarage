/**
 * src/components/OnderhoudshistorieModule.tsx
 *
 * Rol-dispatcher voor de Onderhoud pagina.
 * Leest domeinRol en rendert de passende subview.
 *
 *   eigenaar  →  EigenaarOnderhoudView  (stats + volledig dossier + verwijder)
 *   balie     →  BalieOnderhoudView     (zoeken + registreren)
 *   monteur / stagiair → MonteurOnderhoudView (read-only dossier)
 */

import { useRol } from "../hooks/useRol";
import BalieOnderhoudView from "./onderhoud/BalieOnderhoudView";
import MonteurOnderhoudView from "./onderhoud/MonteurOnderhoudView";
import EigenaarOnderhoudView from "./onderhoud/EigenaarOnderhoudView";

export default function OnderhoudshistorieModule() {
    const { domeinRol, isLoading } = useRol();

    if (isLoading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>⏳ Onderhoud laden…</p>
            </div>
        );
    }

    if (domeinRol === "eigenaar") return <EigenaarOnderhoudView />;
    if (domeinRol === "balie") return <BalieOnderhoudView />;
    // monteur, stagiair → read-only
    return <MonteurOnderhoudView />;
}
