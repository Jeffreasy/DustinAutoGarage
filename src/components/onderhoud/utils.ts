/**
 * src/components/onderhoud/utils.ts
 *
 * Gedeelde helpers voor alle onderhoud-views.
 * Centraal: formatDatum, TYPE_ICOON, TypeWerk, SOORT_CONFIG.
 */

export type TypeWerk =
    | "Grote Beurt" | "Kleine Beurt" | "APK" | "Reparatie"
    | "Bandenwisseling" | "Schadeherstel" | "Diagnostiek" | "Overig";

/** @deprecated Gebruik SOORT_CONFIG voor SVG icons + kleuren */
export const TYPE_ICOON: Record<TypeWerk, string> = {
    "Grote Beurt": "GB",
    "Kleine Beurt": "KB",
    "APK": "APK",
    "Reparatie": "REP",
    "Bandenwisseling": "BW",
    "Schadeherstel": "SCH",
    "Diagnostiek": "DIA",
    "Overig": "OVR",
};

/** Centrale type-configuratie — kleur + achtergrond + SVG-path per TypeWerk */
export const SOORT_CONFIG: Record<string, { label: string; kleur: string; bg: string; iconPath: string }> = {
    "Grote Beurt": { label: "Grote Beurt", kleur: "var(--color-warning)", bg: "var(--color-warning-bg)", iconPath: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" },
    "Kleine Beurt": { label: "Kleine Beurt", kleur: "var(--color-info)", bg: "var(--color-info-bg)", iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
    "APK": { label: "APK", kleur: "var(--color-accent-text)", bg: "var(--color-accent-dim)", iconPath: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
    "Reparatie": { label: "Reparatie", kleur: "var(--color-error)", bg: "var(--color-error-bg)", iconPath: "M13 2 3 14h9l-1 8 10-12h-9l1-8z" },
    "Bandenwisseling": { label: "Bandenwisseling", kleur: "var(--color-muted)", bg: "var(--color-surface-3)", iconPath: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 6a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" },
    "Schadeherstel": { label: "Schadeherstel", kleur: "var(--color-error)", bg: "var(--color-error-bg)", iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
    "Diagnostiek": { label: "Diagnostiek", kleur: "var(--color-info)", bg: "var(--color-info-bg)", iconPath: "M22 12h-4l-3 9L9 3l-3 9H2" },
    "Overig": { label: "Overig", kleur: "var(--color-muted)", bg: "var(--color-surface-2)", iconPath: "M12 12h.01M19 12h.01M5 12h.01" },
};

export function formatDatum(ms: number): string {
    return new Date(ms).toLocaleDateString("nl-NL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}
