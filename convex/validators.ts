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
 * Transitie:
 *   Wachtend → Bezig → (Wacht op onderdelen →) Klaar
 */
export const vWerkorderStatus = v.union(
    v.literal("Wachtend"),             // Auto staat buiten, wacht op brug
    v.literal("Bezig"),               // Monteur is actief aan het werk
    v.literal("Wacht op onderdelen"), // Klus gepauzeerd, onderdeel besteld
    v.literal("Klaar"),               // Klaar voor ophalen door klant
);
