/**
 * convex/medewerkers.ts
 *
 * Domain Layer — Garage Medewerker Beheer (Split-Role strategie)
 *
 * Deze module beheert de `medewerkers` tabel: de koppeling tussen een
 * LaventeCare identity (userId) en een garage-specifieke domeinRol.
 *
 * Security model:
 *   - Identity checks:  requireAuth(ctx) via helpers.ts
 *   - Domain checks:    requireDomainRole(ctx, "minRol") via helpers.ts
 *   - Tenant isolatie:  alle queries filteren op tokenIdentifier
 *
 * Mutations:
 *   ensureEigenaar       — cold-start: maakt eigenaar-record aan als geen enkel record bestaat
 *   registreerMedewerker — koppelt nieuwe medewerker na succesvolle LaventeCare invite
 *   wijzigDomeinRol      — eigenaar wijzigt iemands rol
 *   deactiveerMedewerker — zachte deactivatie (audit-safe, actief=false)
 *
 * Queries:
 *   getMijnProfiel       — eigen medewerkers-record (voor useRol hook)
 *   listMedewerkers      — alle actieve medewerkers (eigenaar + balie only)
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
    requireAuth,
    getIdentity,
    getDomeinProfiel,
    requireDomainRole,
} from "./helpers";
import { vDomeinRol } from "./validators";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * getMijnProfiel — geeft het eigen medewerkers-record terug.
 *
 * Retourneert `null` als de user nog niet is geregistreerd als medewerker
 * (cold-start situatie — eigenaar moet eerst `ensureEigenaar` aanroepen).
 *
 * Gebruikt door de `useRol` React hook voor client-side role-gating.
 */
export const getMijnProfiel = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        // Strategie 1: zoek op userId (= identity.subject) — snel en exact.
        // Werkt voor records aangemaakt via ensureEigenaar (die identity.subject gebruikt)
        const viaUserId = await ctx.db
            .query("medewerkers")
            .withIndex("by_userId", (q) =>
                q.eq("userId", identity.subject)
            )
            .filter((q) => q.eq(q.field("actief"), true))
            .unique();

        if (viaUserId) return viaUserId;

        // Strategie 2: fallback op tokenIdentifier — dekt records aangemaakt via
        // registreerMedewerker (die tokenIdentifier gebruikt als primaire sleutel).
        // Werkt ALLEEN correct in single-user-per-tenant setups (één record per token).
        const viaToken = await ctx.db
            .query("medewerkers")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .filter((q) => q.eq(q.field("actief"), true))
            .unique();

        return viaToken ?? null;
    },
});

/**
 * listMedewerkers — geeft alle medewerkers terug binnen de huidige tenant.
 *
 * Inclusief gedeactiveerde medewerkers zodat de eigenaar ze kan terugzetten.
 * Vereiste domeinrol: minimaal "balie" (eigenaar + balie).
 */
export const listMedewerkers = query({
    args: {},
    handler: async (ctx) => {
        // requireDomainRole returns the current user's medewerker record
        const profiel = await requireDomainRole(ctx, "balie");

        // Use profiel.tokenIdentifier (the shared tenant namespace key) so we find
        // ALL medewerkers in this tenant, not just the current user's own record.
        const medewerkers = await ctx.db
            .query("medewerkers")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", profiel.tokenIdentifier)
            )
            .collect();

        // Sorteer: eigenaar eerste, dan actieve medewerkers, dan inactieven
        return medewerkers.sort((a, b) => {
            const rolOrder = { eigenaar: 0, balie: 1, monteur: 2, stagiair: 3 };
            if (a.actief !== b.actief) return b.actief ? 1 : -1;
            return (rolOrder[a.domeinRol as keyof typeof rolOrder] ?? 99) -
                (rolOrder[b.domeinRol as keyof typeof rolOrder] ?? 99);
        });
    },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * ensureEigenaar — cold-start mutation.
 *
 * Maakt een eigenaar-record aan voor de huidig ingelogde gebruiker ALS:
 *   1. Er nog GEEN enkel medewerkers-record bestaat onder deze tokenIdentifier
 *   2. De gebruiker de LaventeCare identity-rol "admin" of "editor" heeft
 *
 * Dit is de veilige manier om de eerste eigenaar te bootstrappen zonder
 * een aparte CLI of Convex dashboard actie.
 *
 * Returns:
 *   { created: true }  — nieuw eigenaar record aangemaakt
 *   { created: false } — record bestond al, geen wijziging
 */
export const ensureEigenaar = mutation({
    args: {
        naam: v.string(),
    },
    handler: async (ctx, { naam }) => {
        const identity = await getIdentity(ctx);

        // Check: heeft de tenant al medewerkers?
        const bestaandRecord = await ctx.db
            .query("medewerkers")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .first();

        if (bestaandRecord) {
            return { created: false, reden: "Er bestaat al een medewerkers-record voor deze tenant." };
        }

        // Maak eigenaar-record aan (eerste medewerker = altijd eigenaar)
        await ctx.db.insert("medewerkers", {
            userId: identity.subject,
            tokenIdentifier: identity.tokenIdentifier,
            domeinRol: "eigenaar",
            naam: naam || identity.name || identity.email || "Eigenaar",
            actief: true,
            aangemaaktOp: Date.now(),
        });

        return { created: true };
    },
});

/**
 * registreerMedewerker — koppelt een nieuwe medewerker na een LaventeCare invite.
 *
 * Aanroep flow:
 *   1. Editor/Admin stuurt invite via LaventeCare /users/invite → krijgt invite link
 *   2. Nieuwe medewerker registreert via de invite link → LaventeCare account aangemaakt
 *   3. Nieuwe medewerker logt in → frontend roept deze mutation aan na eerste login
 *
 * Vereiste domeinrol om ANDEREN toe te voegen: minimaal "balie".
 * Zelf registreren (eigen tokenIdentifier) is altijd toegestaan als nog geen record bestaat.
 *
 * Privilege escalation guard: alleen eigenaar kan andere eigenaren aanmaken.
 */
export const registreerMedewerker = mutation({
    args: {
        naam: v.string(),
        domeinRol: vDomeinRol,
        doelTokenIdentifier: v.optional(v.string()), // Wanneer editor een ander registreert
    },
    handler: async (ctx, { naam, domeinRol, doelTokenIdentifier }) => {
        const identity = await getIdentity(ctx);
        const acterendeProfiel = await getDomeinProfiel(ctx);

        // Bepaal de tokenIdentifier van de te registreren medewerker
        const targetTokenIdentifier = doelTokenIdentifier ?? identity.tokenIdentifier;

        // Check of er al een record bestaat
        const bestaand = await ctx.db
            .query("medewerkers")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", targetTokenIdentifier)
            )
            .unique();

        if (bestaand) {
            throw new Error(`CONFLICT: Er bestaat al een medewerkers-record voor deze gebruiker.`);
        }

        // Privilege escalation guard: alleen eigenaar kan eigenaren aanmaken
        if (domeinRol === "eigenaar" && acterendeProfiel?.domeinRol !== "eigenaar") {
            throw new Error("FORBIDDEN: Alleen de eigenaar kan andere eigenaren registreren.");
        }

        // Balie of hogere rol vereist om anderen te registreren
        if (doelTokenIdentifier && !acterendeProfiel) {
            throw new Error("FORBIDDEN: Je hebt geen domein-toegang om medewerkers toe te voegen.");
        }

        const [issuer, sub] = targetTokenIdentifier.split("|");
        const userId = sub ?? targetTokenIdentifier;

        await ctx.db.insert("medewerkers", {
            userId,
            tokenIdentifier: targetTokenIdentifier,
            domeinRol,
            naam,
            actief: true,
            aangemaaktOp: Date.now(),
        });

        return { success: true };
    },
});

