"use client";

import { motion, useTransform, MotionValue } from "framer-motion";

interface Props {
  scrollYProgress: MotionValue<number>;
}

/**
 * Minimalist fixed-right scroll progress indicator.
 * Shows during the hero animation phase and fades out once complete.
 */
export default function HeroScrollIndicator({ scrollYProgress }: Props) {
  const scaleY  = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.02, 0.92, 0.98], [0, 1, 1, 0]);
  const dotY    = useTransform(scrollYProgress, [0, 1], [0, 88]); // px travel inside 112px track
  const pctVal  = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <motion.div
      style={{ opacity }}
      className="fixed right-4 md:right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1.5 pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Track */}
      <div className="relative w-[2px] h-28 rounded-full bg-white/10 overflow-visible">
        {/* Fill bar */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            scaleY,
            originY: 0,
            background: "linear-gradient(to bottom, #7CB895, #F3CDA0)",
          }}
        />

        {/* Glowing travel dot */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-[7px] h-[7px] rounded-full"
          style={{
            y: dotY,
            background: "#7CB895",
            boxShadow: "0 0 10px 2px #7CB895",
          }}
        />
      </div>

      {/* Percentage */}
      <motion.span
        className="text-[0.42rem] tracking-widest text-white/25 tabular-nums"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {useTransform(pctVal, (v) => `${Math.round(v)}%`)}
      </motion.span>
    </motion.div>
  );
}
