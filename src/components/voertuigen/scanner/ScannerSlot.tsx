/**
 * src/components/voertuigen/scanner/ScannerSlot.tsx
 *
 * Uitbreidingsslot voor de toekomstige kentekenscanner.
 *
 * Nu: disabled knop met "binnenkort beschikbaar" melding.
 * Later: vervang de button-body door <KentekenScanner onGescanned={onKenteken} />
 *
 * Props:
 *   onKenteken — callback met het gescande kenteken (string)
 *               wordt al doorgevoerd zodat de parent straks geen aanpassingen nodig heeft.
 */

interface ScannerSlotProps {
    /** Wordt aangeroepen zodra de scanner een kenteken herkent. */
    onKenteken?: (kenteken: string) => void;
    /** Optioneel label — default "Kenteken Scannen" */
    label?: string;
}

export default function ScannerSlot({ onKenteken: _onKenteken, label = "Kenteken Scannen" }: ScannerSlotProps) {
    return (
        <button
            type="button"
            disabled
            title="Kentekenscanner — binnenkort beschikbaar"
            aria-label="Kentekenscanner, binnenkort beschikbaar"
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-4)",
                minHeight: "44px",
                borderRadius: "var(--radius-md)",
                border: "1.5px dashed var(--color-border)",
                background: "transparent",
                color: "var(--color-muted)",
                fontSize: "var(--text-sm)",
                cursor: "not-allowed",
                opacity: 0.6,
                userSelect: "none",
            }}
        >
            📷 {label}
            <span style={{
                fontSize: "var(--text-xs)",
                padding: "1px 6px",
                borderRadius: "var(--radius-sm)",
                background: "var(--glass-bg-subtle)",
                border: "1px solid var(--color-border)",
                color: "var(--color-muted)",
            }}>
                binnenkort
            </span>
        </button>
    );
}
