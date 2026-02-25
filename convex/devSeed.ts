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

        if (domeinRol !== "eigenaar") {
            const eigenaar = await ctx.db
                .query("medewerkers")
                .collect()
                .then(all => all.find(m => m.domeinRol === "eigenaar" && m.actief));

            if (eigenaar) {
                tenantTokenIdentifier = eigenaar.tokenIdentifier;
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
        const deletions: string[] = [];

        for (const m of medewerkers) {
            if (m._id === correcteEigenaar._id) continue;

            if (m.domeinRol === "eigenaar") {
                await ctx.db.delete(m._id);
                deletions.push(`${m.naam} (${m.userId})`);
            } else if (m.tokenIdentifier !== dataToken) {
                await ctx.db.patch(m._id, { tokenIdentifier: dataToken });
                patches.push(`${m.naam} (${m.domeinRol})`);
            }
        }

        return {
            fixed: true,
            correcteEigenaar: correcteEigenaar.naam,
            dataToken,
            gepatch: patches,
            verwijderd: deletions,
        };
    },
});
