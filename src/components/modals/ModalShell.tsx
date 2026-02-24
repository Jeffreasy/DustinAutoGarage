/**
 * src/components/modals/ModalShell.tsx
 *
 * Responsive modal-wrapper — single source of truth voor alle modals.
 *
 * Gedrag:
 *   Mobiel (<640px)  → Bottom sheet: schuift omhoog vanuit onderkant scherm.
 *                       95vh max, inner scrollbaar, afronden alleen boven.
 *   Desktop (≥640px) → Centered modal: zelfde gedrag als voorheen.
 *
 * Functies:
 *   - Backdrop met blur-effect en onClick-sluiting
 *   - Escape-toets listener via useEffect
 *   - stopPropagation op de inner container
 *   - ARIA: role="dialog", aria-modal="true"
 *   - Configureerbare maxWidth (desktop only)
 *
 * Gebruik:
 *   <ModalShell onSluit={...} ariaLabel="Nieuwe klant toevoegen" maxWidth="560px">
 *     <div>...inhoud...</div>
 *   </ModalShell>
 */

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIsMobiel } from "../../hooks/useMediaQuery";

interface ModalShellProps {
    /** Callback bij sluiten (Escape, backdrop-klik, ✕ knop) */
    onSluit: () => void;
    /** Toegankelijkheidslabel voor screenreaders */
    ariaLabel: string;
    /** Maximale breedte van het modal-venster (default: 560px, desktop only) */
    maxWidth?: string;
    /** Modal-inhoud */
    children: ReactNode;
}

export default function ModalShell({
    onSluit,
    ariaLabel,
    maxWidth = "560px",
    children,
}: ModalShellProps) {
    const isMobiel = useIsMobiel();

    // Escape-toets sluiting
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onSluit();
        }
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onSluit]);

    // ── Mobiel: Bottom Sheet ──────────────────────────────────────────────────
    if (isMobiel) {
        return createPortal(
            <div
                onClick={onSluit}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    zIndex: 9999,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                }}
            >
                {/* Bottom sheet container */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: "100%",
                        maxHeight: "95dvh",
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
                        overflow: "hidden",
                        boxShadow: "0 -8px 40px rgba(0,0,0,0.25)",
                        display: "flex",
                        flexDirection: "column",
                        animation: "slideUp 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
                    }}
                >
                    {/* Drag handle */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            padding: "var(--space-3) var(--space-3) 0",
                            flexShrink: 0,
                            cursor: "pointer",
                        }}
                        onClick={onSluit}
                        aria-label="Sluit paneel"
                        role="button"
                    >
                        <div style={{
                            width: "40px",
                            height: "4px",
                            borderRadius: "9999px",
                            background: "var(--color-border)",
                        }} />
                    </div>

                    {/* Scrollbare inhoud */}
                    <div style={{
                        overflowY: "auto",
                        flex: 1,
                        WebkitOverflowScrolling: "touch" as any,
                    }}>
                        {children}
                    </div>
                </div>

                {/* Slide-up keyframe */}
                <style>{`
                    @keyframes slideUp {
                        from { transform: translateY(100%); }
                        to   { transform: translateY(0); }
                    }
                `}</style>
            </div>,
            document.body
        );
    }

    // ── Desktop: Centered Modal ───────────────────────────────────────────────
    return createPortal(
        <div
            onClick={onSluit}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: "var(--space-4)",
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "100%",
                    maxWidth,
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-xl)",
                    overflow: "hidden",
                    boxShadow: "var(--shadow-xl)",
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {children}
            </div>
        </div>,
        document.body
    );
}
