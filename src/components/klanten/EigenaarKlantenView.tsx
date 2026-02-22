/**
 * src/components/klanten/EigenaarKlantenView.tsx
 *
 * Eigenaar view: alles van BalieKlantenView plus:
 *   - Top-10 bezoekfrequentie blok
 *   - "Niet gezien in 2+ jaar" melding
 *   - CSV-export knop
 *   - Rode GDPR verwijder-knop (dubbele bevestiging)
 */

import BalieKlantenView from "./BalieKlantenView";
import EigenaarExtras from "./EigenaarExtras";

export default function EigenaarKlantenView() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
            {/* Eigenaar-dashboard bovenaan */}
            <EigenaarExtras />
            {/* Daarna de volledige balie-interface */}
            <BalieKlantenView toonVerwijder />
        </div>
    );
}
