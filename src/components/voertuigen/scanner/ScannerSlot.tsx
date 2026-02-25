/**
 * src/components/voertuigen/scanner/ScannerSlot.tsx
 *
 * Verbindingsslot voor de KentekenScanner.
 * Delegeert naar KentekenScanner met de juiste prop-mapping.
 *
 * Props:
 *   onKenteken — callback met het gescande kenteken (string)
 *   label      — optioneel knoplabel
 */

import KentekenScanner from "./KentekenScanner";

interface ScannerSlotProps {
    onKenteken?: (kenteken: string) => void;
    label?: string;
}

export default function ScannerSlot({ onKenteken, label }: ScannerSlotProps) {
    return (
        <KentekenScanner
            label={label}
            onGescanned={(kenteken) => {
                onKenteken?.(kenteken);
            }}
        />
    );
}
