/**
 * src/components/OnderhoudshistorieIsland.tsx
 *
 * Astro React Island — wraps LaventeConvexProvider + OnderhoudshistorieModule
 * in één React root, identiek aan het patroon van KlantenIsland, VoertuigenIsland etc.
 */

import { LaventeConvexProvider } from "../providers/LaventeConvexProvider";
import OnderhoudshistorieModule from "./OnderhoudshistorieModule";

export default function OnderhoudshistorieIsland() {
    return (
        <LaventeConvexProvider>
            <OnderhoudshistorieModule />
        </LaventeConvexProvider>
    );
}
