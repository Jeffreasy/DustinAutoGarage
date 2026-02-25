/**
 * convex/validators.ts
 *
 * Gedeelde Convex value-validators — single source of truth voor alle enum-types.
 *
 * Importeer hier in plaats van de enums te dupliceren in elke query/mutatie.
 * Wijziging van een enum hoeft slechts op één plek gedaan te worden.
 *
 * Gebruik:
 *   import { vBrandstof, vTypeWerk, vKlanttype, vKlantstatus, vDomeinRol } from "./validators";
 */

import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Medewerkers — Domain Roles (Split-Role strategie)
// ---------------------------------------------------------------------------

/**
 * Garage-specifieke domein-rol: bepaalt wat een medewerker MAG binnen de app.
 *
 * Hiërarchie (hoog → laag):
 *   eigenaar > balie > monteur > stagiair
 *
 * Dit staat VOLLEDIG los van de LaventeCare identity-rol (admin/editor/user/viewer).
 */
export const vDomeinRol = v.union(
    v.literal("eigenaar"),  // Financiën, facturen, alle data
    v.literal("balie"),     // Klantbeheer, voertuigen, werkorders aanmaken
    v.literal("monteur"),   // Alleen werkorders bekijken + notities toevoegen
    v.literal("stagiair"),  // Beperkte read-only toegang
);

// ---------------------------------------------------------------------------
// Klanten
// ---------------------------------------------------------------------------

/** Particulier of zakelijk account */
export const vKlanttype = v.union(
    v.literal("Particulier"),
    v.literal("Zakelijk")
);

/** Levenscyclus-status van de klant */
export const vKlantstatus = v.union(
    v.literal("Actief"),
    v.literal("Inactief"),
    v.literal("Prospect")
);

// ---------------------------------------------------------------------------
// Voertuigen
// ---------------------------------------------------------------------------

/** Brandstoftype */
export const vBrandstof = v.union(
    v.literal("Benzine"),
    v.literal("Diesel"),
    v.literal("Hybride"),
    v.literal("EV"),
    v.literal("LPG")
);

// ---------------------------------------------------------------------------
// Onderhoudshistorie
// ---------------------------------------------------------------------------

/** Soort uitgevoerd werk bij een onderhoudsbeurt */
export const vTypeWerk = v.union(
    v.literal("Grote Beurt"),
    v.literal("Kleine Beurt"),
    v.literal("APK"),
    v.literal("Reparatie"),
    v.literal("Bandenwisseling"),
    v.literal("Schadeherstel"),
    v.literal("Diagnostiek"),
    v.literal("Overig")
);

// ---------------------------------------------------------------------------
// Werkplaatsbord
// ---------------------------------------------------------------------------

/** Fysiek type van een werkplek in de garage */
export const vWerkplekType = v.union(
    v.literal("Brug"),
    v.literal("Uitlijnbrug"),
    v.literal("Wasplaats"),
    v.literal("Buiten"),
    v.literal("Overig"),
);

/**
 * Lifecycle-status van een werkorder (het 'kaartje' op het bord).
 *
 * Volledig transitie-pad:
 *   Gepland → Aanwezig → Wachtend → Bezig → (Wacht op onderdelen →) Klaar → Afgerond
 *                                                                    └→ Geannuleerd [auto-archiveer]
 *
 * Backward-compatibel: bestaande waarden zijn NIET hernoemd.
 * Nieuwe waarden zijn toegevoegd aan voor- en achterkant.
 */
export const vWerkorderStatus = v.union(
    // ── Vóór binnenkomst ───────────────────────────────────────────────────
    v.literal("Gepland"),             // Afspraak gemaakt, auto verwacht
    v.literal("Aanwezig"),            // Auto is op het terrein, wacht op verwerking

    // ── In behandeling ─────────────────────────────────────────────────────
    v.literal("Wachtend"),            // Auto staat buiten, wacht op brug
    v.literal("Bezig"),              // Monteur is actief aan het werk
    v.literal("Wacht op onderdelen"),// Klus gepauzeerd, onderdeel besteld

    // ── Afgerond ──────────────────────────────────────────────────────────
    v.literal("Klaar"),              // Klaar voor ophalen door klant
    v.literal("Afgerond"),           // Werkzaamheden voltooid, wacht op ophalen/betaling
    v.literal("Geannuleerd"),        // Afspraak geannuleerd — wordt automatisch gearchiveerd
);

// ---------------------------------------------------------------------------
// Werkorders — Afsluiting / Annulering
// ---------------------------------------------------------------------------

/**
 * Reden van annulering van een werkorder.
 * Verplicht bij annuleren via `annuleerWerkorder` mutatie.
 * Wordt opgeslagen op het record voor rapportage en audit.
 */
export const vAfsluitingReden = v.union(
    v.literal("Klant niet verschenen"),     // No-show
    v.literal("Klant geannuleerd"),         // Klant belde zelf af
    v.literal("Geen toestemming klant"),    // Klant akkoord niet gekregen voor werk
    v.literal("Onderdelen niet leverbaar"), // Klus kon niet worden uitgevoerd
    v.literal("Dubbele boeking"),           // Administratieve fout
    v.literal("Overig"),                    // Vrij in te vullen via notitie
);
