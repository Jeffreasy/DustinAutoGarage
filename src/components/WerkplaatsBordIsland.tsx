/**
 * src/components/WerkplaatsBordIsland.tsx
 *
 * Één React island dat LaventeConvexProvider + WerkplaatsBord
 * in DEZELFDE React root rendert.
 *
 * Waarom: Astro islands zijn onafhankelijke React roots.
 * Oplossing: één island met client:only="react" — zie DashboardIsland pattern.
 */

import { LaventeConvexProvider } from "./LaventeConvexProvider";
import WerkplaatsBord from "./WerkplaatsBord";

export default function WerkplaatsBordIsland() {
    return (
        <LaventeConvexProvider>
            <WerkplaatsBord />
        </LaventeConvexProvider>
    );
}
