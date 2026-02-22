/**
 * src/lib/api.ts
 *
 * Typed fetch-wrapper voor alle /api/auth/* aanroepen vanuit de browser.
 *
 * Wat dit biedt:
 *   - Automatisch `credentials: "include"` (HttpOnly cookie forwarding)
 *   - Automatisch `Accept: application/json` header
 *   - Gestructureerde `ApiError` met HTTP-status code
 *   - Generics voor type-safe response parsing
 *
 * Gebruik:
 *   import { apiFetch, ApiError } from "@/lib/api";
 *
 *   const data = await apiFetch<{ token: string }>("/api/auth/token");
 */

// ---------------------------------------------------------------------------
// Error klasse
// ---------------------------------------------------------------------------

/**
 * Gestructureerde API-fout met HTTP-status en optionele server-boodschap.
 */
export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly body?: unknown
    ) {
        super(message);
        this.name = "ApiError";
    }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

/**
 * Doet een fetch naar een lokaal `/api/*` pad met standaard-instellingen.
 *
 * @param path   - Relatief pad, bijv. "/api/auth/token"
 * @param init   - Optionele RequestInit overrides (method, body, extra headers)
 * @returns       - Geparsed JSON als het opgegeven type T
 * @throws ApiError als de server een niet-2xx status retourneert
 * @throws Error    als het netwerk onbereikbaar is
 */
export async function apiFetch<T>(
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const { headers: extraHeaders, ...restInit } = init;

    const response = await fetch(path, {
        credentials: "include", // Anti-Gravity: altijd HttpOnly cookie meesturen
        ...restInit,
        headers: {
            Accept: "application/json",
            ...(restInit.body ? { "Content-Type": "application/json" } : {}),
            ...extraHeaders,
        },
    });

    // Parse response body voor both succces en error gevallen
    let responseBody: unknown;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        responseBody = await response.json().catch(() => null);
    } else {
        responseBody = await response.text().catch(() => null);
    }

    if (!response.ok) {
        // Probeer een leesbare foutmelding uit de server response te extraheren
        const serverMessage =
            typeof responseBody === "object" &&
                responseBody !== null &&
                "error" in responseBody
                ? String((responseBody as Record<string, unknown>).error)
                : `HTTP ${response.status}: ${response.statusText}`;

        throw new ApiError(response.status, serverMessage, responseBody);
    }

    return responseBody as T;
}
