/**
 * src/components/ui/Icons.tsx
 *
 * Gedeelde SVG icon-bibliotheek voor de gehele app.
 * Alle componenten importeren hier vandaan — nooit lokaal dupliceren.
 *
 * Gebruik:
 *   import { IconWrench, IconPlus } from "../ui/Icons";
 *
 * Props:
 *   size        — pixel-maat (width + height), default verschilt per icon
 *   className   — extra CSS klassen voor layout (b.v. flex-shrink)
 *   strokeWidth — lijndikte override (default 2)
 *
 * ⚠️ KLEURREGELS:
 *   - Gebruik altijd stroke="currentColor" — nooit hardcoded kleuren.
 *     Dit respecteert light/dark mode en context-kleur automatisch.
 *   - Uitzondering: icons met fill (bijv. logo) mogen dat zelf regelen.
 */

interface IconProps {
    size?: number;
    className?: string;
    strokeWidth?: number;
}

// Gedeelde SVG attributen helper
const svgBase = (size: number, sw: number) => ({
    viewBox: "0 0 24 24" as const,
    width: size,
    height: size,
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    style: { flexShrink: 0 } as React.CSSProperties,
});

// ---------------------------------------------------------------------------
// Werkplek-type iconen
// ---------------------------------------------------------------------------

export function IconWrench({ size = 16, className, strokeWidth = 2 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
    );
}

export function IconRuler({ size = 16, className, strokeWidth = 2 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <path d="M3 7l4-4 14 14-4 4z" />
            <line x1="8" y1="12" x2="12" y2="8" />
            <line x1="12" y1="16" x2="16" y2="12" />
        </svg>
    );
}

export function IconDroplets({ size = 16, className, strokeWidth = 2 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
            <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
        </svg>
    );
}

export function IconParking({ size = 16, className, strokeWidth = 2 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
        </svg>
    );
}

export function IconGrid({ size = 16, className, strokeWidth = 2 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Actie iconen
// ---------------------------------------------------------------------------

export function IconPlus({ size = 14, className, strokeWidth = 2.5 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

export function IconX({ size = 14, className, strokeWidth = 2 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

export function IconPencil({ size = 14, className, strokeWidth = 2 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

export function IconSave({ size = 14, className, strokeWidth = 2 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
        </svg>
    );
}

export function IconTrash({ size = 14, className, strokeWidth = 2 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
    );
}

export function IconSettings({ size = 18, className, strokeWidth = 2 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    );
}

export function IconChevronUp({ size = 12, className, strokeWidth = 2.5 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <polyline points="18 15 12 9 6 15" />
        </svg>
    );
}

export function IconChevronDown({ size = 12, className, strokeWidth = 2.5 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

export function IconZap({ size = 14, className, strokeWidth = 2 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    );
}

export function IconArchive({ size = 14, className, strokeWidth = 2 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
        </svg>
    );
}

export function IconTrophy({ size = 16, className, strokeWidth = 2 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    );
}

/**
 * IconCheckCircle
 * FIXED: was stroke="#16a34a" (hardcoded groen) — broken in light mode.
 * Gebruik nu currentColor; stel kleur in via CSS (color: var(--color-success))
 * op de parent of via className.
 */
export function IconCheckCircle({ size = 20, className, strokeWidth = 2 }: IconProps) {
    return (
        <svg {...svgBase(size, strokeWidth)} className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Map: werkplek type → icoon (voor hergebruik in bord en beheer)
// ---------------------------------------------------------------------------

export type WerkplekType = "Brug" | "Uitlijnbrug" | "Wasplaats" | "Buiten" | "Overig";

/**
 * Gebruik als functie ipv static record om stale JSX references te voorkomen:
 *   getWerkplekIcon("Brug")   → <IconWrench />
 */
export function getWerkplekIcon(type: WerkplekType, size = 16): React.ReactNode {
    switch (type) {
        case "Brug": return <IconWrench size={size} />;
        case "Uitlijnbrug": return <IconRuler size={size} />;
        case "Wasplaats": return <IconDroplets size={size} />;
        case "Buiten": return <IconParking size={size} />;
        case "Overig": return <IconGrid size={size} />;
    }
}

/**
 * @deprecated Gebruik getWerkplekIcon() ipv dit object.
 * Blijft beschikbaar voor backward-compatibiliteit.
 */
export const WERKPLEK_TYPE_ICON: Record<WerkplekType, React.ReactNode> = {
    Brug: <IconWrench />,
    Uitlijnbrug: <IconRuler />,
    Wasplaats: <IconDroplets />,
    Buiten: <IconParking />,
    Overig: <IconGrid />,
};

export const WERKPLEK_TYPES: WerkplekType[] = ["Brug", "Uitlijnbrug", "Wasplaats", "Buiten", "Overig"];
