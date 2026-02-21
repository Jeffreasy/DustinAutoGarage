/**
 * src/components/DashboardIsland.tsx
 *
 * Één React island dat LaventeConvexProvider + VoertuigenDashboard
 * in DEZELFDE React root rendert.
 *
 * Waarom: Astro islands zijn onafhankelijke React roots. Als ze apart
 * worden gemount (client:load op beide), deelt VoertuigenDashboard
 * GEEN context met LaventeConvexProvider → useQuery crasht.
 *
 * Oplossing: één island met client:only="react" zodat Astro dit
 * component volledig client-side rendert als één React tree.
 */

import { LaventeConvexProvider } from "./LaventeConvexProvider";
import VoertuigenDashboard from "./VoertuigenDashboard";

export default function DashboardIsland() {
    return (
        <LaventeConvexProvider>
            <VoertuigenDashboard />
        </LaventeConvexProvider>
    );
}
