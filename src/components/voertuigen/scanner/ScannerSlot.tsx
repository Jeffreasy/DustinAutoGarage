/**
 * src/components/voertuigen/scanner/ScannerSlot.tsx
 *
 * Activatie-wrapper voor de KentekenScanner.
 * Stuurt het gevonden kenteken door via de `onKenteken` callback.
 */

import KentekenScanner from "./KentekenScanner";

interface ScannerSlotProps {
    onKenteken?: (kenteken: string) => void;
    label?: string;
}

export default function ScannerSlot({ onKenteken, label = "Scan Kenteken" }: ScannerSlotProps) {
    return (
        <KentekenScanner
            onGescanned={(kenteken) => onKenteken?.(kenteken)}
            label={label}
        />
    );
}
