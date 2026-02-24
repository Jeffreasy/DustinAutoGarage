/**
 * src/components/LaventeConvexProvider.tsx
 *
 * React Island — Satellite Token Flow + Convex Auth Provider
 *
 * Security Contract ("Anti-Gravity Protocol"):
 *   ✅  Tokens are NEVER written to localStorage or sessionStorage.
 *   ✅  The JWT lives exclusively in React state (heap memory).
 *   ✅  The token is fetched via the `fetchConvexToken()` helper in
 *       src/lib/auth.ts which uses `credentials: "include"` — the
 *       HttpOnly session cookie is forwarded automatically.
 *   ✅  On 401 the user is redirected via `redirectToLogin()`.
 *
 * Usage in an Astro page:
 *   <LaventeConvexProvider client:load>
 *     <VoertuigenList />
 *   </LaventeConvexProvider>
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
import { config } from "../../lib/config";
import { fetchConvexToken, redirectToLogin } from "../../lib/auth";
import { ApiError } from "../../lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

const convexClient = new ConvexReactClient(config.convexUrl);

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
 * Mounts as a React Island. On first render it immediately executes the
 * satellite token fetch via `fetchConvexToken()` (auth.ts), then hands
 * the JWT off to Convex's auth layer.
 */
export function LaventeConvexProvider({
    children,
}: LaventeConvexProviderProps) {
    const [authState, setAuthState] = useState<AuthState>({ status: "loading" });

    // ── Satellite token fetch ────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function initSession(): Promise<void> {
            try {
                const token = await fetchConvexToken();

                if (!cancelled) {
                    setAuthState({ status: "ready", token });
                }
            } catch (err) {
                if (cancelled) return;

                // Sessie verlopen of ongeldig → stuur door naar login
                if (err instanceof ApiError && err.status === 401) {
                    redirectToLogin("sessie_verlopen");
                }

                const message =
                    err instanceof Error
                        ? err.message
                        : "Onbekende fout tijdens sessie-validatie";

                setAuthState({ status: "error", message });
            }
        }

        void initSession();

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
                    minHeight: "var(--space-24)",
                    gap: "var(--space-3)",
                    color: "var(--color-muted)",
                    fontFamily: "inherit",
                }}
            >
                <span
                    aria-hidden="true"
                    style={{
                        width: "var(--spinner-size)",
                        height: "var(--spinner-size)",
                        border: "2px solid currentColor",
                        borderTopColor: "transparent",
                        borderRadius: "var(--radius-full)",
                        display: "inline-block",
                        animation: "lc-spin var(--transition-slow) linear infinite",
                        flexShrink: 0,
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
                    padding: "var(--space-4) var(--space-5)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-error-bg)",
                    color: "var(--color-error)",
                    border: "1px solid var(--color-error-border)",
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
