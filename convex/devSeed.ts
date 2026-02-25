/**
 * convex/devSeed.ts
 *
 * Medewerker rol-seeding — werkt in zowel dev als productie.
 *
 * seedDevMedewerker: maakt een medewerker record aan (of updatet het) voor de
 *   ingelogde gebruiker met de opgegeven garage-rol. Veilig voor productie:
 *   - Vereist authenticatie
 *   - Niet-eigenaar rollen worden altijd gekoppeld aan de bestaande eigenaar-anchor
 *   - Idempotent: als het record al correct is, wordt het niet opnieuw aangemaakt
 *
 * debugTokens:     Inzicht in token-staat (eigenaar-only).
 * fixTenantTokens: Repareer verkeerde tokenIdentifiers na migratie (eigenaar-only).
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { vDomeinRol } from "./validators";
import { requireDomainRole } from "./helpers";

// ── 0. Diagnostics: dump records van eigen tenant (eigenaar-only) ─────────────

export const dumpMedewerkers = query({
    args: {},
    handler: async (ctx) => {
        // Guard: alleen eigenaar mag tenant-data inzien
        const profiel = await requireDomainRole(ctx, "eigenaar");
        const identity = await ctx.auth.getUserIdentity();

        // Alleen eigen tenant-records — nooit cross-tenant lekkage
        const alle = await ctx.db
            .query("medewerkers")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", profiel.tokenIdentifier)
            )
            .collect();

        return {
            callerSubject: identity?.subject ?? null,
            callerTokenIdentifier: identity?.tokenIdentifier ?? null,
            records: alle.map(m => ({
                naam: m.naam,
                domeinRol: m.domeinRol,
                userId: m.userId,
                tokenIdentifier: m.tokenIdentifier,
                actief: m.actief,
            })),
        };
    },
});

// Patcht alle records met een lege tokenIdentifier naar de juiste tenant-anchor.
// Vereist eigenaar-rol — beschermt tegen unauthenticated data-mutaties.
export const patchLegeTokens = mutation({
    args: {},
    handler: async (ctx) => {
        // Guard: alleen eigenaar mag tokens repareren
        await requireDomainRole(ctx, "eigenaar");
        const alle = await ctx.db.query("medewerkers").collect();
        // Anchor = eigenaar record met niet-lege tokenIdentifier
        const anchor = alle.find(m => m.domeinRol === "eigenaar" && m.tokenIdentifier !== "");
        if (!anchor) return { success: false, reden: "Geen eigenaar met geldig token gevonden." };

        let bijgewerkt = 0;
        for (const m of alle) {
            if (m.tokenIdentifier === "" || m.tokenIdentifier == null) {
                await ctx.db.patch(m._id, { tokenIdentifier: anchor.tokenIdentifier });
                bijgewerkt++;
            }
        }
        return { success: true, anchor: anchor.tokenIdentifier, bijgewerkt };
    },
});

// ── 1. Medewerker aanmaken / bijwerken ────────────────────────────────────────

export const seedDevMedewerker = mutation({
    args: {
        naam: v.string(),
        domeinRol: vDomeinRol,
    },
    handler: async (ctx, { naam, domeinRol }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("UNAUTHENTICATED");

        // Bepaal de correcte tenant tokenIdentifier:
        // - eigenaar: eigen tokenIdentifier (wordt tenant-anchor)
        // - anderen: eigenaar's tokenIdentifier als gedeeld tenant-anchor
        let tenantTokenIdentifier = identity.tokenIdentifier;

        // Zoek bestaande eigenaar voor tenant-anchor én rol-escalation check
        const bestaandeEigenaar = await ctx.db
            .query("medewerkers")
            .collect()
            .then(all => all.find(m => m.domeinRol === "eigenaar" && m.actief));

        if (domeinRol === "eigenaar" && bestaandeEigenaar) {
            // Role-escalation guard: eigenaar-rol toewijzen als er al een eigenaar bestaat
            // mag alleen via adminRegistreerMedewerker (door de eigenaar zelf).
            // seedDevMedewerker mag dit alleen als er NOG GEEN eigenaar is (cold-start).
            const isZichzelfEigenaar = bestaandeEigenaar.userId === identity.subject;
            if (!isZichzelfEigenaar) {
                throw new Error(
                    "FORBIDDEN: Er is al een eigenaar voor deze tenant. " +
                    "Gebruik adminRegistreerMedewerker (eigenaar-only) om een tweede eigenaar toe te voegen."
                );
            }
        }

        if (domeinRol !== "eigenaar") {
            if (bestaandeEigenaar) {
                tenantTokenIdentifier = bestaandeEigenaar.tokenIdentifier;
            }
            // Als er nog geen eigenaar is, gebruik eigen tokenIdentifier als tijdelijk anchor.
            // fixTenantTokens kan later alle records rechtzetten.
        }

        // Bestaand record opzoeken via userId
        const bestaand = await ctx.db
            .query("medewerkers")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
            .first();

        if (bestaand) {
            // Controleer of er iets bijgewerkt moet worden
            const updates: Record<string, unknown> = {};
            if (bestaand.domeinRol !== domeinRol) updates.domeinRol = domeinRol;
            if (bestaand.naam !== naam) updates.naam = naam;
            if (bestaand.tokenIdentifier !== tenantTokenIdentifier) {
                updates.tokenIdentifier = tenantTokenIdentifier;
            }

            if (Object.keys(updates).length > 0) {
                await ctx.db.patch(bestaand._id, updates);
                return { action: "updated", id: bestaand._id, updates };
            }
            return { action: "skipped", id: bestaand._id };
        }

        const id = await ctx.db.insert("medewerkers", {
            userId: identity.subject,
            tokenIdentifier: tenantTokenIdentifier,
            domeinRol,
            naam,
            actief: true,
            aangemaaktOp: Date.now(),
        });

        return { action: "created", id };
    },
});


// ── 2. Debug: token-staat inzien (eigenaar-only) ──────────────────────────────

export const debugTokens = query({
    args: {},
    handler: async (ctx) => {
        const profiel = await requireDomainRole(ctx, "eigenaar");

        const identity = await ctx.auth.getUserIdentity();
        const medewerkers = await ctx.db
            .query("medewerkers")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", profiel.tokenIdentifier)
            )
            .collect();

        const voertuigen = await ctx.db
            .query("voertuigen")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", profiel.tokenIdentifier)
            )
            .collect();

        return {
            mySubject: identity?.subject ?? null,
            myTokenIdentifier: identity?.tokenIdentifier ?? null,
            medewerkers: medewerkers.map((m) => ({
                naam: m.naam,
                domeinRol: m.domeinRol,
                userId: m.userId,
                tokenIdentifier: m.tokenIdentifier,
                actief: m.actief,
            })),
            voertuigenCount: voertuigen.length,
        };
    },
});


// ── 3. Repareer verkeerde tokenIdentifiers (eigenaar-only) ────────────────────

/**
 * fixTenantTokens — repareer medewerker-records na een tenant-migratie.
 *
 * Gebruikt de eerste voertuig als anchor om de correcte eigenaar te vinden,
 * en patcht alle balie/monteur/stagiair records naar die tokenIdentifier.
 * Ghost eigenaar-records (zonder data) worden verwijderd.
 */
