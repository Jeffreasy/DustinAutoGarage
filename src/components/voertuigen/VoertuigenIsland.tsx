/**
 * src/components/VoertuigenIsland.tsx
 * Island wrapper: LaventeConvexProvider + VoertuigenModule.
 */
import { LaventeConvexProvider } from "../providers/LaventeConvexProvider";
import VoertuigenModule from "./VoertuigenModule";

export default function VoertuigenIsland() {
    return (
        <LaventeConvexProvider>
            <VoertuigenModule />
        </LaventeConvexProvider>
    );
}
