// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
    /**
     * SSR mode: server-side rendering via the Node adapter.
     * Required for:
     *   - Astro Middleware (session guard on /dashboard)
     *   - Server-to-server token validation via /auth/me
     *   - API route proxies (optional BFF pattern)
     */
    output: "server",

    adapter: node({
        mode: "standalone",
    }),

    integrations: [
        /**
         * React integration: enables React Islands (.tsx components with client:*)
         * including LaventeConvexProvider and VoertuigenDashboard.
         */
        react(),
    ],

    /**
     * Vite config: expose PUBLIC_ env vars to the client bundle.
     * PUBLIC_CONVEX_URL  → used by LaventeConvexProvider
     * PUBLIC_API_URL     → used for the satellite token fetch
     */
    vite: {
        optimizeDeps: {
            // Convex uses dynamic imports — tell Vite to pre-bundle it
            include: ["convex/react"],
        },
    },
});