export const fixTenantTokens = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("UNAUTHORIZED");

        // Valideer eigenaar-rol
        await requireDomainRole(ctx, "eigenaar");

        const medewerkers = await ctx.db.query("medewerkers").collect();
        const voertuigen = await ctx.db.query("voertuigen").collect();

        if (voertuigen.length === 0) {
            return { error: "Geen voertuigen in DB — voeg eerst echte data toe als eigenaar" };
        }

        const dataToken = voertuigen[0].tokenIdentifier;

        const correcteEigenaar = medewerkers.find(
            (m) => m.domeinRol === "eigenaar" && m.tokenIdentifier === dataToken
        );

        if (!correcteEigenaar) {
            return {
                error: "Geen eigenaar gevonden wiens tokenIdentifier overeenkomt met de voertuigen",
                dataToken,
                eigenaars: medewerkers.filter((m) => m.domeinRol === "eigenaar").map((m) => ({
                    naam: m.naam, tokenIdentifier: m.tokenIdentifier
                })),
            };
        }

        const patches: string[] = [];

        for (const m of medewerkers) {
            if (m._id === correcteEigenaar._id) continue;

            // Patch alle records (ook extra eigenaars) naar de juiste tenant-anchor.
            // Meerdere eigenaars zijn geldig — we verwijderen ze NIET meer.
            if (m.tokenIdentifier !== dataToken) {
                await ctx.db.patch(m._id, { tokenIdentifier: dataToken });
                patches.push(`${m.naam} (${m.domeinRol})`);
            }
        }

        return {
            fixed: true,
            correcteEigenaar: correcteEigenaar.naam,
            dataToken,
            gepatch: patches,
        };
    },
});


