/**
 * src/components/werkplaats/MonteurWerkplaatsView.tsx
 *
 * Monteur / Stagiair weergave: het volledige Kanban-bord.
 * Wrapper rond WerkplaatsBord voor consistente structuur
 * met de andere rol-views (Balie, Eigenaar).
 */

import WerkplaatsBord from "./WerkplaatsBord";

export default function MonteurWerkplaatsView() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            <WerkplaatsBord />
        </div>
    );
}
