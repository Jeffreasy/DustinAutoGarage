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
 */
export default {
    providers: [
        {
            /**
             * The base URL of the LaventeCare Go backend.
             * Convex appends `/.well-known/openid-configuration` to this value.
             *
             * Must NOT have a trailing slash.
             */
            domain: process.env.LAVENTECARE_API_URL as string,

            /**
             * Audience claim (`aud`) embedded in the RS256 JWT by LaventeCare.
             * Convex rejects tokens whose `aud` does not match this value.
             */
            applicationID: process.env.LAVENTECARE_APP_ID as string,
        },
    ],
};
