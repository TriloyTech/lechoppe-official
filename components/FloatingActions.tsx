"use client";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/context/LangContext";

const PHONE_NUMBER = "+33 1 53 27 95 39";
const PHONE_RAW    = "+33153279539";

/* ── Scroll-triggered mobile sticky "Call to Order" bar ─────────────────── */
function MobileCallBar() {
  const { t }              = useLang();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Appear once the user has scrolled past ~80vh (clears the hero canvas)
    const threshold = typeof window !== "undefined" ? window.innerHeight * 0.8 : 600;
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          // Only visible on mobile (md and below), sits above the FABs
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2"
          style={{
            background: "linear-gradient(to top, rgba(5,5,5,0.97) 60%, transparent)",
            backdropFilter: "blur(12px)",
          }}
        >
          <AnimatePresence mode="wait">
            {!expanded ? (
              /* ── Compact bar ── */
              <motion.button
                key="bar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setExpanded(true)}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold tracking-[0.15em] uppercase text-sm"
                style={{
                  fontFamily: "var(--font-inter)",
                  background: "linear-gradient(135deg, rgba(124,184,149,0.18), rgba(124,184,149,0.08))",
                  border: "1px solid rgba(124,184,149,0.4)",
                  color: "#7CB895",
                  boxShadow: "0 0 24px rgba(124,184,149,0.15), inset 0 1px 0 rgba(124,184,149,0.1)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                </svg>
                {t({ fr: "Appeler pour commander", en: "Call to Order", es: "Llamar para pedir", it: "Chiama per ordinare" })}
              </motion.button>
            ) : (
              /* ── Expanded state with number + actions ── */
              <motion.div
                key="expanded"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(10,10,10,0.98)",
                  border: "1px solid rgba(124,184,149,0.3)",
                  boxShadow: "0 0 32px rgba(124,184,149,0.12)",
                }}
              >
                <div className="px-4 pt-4 pb-3">
                  <p className="text-[0.5rem] tracking-[0.35em] uppercase text-white/30 mb-1"
                    style={{ fontFamily: "var(--font-inter)" }}>
                    {t({ fr: "À emporter · Commandez directement", en: "Takeaway · Call us directly", es: "Para llevar · Llámenos directamente", it: "Da asporto · Chiamaci direttamente" })}
                  </p>
                  <p className="text-[#7CB895] text-xl font-semibold tracking-wide"
                    style={{ fontFamily: "var(--font-inter)" }}>
                    {PHONE_NUMBER}
                  </p>
                </div>
                <div className="grid grid-cols-2 border-t" style={{ borderColor: "rgba(124,184,149,0.15)" }}>
                  <a
                    href={`tel:${PHONE_RAW}`}
                    className="flex items-center justify-center gap-2 py-3.5 text-[0.6rem] tracking-[0.2em] uppercase font-semibold transition-colors"
                    style={{ fontFamily: "var(--font-inter)", color: "#7CB895", background: "rgba(124,184,149,0.08)" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                    </svg>
                    {t({ fr: "Appeler", en: "Call Now", es: "Llamar", it: "Chiama" })}
                  </a>
                  <button
                    onClick={() => setExpanded(false)}
                    className="flex items-center justify-center py-3.5 text-[0.6rem] tracking-[0.2em] uppercase transition-colors border-l"
                    style={{
                      fontFamily: "var(--font-inter)",
                      color: "rgba(255,255,255,0.3)",
                      borderColor: "rgba(124,184,149,0.15)",
                    }}
                  >
                    {t({ fr: "Fermer", en: "Close", es: "Cerrar", it: "Chiudi" })}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Main FloatingActions ────────────────────────────────────────────────── */
export default function FloatingActions() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";

  return (
    <>
      {/* ── Mobile sticky CTA bar ── */}
      <MobileCallBar />

      {/* ── FAB phone button (bottom-left) — hidden on mobile since bar handles it ── */}
      <motion.a
        href={`tel:${PHONE_RAW}`}
        aria-label="Appeler L'Échoppe de Paris"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 300 }}
        whileHover={{ scale: 1.12 }}
        className="hidden md:flex fixed bottom-6 left-6 z-50 rounded-full items-center justify-center shadow-2xl"
        style={{ width: 52, height: 52, backgroundColor: "#7CB895" }}
      >
        <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
        </svg>
      </motion.a>

      {/* ── Dark/Light toggle — bottom right ── */}
      {mounted && (
        <motion.button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4, type: "spring", stiffness: 300 }}
          whileHover={{ scale: 1.12 }}
          className="fixed bottom-6 right-6 z-50 rounded-full flex items-center justify-center shadow-2xl border border-white/10 backdrop-blur-md transition-colors duration-300"
          style={{
            width: 52, height: 52,
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          }}
        >
          <AnimatePresence mode="wait">
            {isDark ? (
              <motion.svg key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.25 }}
                viewBox="0 0 24 24" fill="none" stroke="#F3CDA0" strokeWidth="2"
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
                viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2"
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
