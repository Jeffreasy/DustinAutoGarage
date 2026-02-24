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
    const { domeinRol, isLoading, isNietGekoppeld } = useRol();

    if (isLoading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>⏳ Onderhoud laden…</p>
            </div>
        );
    }

    // Cold-start: account nog niet gekoppeld aan de garage
    if (isNietGekoppeld) {
        return (
            <div className="empty-state" style={{ padding: "var(--space-16) var(--space-4)" }}>
                <span className="empty-state-icon">🔗</span>
                <p className="empty-state-title">Account niet gekoppeld</p>
                <p className="empty-state-desc">
                    Je account is nog niet gekoppeld aan de garage. Ga naar{" "}
                    <a href="/medewerkers" style={{ color: "var(--color-accent-text)" }}>Medewerkers</a>{" "}
                    om je account te koppelen.
                </p>
            </div>
        );
    }

    if (domeinRol === "eigenaar") return <EigenaarOnderhoudView />;
    if (domeinRol === "balie") return <BalieOnderhoudView />;
    // monteur, stagiair → read-only
    return <MonteurOnderhoudView />;
}
