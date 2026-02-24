/**
 * src/components/VoertuigenModule.tsx
 *
 * Rol-dispatcher voor de Voertuigen module.
 *
 *   monteur / stagiair  →  MonteurVoertuigenView  (lees-only)
 *   balie               →  BalieVoertuigenView    (CRUD + nieuw voertuig)
 *   eigenaar            →  EigenaarVoertuigenView (fleet-stats + balie)
 */

import { useRol } from "../../hooks/useRol";
import MonteurVoertuigenView from "./MonteurVoertuigenView";
import BalieVoertuigenView from "./BalieVoertuigenView";
import EigenaarVoertuigenView from "./EigenaarVoertuigenView";

export default function VoertuigenModule() {
    const { domeinRol, isLoading } = useRol();

    if (isLoading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh" }}>
                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)" }}>⏳ Laden…</p>
            </div>
        );
    }

    if (domeinRol === "eigenaar") return <EigenaarVoertuigenView />;
    if (domeinRol === "balie") return <BalieVoertuigenView />;
    return <MonteurVoertuigenView />;
}
