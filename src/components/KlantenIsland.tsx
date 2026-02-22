/**
 * src/components/KlantenIsland.tsx
 * Island wrapper: LaventeConvexProvider + KlantenModule in één React root.
 */
import { LaventeConvexProvider } from "./LaventeConvexProvider";
import KlantenModule from "./KlantenModule";

export default function KlantenIsland() {
    return (
        <LaventeConvexProvider>
            <KlantenModule />
        </LaventeConvexProvider>
    );
}
