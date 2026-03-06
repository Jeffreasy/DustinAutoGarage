/**
 * src/components/voertuigen/scanner/ScannerSlot.tsx
 *
 * Activatie-wrapper voor de KentekenScanner.
 * Ondersteunt twee callbacks:
 *   - onKenteken: alleen het kenteken (backward compat, Monteur)
 *   - onGescandResultaat: kenteken + volledige voertuigdata (smart handler, Balie)
 */

import KentekenScanner from "./KentekenScanner";
import type { ScanVoertuigData } from "../../../hooks/useScannerActie";

interface ScannerSlotProps {
    /** Backward compat: alleen kenteken string (Monteur zoekfilter) */
    onKenteken?: (kenteken: string) => void;
    /** Smart handler: kenteken + volledige voertuigdata uit OCR+RDW pipeline */
    onGescandResultaat?: (kenteken: string, voertuig?: ScanVoertuigData) => void;
    label?: string;
}

export default function ScannerSlot({
    onKenteken,
    onGescandResultaat,
    label = "Scan Kenteken",
}: ScannerSlotProps) {
    return (
        <KentekenScanner
            onGescanned={(kenteken, voertuig, aiImageUrl) => {
                onKenteken?.(kenteken);
                // Voeg ai_image_url toe aan het voertuig-object zodat useScannerActie het doorgeeft
                onGescandResultaat?.(kenteken, voertuig ? { ...voertuig, ai_image_url: aiImageUrl } : undefined);
            }}
            label={label}
        />
    );
}
