/**
 * src/components/onderhoud/utils.ts
 *
 * Gedeelde helpers voor alle onderhoud-views.
 * Centraal: formatDatum, TYPE_ICOON, TypeWerk.
 */

export type TypeWerk =
    | "Grote Beurt" | "Kleine Beurt" | "APK" | "Reparatie"
    | "Bandenwisseling" | "Schadeherstel" | "Diagnostiek" | "Overig";

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

export function formatDatum(ms: number): string {
    return new Date(ms).toLocaleDateString("nl-NL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}
