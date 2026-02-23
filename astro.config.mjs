// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
    /**
     * SSR mode: server-side rendering via de Vercel adapter.
     * Required for:
     *   - Astro Middleware (session guard op /dashboard)
     *   - Server-to-server token validatie via /auth/me
     *   - API route proxies (BFF pattern voor invite, rdw)
     *
     * @astrojs/vercel deployt elke Astro-pagina als een Vercel Serverless Function.
     */
    output: "server",

    adapter: vercel({
        /**
         * Web Analytics — gratis op Vercel; toont pageviews zonder cookies.
         */
        webAnalytics: { enabled: true },

        /**
         * isr: false — alle pagina's zijn fully dynamic SSR.
         * De middleware valideert sessies bij elke request.
         */
        isr: false,
    }),

    integrations: [
        /**
         * React integration: enables React Islands (.tsx components met client:*)
         * Inclusief LaventeConvexProvider, VoertuigenDashboard, modals etc.
         */
        react(),
    ],

    /**
     * Vite config: expose PUBLIC_ env vars aan de client bundle.
     * PUBLIC_CONVEX_URL  → gebruikt door LaventeConvexProvider
     * PUBLIC_API_URL     → gebruikt voor satellite token fetch
     */
    vite: {
        optimizeDeps: {
            // Convex gebruikt dynamic imports — pre-bundel voor Vite
            include: ["convex/react"],
        },
        build: {
            // Verhoog de chunk size warning limit voor Convex + React bundles
            chunkSizeWarningLimit: 600,
        },
    },
});