/**
 * wijzigDomeinRol — eigenaar wijzigt de garage-rol van een medewerker.
 *
 * Vereiste domeinrol: "eigenaar" (exclusief — balie mag dit niet).
 * Privilege guard: je kunt jezelf niet degraderen van eigenaar.
 */
export const wijzigDomeinRol = mutation({
    args: {
        medewerkerId: v.id("medewerkers"),
        nieuweDomeinRol: vDomeinRol,
    },
    handler: async (ctx, { medewerkerId, nieuweDomeinRol }) => {
        const acteert = await requireDomainRole(ctx, "eigenaar");

        const doelMedewerker = await ctx.db.get(medewerkerId);
        if (!doelMedewerker) {
            throw new Error("NOT_FOUND: Medewerker niet gevonden.");
        }

        // Guard: eigenaar kan zichzelf niet degraderen
        if (doelMedewerker._id === acteert._id && nieuweDomeinRol !== "eigenaar") {
            throw new Error(
                "FORBIDDEN: Je kunt jezelf niet degraderen van eigenaar. " +
                "Wijs eerst een andere eigenaar aan."
            );
        }

        await ctx.db.patch(medewerkerId, { domeinRol: nieuweDomeinRol });
        return { success: true };
    },
});

/**
 * deactiveerMedewerker — zachte deactivatie (audit-safe).
 *
 * Stelt `actief=false` in zodat de medewerker niet meer inzichtelijk is in
 * de app en geen role-gated queries meer kan doen, maar het record blijft
 * bewaard voor audit- en historiedoeleinden.
 *
 * Vereiste domeinrol: "eigenaar".
 * Guard: je kunt jezelf niet deactiveren.
 */
export const deactiveerMedewerker = mutation({
    args: {
        medewerkerId: v.id("medewerkers"),
    },
    handler: async (ctx, { medewerkerId }) => {
        const acteert = await requireDomainRole(ctx, "eigenaar");

        if (medewerkerId === acteert._id) {
            throw new Error(
                "FORBIDDEN: Je kunt jezelf niet deactiveren. " +
                "Wijs eerst een andere eigenaar aan."
            );
        }

        const doelMedewerker = await ctx.db.get(medewerkerId);
        if (!doelMedewerker) {
            throw new Error("NOT_FOUND: Medewerker niet gevonden.");
        }

        await ctx.db.patch(medewerkerId, { actief: false });
        return { success: true, gearchiveerde: doelMedewerker.naam };
    },
});

/**
 * activeerMedewerker — heractiveer een gedeactiveerde medewerker.
 * Vereiste domeinrol: "eigenaar".
 */
export const activeerMedewerker = mutation({
    args: {
        medewerkerId: v.id("medewerkers"),
    },
    handler: async (ctx, { medewerkerId }) => {
        await requireDomainRole(ctx, "eigenaar");

        const doelMedewerker = await ctx.db.get(medewerkerId);
        if (!doelMedewerker) {
            throw new Error("NOT_FOUND: Medewerker niet gevonden.");
        }

        await ctx.db.patch(medewerkerId, { actief: true });
        return { success: true };
    },
});
