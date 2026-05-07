// lib/hooks/useMobileMotion.ts
// Returns animation duration helper that halves durations on mobile screens.
// SSR-safe: defaults to desktop until mounted.
"use client";
import { useState, useEffect } from "react";

export function useMobileMotion() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  /** Returns duration halved on mobile */
  const d = (duration: number) => isMobile ? duration * 0.5 : duration;
  /** Returns delay halved on mobile */
  const delay = (ms: number) => isMobile ? ms * 0.5 : ms;

  return { isMobile, d, delay };
}
