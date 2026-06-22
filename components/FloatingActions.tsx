"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/context/LangContext";

const PHONE_RAW = "+33153279539";

/* ── Persistent Floating Actions Dock (Call + Book) ─────────────────── */
function FloatingDock({ onBookClick }: { onBookClick?: () => void }) {
  const { t } = useLang();

  const handleBookClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onBookClick) onBookClick();
  };

  return (
    <motion.div
      initial={{ y: 50, opacity: 0, x: "-50%" }}
      animate={{ y: 0, opacity: 1, x: "-50%" }}
      transition={{ delay: 1.0, type: "spring", stiffness: 260, damping: 20 }}
      className="fixed bottom-6 left-1/2 z-40 flex items-center gap-1.5 p-1.5 rounded-full border shadow-2xl backdrop-blur-md transition-all duration-300"
      style={{
        background: "var(--nav-bg)",
        borderColor: "var(--border)",
        boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.05) inset",
      }}
    >
      {/* Call Button */}
      <a
        href={`tel:${PHONE_RAW}`}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 hover:text-white"
        style={{
          fontFamily: "var(--font-inter)",
          color: "#7CB895",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
        </svg>
        <span>{t({ fr: "Appeler", en: "Call", es: "Llamar", it: "Chiama" })}</span>
      </a>

      {/* Divider */}
      <div className="w-[1.5px] h-5 bg-white/10" style={{ backgroundColor: "var(--border)" }} />

      {/* Book Button */}
      <a
        href="#reservation"
        onClick={handleBookClick}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 bg-[#7CB895] text-[#050505] shadow-lg hover:bg-[#F3CDA0] hover:text-[#050505]"
        style={{
          fontFamily: "var(--font-inter)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{t({ fr: "Réserver", en: "Book", es: "Reservar", it: "Prenota" })}</span>
      </a>
    </motion.div>
  );
}

/* ── Main FloatingActions ────────────────────────────────────────────────── */
export default function FloatingActions({ onBookClick }: { onBookClick?: () => void }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";

  return (
    <>
      {/* ── Persistent Floating Actions Dock ── */}
      {mounted && <FloatingDock onBookClick={onBookClick} />}

      {/* ── Dark/Light toggle — bottom right ── */}
      {mounted && (
        <motion.button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4, type: "spring", stiffness: 300 }}
          whileHover={{ scale: 1.12 }}
          className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 rounded-full flex items-center justify-center shadow-2xl border backdrop-blur-md transition-all duration-300"
          style={{
            width: 52, height: 52,
            backgroundColor: isDark ? "rgba(10, 10, 10, 0.75)" : "rgba(255, 255, 255, 0.9)",
            borderColor: isDark ? "rgba(124, 184, 149, 0.3)" : "rgba(26, 18, 8, 0.15)",
            boxShadow: isDark
              ? "0 0 15px rgba(124, 184, 149, 0.15), 0 4px 20px rgba(0, 0, 0, 0.5)"
              : "0 0 15px rgba(26, 18, 8, 0.05), 0 4px 20px rgba(26, 18, 8, 0.15)",
          }}
        >
          <AnimatePresence mode="wait">
            {isDark ? (
              <motion.svg key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.25 }}
                viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </motion.svg>
            ) : (
              <motion.svg key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.25 }}
                viewBox="0 0 24 24" fill="none" stroke="var(--fg)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.button>
      )}
    </>
  );
}
