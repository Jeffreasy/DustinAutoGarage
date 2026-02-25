/**
 * src/hooks/useResponsive.ts
 *
 * SSR-safe responsive-breakpoint hook.
 * Gebruikt window.matchMedia met een cleanup listener.
 *
 * Breakpoints (consistent met design-tokens):
 *   xs  < 640px   (mobiel)
 *   sm  640–1023  (tablet)
 *   lg  1024–1279 (laptop)
 *   xl  ≥ 1280    (desktop)
 */

import { useState, useEffect } from "react";

export type Breakpoint = "xs" | "sm" | "lg" | "xl";

function getBreakpoint(width: number): Breakpoint {
    if (width < 640) return "xs";
    if (width < 1024) return "sm";
    if (width < 1280) return "lg";
    return "xl";
}

export function useResponsive() {
    const [bp, setBp] = useState<Breakpoint>(() =>
        typeof window !== "undefined"
            ? getBreakpoint(window.innerWidth)
            : "xl" // SSR default: desktop
    );

    useEffect(() => {
        function onResize() {
            setBp(getBreakpoint(window.innerWidth));
        }
        window.addEventListener("resize", onResize, { passive: true });
        onResize(); // sync op mount
        return () => window.removeEventListener("resize", onResize);
    }, []);

    return {
        bp,
        isMobile: bp === "xs",
        isTablet: bp === "sm",
        isTabletOrSmaller: bp === "xs" || bp === "sm",
        isDesktop: bp === "lg" || bp === "xl",
        isWideDesktop: bp === "xl",
    };
}
