"use client";

import React, { useRef } from "react";
import { useScroll, useTransform, motion } from "framer-motion";
import HeroTextOverlays from "./HeroTextOverlays";
import HeroScrollIndicator from "./HeroScrollIndicator";

interface Props {
  ready?: boolean;
  onBookClick?: () => void;
}

export default function HeroCanvas({ ready = true, onBookClick }: Props) {
  const containerRef = useRef<HTMLElement>(null);

  // ── Scroll Progress for overlays and indicator ────────────────────────────
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Ease-out transition at the end: fade out between 0.88 and 0.98 scroll progress
  const scrollOpacity = useTransform(scrollYProgress, [0.88, 0.98], [1, 0]);

  return (
    <section
      ref={containerRef}
      className="relative w-full bg-[#050505]"
      style={{ height: "400vh" }}
    >
      <div className="sticky top-0 left-0 w-full h-screen flex items-center justify-center overflow-hidden">
        {/* Container for initial ease-in from dark */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: ready ? 1 : 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Indefinitely running Video with ease-out on scroll */}
          <motion.video
            src="/images/home-hero.mp4"
            autoPlay
            loop
            muted
            playsInline
            style={{ opacity: scrollOpacity }}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
          />
        </motion.div>

        {/* Cinematic radial vignette */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
          }}
        />

        {/* Text overlays keyed to raw scroll for predictable timing */}
        <HeroTextOverlays scrollYProgress={scrollYProgress} onBookClick={onBookClick} />
      </div>

      {/* Right-edge scroll progress indicator */}
      <HeroScrollIndicator scrollYProgress={scrollYProgress} />
    </section>
  );
}
