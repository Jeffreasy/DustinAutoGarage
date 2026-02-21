/// <reference types="astro/client" />

/**
 * src/env.d.ts
 *
 * Uitbreiding van Astro's ingebouwde types voor dit project.
 *
 * - `App.Locals` definieert wat er in `Astro.locals` / `context.locals` zit.
 *   Gevuld door de Astro Middleware via de LaventeCare /auth/me response.
 */

interface LaventeUser {
    id: string;
    email: string;
    full_name: string;
    role: "admin" | "editor" | "user" | "viewer";
    tenant_id: string;
}

declare namespace App {
    interface Locals {
        /** Ingelogde gebruiker — gezet door src/middleware.ts. */
        user: LaventeUser | null;
    }
}
