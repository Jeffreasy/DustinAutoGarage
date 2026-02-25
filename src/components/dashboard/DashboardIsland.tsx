/**
 * src/components/dashboard/DashboardIsland.tsx
 *
 * Één React island: LaventeConvexProvider + GarageDashboard in dezelfde React root.
 */

import { LaventeConvexProvider } from "../providers/LaventeConvexProvider";
import GarageDashboard from "./GarageDashboard";

export default function DashboardIsland() {
    return (
        <LaventeConvexProvider>
            <GarageDashboard />
        </LaventeConvexProvider>
    );
}
