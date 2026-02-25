/**
 * src/components/klanten/EigenaarKlantenView.tsx
 *
 * Eigenaar view: klantanalyse in een inklapbare sectie, dan de volledige balie-interface.
 */

import { useState } from "react";
import BalieKlantenView from "./BalieKlantenView";
import EigenaarExtras from "./EigenaarExtras";

function IconChevron({ open }: { open: boolean }) {
    return (
        <svg
            viewBox="0 0 24 24" width={16} height={16}
            fill="none" stroke="currentColor" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease", flexShrink: 0 }}
        >
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

export default function EigenaarKlantenView() {
    const [open, setOpen] = useState(false);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

            {/* Inklapbare klantanalyse */}
            <div style={{
                borderRadius: "var(--radius-xl)",
                background: "var(--glass-bg)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid var(--glass-border)",
                overflow: "hidden",
            }}>
                {/* Header — klik om te openen/sluiten */}
                <button
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "var(--space-4) var(--space-5)",
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--color-heading)",
                        borderBottom: open ? "1px solid var(--glass-border)" : "none",
                        transition: "border-color 200ms ease",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="12" y1="20" x2="12" y2="10" />
                            <line x1="18" y1="20" x2="18" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="16" />
                        </svg>
                        <span style={{ fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)" }}>
                            Klantanalyse
                        </span>
                    </div>
                    <IconChevron open={open} />
                </button>

                {/* Uitklapbare inhoud */}
                {open && (
                    <div style={{ padding: "var(--space-5)" }}>
                        <EigenaarExtras />
                    </div>
                )}
            </div>

            {/* Balie-interface altijd zichtbaar */}
            <BalieKlantenView toonVerwijder />
        </div>
    );
}
