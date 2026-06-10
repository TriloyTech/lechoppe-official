"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";

/**
 * SmoothScrollProvider — wraps Lenis over the entire app.
 * Lenis intercepts native scroll and replaces it with buttery inertial momentum.
 * Works on both desktop (mouse wheel) and mobile (touch).
 *
 * HeroCanvas continues to use useScroll from Framer Motion which
 * listens to the native scrollY — Lenis syncs this correctly.
 */
export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration:    1.4,      // seconds to complete one scroll unit — longer = silkier
      easing:      (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo-out
      smoothWheel: true,     // desktop wheel
      touchMultiplier: 1.8,  // amplify mobile touch so flicks feel responsive
    });

    lenisRef.current = lenis;
    (window as any).lenis = lenis;

    // Drive Lenis on rAF — this is the official pattern
    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
      if ((window as any).lenis === lenis) {
        (window as any).lenis = undefined;
      }
    };
  }, []);

  return <>{children}</>;
}