// ── 4. Admin: registreer medewerker via LaventeCare userId (eigenaar-only) ─────

/**
 * adminRegistreerMedewerker — maakt een medewerker-record aan voor een gebruiker
 * die nog NIET heeft ingelogd, aan de hand van hun LaventeCare userId (UUID).
 *
 * Bouwt tokenIdentifier op als `{issuer}|{userId}` — identiek aan wat LaventeCare JWTs
 * aanmaken. Slaat de eigenaar's tokenIdentifier op als tenant-anchor zodat
 * listMedewerkers de nieuwe medewerker direct teruggeeft.
 *
 * Vereist domeinrol: "eigenaar". Idempotent via userId check.
 */
export const adminRegistreerMedewerker = mutation({
    args: {
        userId: v.string(),
        naam: v.string(),
        domeinRol: vDomeinRol,
        issuer: v.optional(v.string()),
    },
    handler: async (ctx, { userId, naam, domeinRol, issuer }) => {
        const eigenaar = await requireDomainRole(ctx, "eigenaar");

        // Idempotentie-check
        const bestaand = await ctx.db
            .query("medewerkers")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (bestaand) {
            throw new Error(
                `CONFLICT: Record bestaat al voor userId '${userId}' (${bestaand.naam}, ${bestaand.domeinRol}).`
            );
        }

        const id = await ctx.db.insert("medewerkers", {
            userId,
            tokenIdentifier: eigenaar.tokenIdentifier, // tenant-anchor
            domeinRol,
            naam,
            actief: true,
            aangemaaktOp: Date.now(),
        });

        return { success: true, id, userId, domeinRol };
    },
});


// ── 5. Opruimen van duplicate userId records (eigenaar-only) ──────────────────

/**
 * cleanupDuplicateUserIds — verwijdert dubbele medewerker-records voor dezelfde userId.
 *
 * Ontstaat wanneer een user zichzelf registreert via ensureEigenaar/registreerMedewerker
 * NADAT de eigenaar al een record aanmaakte via adminRegistreerMedewerker.
 *
 * Strategie: behoud het record met de correcte tenant-anchor tokenIdentifier.
 * Verwijder de rest. getDomeinProfiel (.unique()) stopt dan met crashen.
 *
 * Vereist domeinrol: "eigenaar".
 */
export const cleanupDuplicateUserIds = mutation({
    args: {},
    handler: async (ctx) => {
        // Guard: alleen eigenaar mag duplicate records opruimen
        const acteert = await requireDomainRole(ctx, "eigenaar");
        const anchorToken = acteert.tokenIdentifier;

        // Haal alleen eigen tenant-records op (scoped via anchor-token)
        const alle = await ctx.db
            .query("medewerkers")
            .withIndex("by_token_identifier", (q) =>
                q.eq("tokenIdentifier", anchorToken)
            )
            .collect();
        const eigenaar = alle.find(m => m.domeinRol === "eigenaar" && m.actief);
        if (!eigenaar) return { success: false, reden: "Geen actieve eigenaar gevonden." };

        // Groepeer op userId
        const perUser = new Map<string, typeof alle>();
        for (const m of alle) {
            const groep = perUser.get(m.userId) ?? [];
            groep.push(m);
            perUser.set(m.userId, groep);
        }

        const verwijderd: string[] = [];

        for (const [userId, records] of perUser.entries()) {
            if (records.length <= 1) continue; // geen duplicaat

            // Behoud het record met de anchor-token; verwijder de rest
            const correct = records.find(r => r.tokenIdentifier === anchorToken)
                ?? records[0]; // fallback: behoud de eerste

            for (const r of records) {
                if (r._id === correct._id) continue;
                await ctx.db.delete(r._id);
                verwijderd.push(`${r.naam} (userId: ${userId}, rol: ${r.domeinRol})`);
            }
        }

        return { success: true, verwijderd, aantalVerwijderd: verwijderd.length };
    },
});


