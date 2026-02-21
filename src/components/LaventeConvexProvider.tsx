/**
 * src/components/LaventeConvexProvider.tsx
 *
 * React Island — Satellite Token Flow + Convex Auth Provider
 *
 * Security Contract ("Anti-Gravity Protocol"):
 *   ✅  Tokens are NEVER written to localStorage or sessionStorage.
 *   ✅  The JWT lives exclusively in React state (heap memory).
 *   ✅  The token is fetched via GET /api/v1/auth/token with
 *       `credentials: "include"` — the HttpOnly session cookie is forwarded
 *       automatically by the browser. No token is ever visible to JS in the
 *       cookie jar either.
 *   ✅  If the fetch fails (401, network error), no Convex session is started
 *       and the user is redirected to /login.
 *
 * Usage in an Astro page:
 *   <LaventeConvexProvider client:load>
 *     <VoertuigenList />
 *   </LaventeConvexProvider>
 *
 * Required env vars (Astro / Vite):
 *   PUBLIC_API_URL       — LaventeCare Go backend, e.g. https://auth.laventecare.nl
 *   PUBLIC_CONVEX_URL    — Convex deployment URL
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TokenFetchResponse {
    token: string;
}

type AuthState =
    | { status: "loading" }
    | { status: "ready"; token: string }
    | { status: "error"; message: string };

interface LaventeAuthContextValue {
    /** The raw RS256 JWT, or null while loading / on error. */
    token: string | null;
}

// ---------------------------------------------------------------------------
// Convex client (module-level singleton — one instance per page load)
// ---------------------------------------------------------------------------

const convexClient = new ConvexReactClient(
    import.meta.env.PUBLIC_CONVEX_URL as string
);

// ---------------------------------------------------------------------------
// Internal auth context (consumed by the Convex provider adapter)
// ---------------------------------------------------------------------------

const LaventeAuthContext = createContext<LaventeAuthContextValue>({
    token: null,
});

// ---------------------------------------------------------------------------
// Convex auth hook adapter
// ---------------------------------------------------------------------------

/**
 * useConvexAuth — adapts the LaventeCare token into the shape Convex expects.
 *
 * `ConvexProviderWithAuth` calls this hook internally; it must return
 * `{ isLoading, isAuthenticated, fetchAccessToken }`.
 */
function useConvexAuth() {
    const { token } = useContext(LaventeAuthContext);

    const isLoading = token === null;
    const isAuthenticated = token !== null && token.length > 0;

    /**
     * Convex calls fetchAccessToken during its own token refresh cycle.
     * We always return the same in-memory token; LaventeCare token rotation
     * is handled by the HttpOnly cookie + `/auth/refresh` flow separately.
     */
    const fetchAccessToken = useCallback(
        async (_opts: { forceRefreshToken: boolean }): Promise<string | null> => {
            return token ?? null;
        },
        [token]
    );

    return useMemo(
        () => ({ isLoading, isAuthenticated, fetchAccessToken }),
        [isLoading, isAuthenticated, fetchAccessToken]
    );
}

// ---------------------------------------------------------------------------
// Main provider component
// ---------------------------------------------------------------------------

interface LaventeConvexProviderProps {
    children: ReactNode;
}

/**
 * LaventeConvexProvider
 *
 * Mounts as a React Island.  On first render it immediately executes the
 * satellite token fetch, then hands the JWT off to Convex's auth layer.
 *
 * The component owns the full loading / error / ready state machine so that
 * child components receive a stable, authenticated Convex client.
 */
export function LaventeConvexProvider({
    children,
}: LaventeConvexProviderProps) {
    const [authState, setAuthState] = useState<AuthState>({ status: "loading" });

    // ── Satellite token fetch ────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function fetchToken(): Promise<void> {
            try {
                const response = await fetch(`/api/auth/token`, {
                    method: "GET",
                    credentials: "include", // ← Anti-Gravity Rule: forward HttpOnly cookie
                    headers: {
                        Accept: "application/json",
                    },
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        // Geen actieve sessie — redirect naar login.
                        window.location.href = "/login?expired=true";
                        return;
                    }
                    throw new Error(
                        `Token endpoint returned ${response.status}: ${response.statusText}`
                    );
                }

                const data = (await response.json()) as TokenFetchResponse;

                if (!data.token || typeof data.token !== "string") {
                    throw new Error(
                        "Malformed token response: expected { token: string }"
                    );
                }

                if (!cancelled) {
                    setAuthState({ status: "ready", token: data.token });
                }
            } catch (err) {
                if (!cancelled) {
                    const message =
                        err instanceof Error ? err.message : "Unknown error during token fetch";
                    setAuthState({ status: "error", message });
                }
            }
        }

        void fetchToken();

        return () => {
            cancelled = true;
        };
    }, []);

    // ── Render: loading ──────────────────────────────────────────────────────
    if (authState.status === "loading") {
        return (
            <div
                role="status"
                aria-live="polite"
                aria-label="Sessie valideren..."
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "200px",
                    gap: "0.75rem",
                    color: "var(--color-muted, #6b7280)",
                    fontFamily: "inherit",
                }}
            >
                <span
                    aria-hidden="true"
                    style={{
                        width: 20,
                        height: 20,
                        border: "2px solid currentColor",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "lc-spin 0.8s linear infinite",
                    }}
                />
                <span>Sessie valideren…</span>
                <style>{`@keyframes lc-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // ── Render: error ────────────────────────────────────────────────────────
    if (authState.status === "error") {
        return (
            <div
                role="alert"
                style={{
                    padding: "1rem 1.5rem",
                    borderRadius: "0.5rem",
                    background: "var(--color-error-bg, #fef2f2)",
                    color: "var(--color-error-text, #b91c1c)",
                    border: "1px solid var(--color-error-border, #fecaca)",
                    fontFamily: "inherit",
                }}
            >
                <strong>Authenticatie mislukt:</strong> {authState.message}
            </div>
        );
    }

    // ── Render: ready ────────────────────────────────────────────────────────
    return (
        <LaventeAuthContext.Provider value={{ token: authState.token }}>
            <ConvexProviderWithAuth client={convexClient} useAuth={useConvexAuth}>
                {children}
            </ConvexProviderWithAuth>
        </LaventeAuthContext.Provider>
    );
}
