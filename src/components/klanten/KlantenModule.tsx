/**
 * src/components/klanten/KlantenModule.tsx
 * Rol-dispatcher voor de Klanten module.
 */

import { useRol } from "../../hooks/useRol";
import MonteurKlantenView from "./MonteurKlantenView";
import BalieKlantenView from "./BalieKlantenView";
import EigenaarKlantenView from "./EigenaarKlantenView";

function RolLadenSkeleton() {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh" }}>
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-3)",
            }}>
                {/* Spinner */}
                <svg
                    width={24} height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-muted)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    style={{ animation: "spin 1s linear infinite" }}
                    aria-hidden="true"
                >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", margin: 0 }}>
                    Rol laden…
                </p>
            </div>
        </div>
    );
}

export default function KlantenModule() {
    const { domeinRol, isLoading } = useRol();

    if (isLoading) return <RolLadenSkeleton />;

    if (domeinRol === "eigenaar") return <EigenaarKlantenView />;
    if (domeinRol === "balie") return <BalieKlantenView />;
    return <MonteurKlantenView />;
}
