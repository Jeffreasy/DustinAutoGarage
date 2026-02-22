/**
 * src/components/KlantenModule.tsx
 *
 * Rol-dispatcher voor de Klanten module.
 * Leest de domein-rol van de ingelogde medewerker en rendert de juiste subview.
 *
 *   monteur / stagiair  →  MonteurKlantenView  (read-only adresboek)
 *   balie               →  BalieKlantenView    (full CRUD + AVG)
 *   eigenaar            →  EigenaarKlantenView (balie + omzet + export + GDPR)
 */

import { useRol } from "../hooks/useRol";
import MonteurKlantenView from "./klanten/MonteurKlantenView";
import BalieKlantenView from "./klanten/BalieKlantenView";
import EigenaarKlantenView from "./klanten/EigenaarKlantenView";

export default function KlantenModule() {
    const { domeinRol, isLoading } = useRol();

    if (isLoading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh" }}>
                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>⏳ Rol laden…</p>
            </div>
        );
    }

    if (domeinRol === "eigenaar") return <EigenaarKlantenView />;
    if (domeinRol === "balie") return <BalieKlantenView />;
    // monteur, stagiair, null → uitgeklede read-only view
    return <MonteurKlantenView />;
}
