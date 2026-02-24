/**
 * src/components/WerkplaatsBordIsland.tsx
 *
 * Island wrapper: LaventeConvexProvider + WerkplaatsModule in één React root.
 * WerkplaatsModule dispatcht naar de juiste subview op basis van domeinRol.
 */

import { LaventeConvexProvider } from "../providers/LaventeConvexProvider";
import WerkplaatsModule from "./WerkplaatsModule";

export default function WerkplaatsBordIsland() {
    return (
        <LaventeConvexProvider>
            <WerkplaatsModule />
        </LaventeConvexProvider>
    );
}
