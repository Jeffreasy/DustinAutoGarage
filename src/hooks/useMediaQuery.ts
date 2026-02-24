/**
 * src/hooks/useMediaQuery.ts
 *
 * Gedeelde media-query hooks — SSR-veilig (default false tijdens hydration).
 *
 * Gebruik:
 *   const isMobiel = useIsMobiel();    // < 640px
 *   const isTablet = useIsTablet();    // < 1024px
 *   const match = useMediaQuery("(prefers-color-scheme: dark)");
 */

import { useState, useEffect } from "react";

/**
 * Generieke media-query hook.
 * Geeft `false` terug tijdens SSR/hydration om hydration-mismatch te voorkomen.
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia(query);
        setMatches(mq.matches);

        function handleChange(e: MediaQueryListEvent) {
            setMatches(e.matches);
        }

        mq.addEventListener("change", handleChange);
        return () => mq.removeEventListener("change", handleChange);
    }, [query]);

    return matches;
}

/** true wanneer viewport smaller is dan 640px (telefoon / kleine tablet) */
export function useIsMobiel(): boolean {
    return useMediaQuery("(max-width: 639px)");
}

/** true wanneer viewport smaller is dan 1024px (tablet in portretstand) */
export function useIsTablet(): boolean {
    return useMediaQuery("(max-width: 1023px)");
}
