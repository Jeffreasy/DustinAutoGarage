/**
 * convex/auth.config.ts
 *
 * Registers LaventeCare as the custom OIDC / RS256 provider for Convex.
 *
 * How it works:
 *  1. Convex fetches `{domain}/.well-known/openid-configuration` at startup
 *     to discover the JWKS endpoint.
 *  2. Every JWT arriving via `ConvexProviderWithAuth` is verified against
 *     LaventeCare's public RS256 keys automatically.
 *  3. `applicationID` must match the `aud` claim that LaventeCare puts inside
 *     the JWT (configured via `LAVENTECARE_APP_ID` env var in the Convex
 *     dashboard — Settings → Environment Variables).
 *
 * Required Convex environment variables:
 *   LAVENTECARE_API_URL   — e.g. https://auth.laventecare.nl
 *   LAVENTECARE_APP_ID    — e.g. dustin-auto-garage
 *
 * L-2 FIX: env-var validatie bij module-load zodat de deployment direct
 * faalt met een duidelijke foutmelding als een variabele ontbreekt,
 * in plaats van een cryptische runtime-fout later.
 */

const domain = process.env.LAVENTECARE_API_URL;
const applicationID = process.env.LAVENTECARE_APP_ID;

if (!domain) {
    throw new Error(
        "MISSING ENV: LAVENTECARE_API_URL is niet geconfigureerd. " +
        "Stel deze in via het Convex Dashboard → Settings → Environment Variables."
    );
}

if (!applicationID) {
    throw new Error(
        "MISSING ENV: LAVENTECARE_APP_ID is niet geconfigureerd. " +
        "Stel deze in via het Convex Dashboard → Settings → Environment Variables."
    );
}

export default {
    providers: [
        {
            /**
             * The base URL of the LaventeCare Go backend.
             * Convex appends `/.well-known/openid-configuration` to this value.
             * Must NOT have a trailing slash.
             */
            domain,

            /**
             * Audience claim (`aud`) embedded in the RS256 JWT by LaventeCare.
             * Convex rejects tokens whose `aud` does not match this value.
             */
            applicationID,
        },
    ],
};
