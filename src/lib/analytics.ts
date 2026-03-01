/**
 * src/lib/analytics.ts
 *
 * Centrale analytics helpers — wrappers rond @vercel/analytics track().
 * Importeer vanuit componenten zodat event-namen en properties consistent zijn.
 *
 * Gebruik:
 *   import { analyticsKlantNieuw } from "../../lib/analytics";
 *   analyticsKlantNieuw("Particulier");
 */

import { track } from "@vercel/analytics";

// ─── Authenticatie ────────────────────────────────────────────────────────────

/** Inlogpoging geslaagd */
export const analyticsLogin = (rol: string) =>
    track("login", { rol });

/** Uitloggen */
export const analyticsLogout = () =>
    track("logout");

// ─── Klanten ─────────────────────────────────────────────────────────────────

/** Klantenkaart geopend — detail-paneel weergegeven */
export const analyticsKlantOpen = (type: string) =>
    track("klant_geopend", { klanttype: type });

/** Nieuwe klant aangemaakt via NieuweKlantModal */
export const analyticsKlantNieuw = (type: string) =>
    track("klant_aangemaakt", { klanttype: type });

/** Bestaande klantgegevens opgeslagen (bewerk-formulier) */
export const analyticsKlantUpdate = () =>
    track("klant_bijgewerkt");

/** Klant definitief verwijderd (GDPR) */
export const analyticsKlantVerwijder = () =>
    track("klant_verwijderd");

/** Balienotities / AVG-vinkje opgeslagen */
export const analyticsKlantNotitieOpgeslagen = () =>
    track("klant_notitie_opgeslagen");

// ─── Voertuigen ───────────────────────────────────────────────────────────────

/** Nieuw voertuig aangemaakt */
export const analyticsVoertuigNieuw = (merk: string, brandstof: string) =>
    track("voertuig_aangemaakt", { merk, brandstof });

/** Voertuig-detailpaneel geopend */
export const analyticsVoertuigDetail = () =>
    track("voertuig_detail_geopend");

/** RDW lookup uitgevoerd (kenteken-import) */
export const analyticsRDWLookup = () =>
    track("rdw_lookup_uitgevoerd");

// ─── Onderhoud ────────────────────────────────────────────────────────────────

/** Nieuw onderhoudsorder aangemaakt */
export const analyticsOnderhoudNieuw = (type: string) =>
    track("onderhoud_aangemaakt", { onderhoudtype: type });

/** Onderhoudsorder afgesloten */
export const analyticsOnderhoudGesloten = (status: string) =>
    track("onderhoud_gesloten", { status });

// ─── Werkplaats ───────────────────────────────────────────────────────────────

/** Werkplaatskaart verplaatst naar andere kolom */
export const analyticsWerkplaatsVerplaatst = (naarStatus: string) =>
    track("werkplaats_kaart_verplaatst", { naar: naarStatus });

/** Nieuwe werkorder aangemaakt (3-staps flow voltooid) */
export const analyticsWerkorderAangemaakt = () =>
    track("werkorder_aangemaakt");

