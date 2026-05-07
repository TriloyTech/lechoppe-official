"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface Props {
  /** Ref of the section that contains all post-sequence content */
  containerRef: React.RefObject<HTMLElement | null>;
}

/**
 * Seamless handoff from the HeroCanvas:
 * - At scrollProgress=0  → fixed full-viewport, object-contain (identical to canvas frame 121)
 * - At scrollProgress=0.15 → shrinks to travel size, moves to the right side
 * - At scrollProgress=0.5  → drifts centre-ish with float bob
 * - At scrollProgress=0.85 → crosses to the left
 * - At scrollProgress=1   → fades out
 *
 * CSS object-fit:contain on a 100vw×100vh wrapper replicates the exact
 * canvas "object-contain" drawing maths, so the burger never jumps.
 */
export default function TravelingBurger({ containerRef }: Props) {
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // ── Transforms ───────────────────────────────────────────────────────────
  // Scale: 1 (full-screen) → travel size → fade out
  const rawScale = useTransform(
    scrollYProgress,
    [0, 0.12, 0.88, 1],
    [1,  0.32, 0.32, 0.28]
  );
  // X: centre (0) → right → centre → left → out
  const rawX = useTransform(
    scrollYProgress,
    [0, 0.12, 0.45, 0.78, 1],
    [0,  380,   30, -340, -400]
  );
  // Y gentle arc
  const rawY = useTransform(
    scrollYProgress,
    [0, 0.12, 0.45, 0.78, 1],
    [0,   10,  -40,   10,  30]
  );
  // Rotation follows drift direction
  const rotate = useTransform(
    scrollYProgress,
    [0, 0.12, 0.45, 0.78, 1],
    [0,    6,   -3,    7,   5]
  );
  // Fade: invisible until sequence almost done → fade in → fade out
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.04, 0.92, 1],
    [0,    1,    1,  0]
  );

  // Spring physics for organic weight
  const x     = useSpring(rawX,     { stiffness: 40, damping: 15 });
  const y     = useSpring(rawY,     { stiffness: 40, damping: 15 });
  const scale = useSpring(rawScale, { stiffness: 60, damping: 18 });

  return (
    /*
      Outer wrapper: fixed full-viewport flex-center.
      This means at scale=1 the image is perfectly contained — exactly matching
      what the canvas draws with its object-contain logic.
    */
    <motion.div
      style={{ opacity }}
      className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center"
      aria-hidden="true"
    >
      <motion.div
        style={{ x, y, scale, rotate }}
        className="w-screen h-screen flex items-center justify-center"
      >
        {/* Perpetual float bob once it's in travel mode */}
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [0, 1.2, 0, -1.2, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image
            src="/images/burger-static.png"
            alt="L'Échoppe signature burger"
            width={900}
            height={900}
            className="w-auto h-auto max-w-[80vw] max-h-[35vh] sm:max-h-[55vh] md:max-h-[80vh] object-contain"
            style={{
              mixBlendMode: "multiply",
              filter: "drop-shadow(0 40px 80px rgba(0,0,0,0.95)) drop-shadow(0 10px 24px rgba(0,0,0,0.7))",
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
