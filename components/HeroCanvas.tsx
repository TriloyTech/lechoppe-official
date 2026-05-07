"use client";

import React, { useRef, useEffect, useCallback } from "react";
import {
  useScroll,
  useSpring,
  useVelocity,
  useMotionValueEvent,
} from "framer-motion";
import HeroTextOverlays from "./HeroTextOverlays";
import HeroScrollIndicator from "./HeroScrollIndicator";

// ─── Constants ────────────────────────────────────────────────────────────────
const TOTAL_FRAMES = 121;
const INITIAL_LOAD = 18;
const FRAME_PATH   = (idx: number) =>
  `/sequence/ezgif-frame-${String(idx).padStart(3, "0")}.jpg`;

// Spring config: Optimized for 400vh scroll height.
// Higher stiffness for fast response, mass 0.2 for quick acceleration, damping 25 for smooth but quick deceleration without bounce.
const SPRING_CONFIG = { stiffness: 120, damping: 25, mass: 0.2 };

// Mobile 1.5x sensitivity: animation completes faster for "flick" gestures
const MOBILE_MULTIPLIER = 1.5;

// 10% vertical safe zone — keeps burger clear of mobile browser chrome / notches
const MOBILE_SAFE_Y = 0.10;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function checkMobile() {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

/** Map spring progress (0–1) → frame index (1–121), with optional amplification */
function progressToFrame(progress: number, amplify: boolean): number {
  const p = amplify ? Math.min(progress * MOBILE_MULTIPLIER, 1) : progress;
  return 1 + p * (TOTAL_FRAMES - 1);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HeroCanvas() {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const isMobileRef  = useRef(false);

  const imagesRef        = useRef<(HTMLImageElement | null)[]>(Array(TOTAL_FRAMES).fill(null));
  const lastPaintedFrame = useRef<number>(-1);
  const rafHandle        = useRef<number | null>(null);

  // ── Scroll → Spring → Velocity ────────────────────────────────────────────
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  /**
   * useSpring wraps scrollYProgress so the animation value doesn't jump
   * with the user's finger — it "freewheels" to the target with inertia.
   * The spring fires its own change events every rAF frame until it settles.
   */
  const springProgress = useSpring(scrollYProgress, SPRING_CONFIG);

  /**
   * useVelocity tracks the raw scroll speed.
   * Used to detect "flick" events and extend the drawing loop.
   */
  const scrollVelocity = useVelocity(scrollYProgress);

  // ── Canvas resize helper ──────────────────────────────────────────────────
  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr  = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width        = cssW * dpr;
      canvas.height       = cssH * dpr;
      canvas.style.width  = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    }
  }, []);

  // ── Draw frame ────────────────────────────────────────────────────────────
  /**
   * Draws a single frame to the canvas.
   * Mobile safe-zone: ctx.save() → translate center → scale(1.1) →
   *   translate(-5% Y) so burger clears the phone status bar.
   */
  const drawFrame = useCallback((frameIdx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rounded = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(frameIdx)));
    if (rounded === lastPaintedFrame.current) return;

    const img = imagesRef.current[rounded - 1];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    syncCanvasSize();

    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    // Compute object-contain dimensions
    const imgAspect    = img.naturalWidth / img.naturalHeight;
    const canvasAspect = cssW / cssH;
    let drawW: number, drawH: number;
    if (imgAspect > canvasAspect) {
      drawW = cssW;
      drawH = cssW / imgAspect;
    } else {
      drawH = cssH;
      drawW = cssH * imgAspect;
    }
    const baseX = (cssW - drawW) / 2;
    const baseY = (cssH - drawH) / 2;

    ctx.clearRect(0, 0, cssW, cssH);

    if (isMobileRef.current) {
      /**
       * Safe-zone transform:
       *   1. Translate to canvas center
       *   2. scale(1.1) — 10% zoom so edge content is never clipped
       *   3. Translate back, then shift -MOBILE_SAFE_Y (10%) to clear status bar / notch
       */
      ctx.save();
      ctx.translate(cssW / 2, cssH / 2);
      ctx.scale(1.1, 1.1);
      ctx.translate(-cssW / 2, -cssH / 2);
      ctx.translate(0, -cssH * MOBILE_SAFE_Y); // 10% up — clears top chrome
      ctx.drawImage(img, baseX, baseY, drawW, drawH);
      ctx.restore();
    } else {
      ctx.drawImage(img, baseX, baseY, drawW, drawH);
    }

    lastPaintedFrame.current = rounded;
  }, [syncCanvasSize]);

  // ── rAF scheduler: debounced single frame per rAF tick ────────────────────
  /**
   * The spring fires change events at ~60fps while animating.
   * Each change event schedules ONE rAF draw. We cancel any pending
   * rAF to avoid redundant draws on the same frame.
   */
  const scheduleRaf = useCallback((frameIdx: number) => {
    if (rafHandle.current !== null) {
      cancelAnimationFrame(rafHandle.current);
    }
    rafHandle.current = requestAnimationFrame(() => {
      rafHandle.current = null;
      drawFrame(frameIdx);
    });
  }, [drawFrame]);

  // ── Image loader ──────────────────────────────────────────────────────────
  const ensureLoaded = useCallback((slotIdx: number, onReady?: () => void) => {
    if (slotIdx < 0 || slotIdx >= TOTAL_FRAMES) return;
    const existing = imagesRef.current[slotIdx];
    if (existing) {
      if (existing.complete && existing.naturalWidth > 0) onReady?.();
      else existing.addEventListener("load", () => onReady?.(), { once: true });
      return;
    }
    const img    = new Image();
    img.decoding = "async";
    img.onload   = () => onReady?.();
    img.src      = FRAME_PATH(slotIdx + 1);
    imagesRef.current[slotIdx] = img;
  }, []);

  // ── Mount: eager load + lazy background load ──────────────────────────────
  useEffect(() => {
    isMobileRef.current = checkMobile();
    syncCanvasSize();

    // Eager: first N frames so the first scroll feels instant
    for (let i = 0; i < Math.min(INITIAL_LOAD, TOTAL_FRAMES); i++) {
      const captured = i;
      ensureLoaded(captured, () => { if (captured === 0) drawFrame(1); });
    }

    // Lazy: rest of the sequence in background
    let lazyIdx = INITIAL_LOAD;
    let lazyTimer: ReturnType<typeof setTimeout>;
    const loadNext = () => {
      if (lazyIdx >= TOTAL_FRAMES) return;
      ensureLoaded(lazyIdx++);
      lazyTimer = setTimeout(loadNext, 16);
    };
    const startTimer = setTimeout(loadNext, 700);

    const onResize = () => {
      isMobileRef.current = checkMobile();
      lastPaintedFrame.current = -1;
      syncCanvasSize();
      // Redraw current position
      const frame = progressToFrame(springProgress.get(), isMobileRef.current);
      drawFrame(frame);
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      clearTimeout(startTimer);
      clearTimeout(lazyTimer!);
      window.removeEventListener("resize", onResize);
      if (rafHandle.current) { cancelAnimationFrame(rafHandle.current); rafHandle.current = null; }
      for (let i = 0; i < imagesRef.current.length; i++) imagesRef.current[i] = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Core: spring fires this on EVERY frame while animating ────────────────
  /**
   * This is the heart of the freewheel effect.
   * useSpring fires "change" events at ~60fps as it eases toward the target.
   * Even after the user stops scrolling the spring keeps firing until it settles
   * — giving the "momentum coast" effect with no extra loop needed.
   */
  useMotionValueEvent(springProgress, "change", (latest) => {
    const frame = progressToFrame(latest, isMobileRef.current);
    const idx   = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(frame) - 1));

    // Pre-load the target frame and 2 neighbours for silky transitions
    ensureLoaded(idx);
    ensureLoaded(Math.max(0, idx - 1));
    ensureLoaded(Math.min(TOTAL_FRAMES - 1, idx + 1));

    scheduleRaf(frame);
  });

  // ── Velocity listener: extends drawing during fast flicks ─────────────────
  /**
   * On fast mobile flicks, scroll velocity is briefly very high.
   * We detect this and also ensure the spring loop is running.
   * (The spring handles the actual continuation — this is insurance.)
   */
  useMotionValueEvent(scrollVelocity, "change", (vel) => {
    if (Math.abs(vel) > 0.005) {
      const frame = progressToFrame(springProgress.get(), isMobileRef.current);
      scheduleRaf(frame);
    }
  });

  return (
    <section
      ref={containerRef}
      className="relative w-full bg-[#050505]"
      style={{ height: "400vh" }}
    >
      <div className="sticky top-0 left-0 w-full h-screen flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />

        {/* Cinematic radial vignette */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
          }}
        />

        {/* Text overlays keyed to raw scroll (not spring) for predictable timing */}
        <HeroTextOverlays scrollYProgress={scrollYProgress} />
      </div>

      {/* Right-edge scroll progress indicator */}
      <HeroScrollIndicator scrollYProgress={scrollYProgress} />
    </section>
  );
}
