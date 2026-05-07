"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ── Preload config — UNTOUCHED ──────────────────────────── */
const TOTAL        = 121;
const PRELOAD_COUNT = 12;
const path = (i: number) => `/sequence/ezgif-frame-${String(i).padStart(3, "0")}.jpg`;

/* ── "BIENVENUE" letter-stagger ──────────────────────────── */
const WORD   = "BIENVENUE";
const LETTERS = WORD.split("");

/* ── SVG ring circumference (r=158 in a 320x320 viewBox) ─── */
const RING_R   = 158;
const RING_C   = 2 * Math.PI * RING_R;

/* ── Shared easing ───────────────────────────────────────── */
const EASE_EXPO = [0.22, 1, 0.36, 1] as const;

export default function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [pct,  setPct]  = useState(0);
  const [done, setDone] = useState(false);

  /* ── Preload logic — UNTOUCHED ─────────────────────────── */
  useEffect(() => {
    let loaded = 0;
    for (let i = 1; i <= PRELOAD_COUNT; i++) {
      const img = new window.Image();
      img.onload = img.onerror = () => {
        loaded++;
        setPct(Math.round((loaded / PRELOAD_COUNT) * 100));
        if (loaded === PRELOAD_COUNT) {
          setTimeout(() => {
            setDone(true);
            setTimeout(onComplete, 600);   // ← onComplete timing UNTOUCHED
          }, 200);
        }
      };
      img.src = path(i);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="loader"
          initial={{ y: 0 }}
          exit={{ y: "-100vh" }}                          /* ① CURTAIN WIPE UP */
          transition={{ duration: 0.85, ease: EASE_EXPO }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none overflow-hidden"
          style={{ background: "#050505" }}
        >

          {/* ── ② BIENVENUE — letter-by-letter reveal ─────── */}
          <motion.div
            className="flex gap-[0.18em] mb-6"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          >
            {LETTERS.map((char, i) => (
              <motion.span
                key={i}
                variants={{
                  hidden:  { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0,
                    transition: { duration: 0.55, ease: EASE_EXPO } },
                }}
                style={{
                  fontFamily:    "var(--font-bebas)",
                  fontSize:      "0.72rem",
                  letterSpacing: "0.35em",
                  color:         "#D4AF37",
                  lineHeight:    1,
                }}
              >
                {char}
              </motion.span>
            ))}
          </motion.div>

          {/* ── Emblem + rings ───────────────────────────────── */}
          <div className="relative flex items-center justify-center mb-10 mt-6">

            {/* Outer slow-pulse ring */}
            <motion.div
              className="absolute rounded-full"
              style={{ width: 200, height: 200,
                border: "1px solid rgba(212,175,55,0.15)" }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.15, 0.4] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Middle ring */}
            <motion.div
              className="absolute rounded-full"
              style={{ width: 168, height: 168,
                border: "1px solid rgba(212,175,55,0.25)" }}
              animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            />

            {/* Inner glow ring */}
            <motion.div
              className="absolute rounded-full"
              style={{ width: 136, height: 136,
                border: "1px solid rgba(212,175,55,0.4)",
                boxShadow: "0 0 40px rgba(212,175,55,0.08)" }}
              animate={{ scale: [1, 1.03, 1], opacity: [0.8, 0.3, 0.8] }}
              transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            />

            {/* Rotating dashed ring */}
            <motion.div
              className="absolute"
              style={{ width: 180, height: 180 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
            >
              <svg viewBox="0 0 180 180" fill="none" className="w-full h-full">
                <circle cx="90" cy="90" r="88"
                  stroke="rgba(212,175,55,0.2)"
                  strokeWidth="1" strokeDasharray="6 10" />
              </svg>
            </motion.div>

            {/* Counter-rotating dashed ring */}
            <motion.div
              className="absolute"
              style={{ width: 156, height: 156 }}
              animate={{ rotate: -360 }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            >
              <svg viewBox="0 0 156 156" fill="none" className="w-full h-full">
                <circle cx="78" cy="78" r="76"
                  stroke="rgba(124,184,149,0.15)"
                  strokeWidth="0.75" strokeDasharray="3 14" />
              </svg>
            </motion.div>

            {/* ③ GOLD RING DRAW-ON — SVG stroke-dashoffset ── */}
            <motion.svg
              viewBox="0 0 200 200"
              fill="none"
              className="absolute"
              style={{ width: 200, height: 200 }}
            >
              <motion.circle
                cx="100" cy="100" r={90}
                stroke="#D4AF37"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                initial={{ strokeDashoffset: Math.PI * 180, strokeDasharray: Math.PI * 180 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1.8, ease: "easeOut", delay: 0.2 }}
              />
            </motion.svg>

            {/* Central emblem */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image
                  src="/images/logo-full-brand.png"
                  alt="L'Échoppe de Paris"
                  width={180}
                  height={150}
                  className="w-[130px] h-[130px] object-cover relative z-10 rounded-full"
                  style={{ transform: "scale(1.15)" }}
                  priority
                />
              </motion.div>
            </motion.div>
          </div>

          {/* ── Wordmark ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: EASE_EXPO }}
            className="text-center mb-1"
          >
            <h1
              className="text-[clamp(2.2rem,7vw,4rem)] uppercase leading-none"
              style={{
                fontFamily:    "var(--font-bebas)",
                color:         "#D4AF37",
                letterSpacing: "0.14em",
              }}
            >
              L&apos;Échoppe
            </h1>
            <p
              className="text-[0.55rem] uppercase mt-1"
              style={{
                fontFamily:    "var(--font-inter)",
                letterSpacing: "0.55em",
                color:         "rgba(255,255,255,0.25)",
              }}
            >
              de Paris
            </p>
          </motion.div>

          {/* ── Tagline ──────────────────────────────────────── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="text-[0.55rem] uppercase mb-10 mt-3"
            style={{
              fontFamily:    "var(--font-inter)",
              letterSpacing: "0.4em",
              color:         "rgba(255,255,255,0.18)",
            }}
          >
            Bistronomy parisienne · depuis 2014
          </motion.p>

          {/* ── ④ LIQUID GOLD PROGRESS BAR with shimmer ──── */}
          <div
            className="w-48 h-px relative overflow-hidden mb-3"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            {/* The fill */}
            <motion.div
              className="absolute inset-y-0 left-0"
              style={{
                background:
                  "linear-gradient(90deg, #7CB895 0%, #D4AF37 60%, #F3CDA0 100%)",
              }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            />
            {/* Shimmer sweep — only visible over the filled area */}
            <motion.div
              className="absolute inset-y-0"
              style={{
                width:      "40%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35) 50%, transparent)",
                left:       "-40%",
              }}
              animate={{ left: ["−40%", "140%"] }}
              transition={{
                duration:   1.4,
                repeat:     Infinity,
                ease:       "easeInOut",
                repeatDelay: 0.6,
              }}
            />
          </div>

          {/* ── Percentage ───────────────────────────────────── */}
          <motion.p
            className="text-[0.6rem] tabular-nums"
            style={{
              fontFamily:    "var(--font-inter)",
              letterSpacing: "0.3em",
              color:         "rgba(212,175,55,0.45)",
            }}
          >
            {pct}%
          </motion.p>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
