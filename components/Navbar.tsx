"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useLang, LANG_LABELS, LANG_FLAGS, Lang } from "@/context/LangContext";
import { useSiteContent } from "@/lib/hooks/useSiteContent";

const NAV_LINKS = [
  { fr: "MENU", en: "MENU", es: "MENÚ", it: "MENU", href: "#menu" },
  { fr: "HISTOIRE", en: "STORY", es: "HISTORIA", it: "STORIA", href: "#histoire" },
  { fr: "AVIS", en: "REVIEWS", es: "OPINIONES", it: "RECENSIONI", href: "#avis" },
  { fr: "LIEU", en: "LOCATION", es: "UBICACIÓN", it: "POSIZIONE", href: "#location" },
  { fr: "RÉSERVER", en: "BOOK", es: "RESERVAR", it: "PRENOTA", href: "#reservation" },
];

// Separate takeaway link so it can have distinct styling
const TAKEAWAY_LINK = { fr: "À EMPORTER", en: "TAKEAWAY", es: "PARA LLEVAR", it: "DA ASPORTO", href: "#menu" };

const DELIVEROO_URL = "https://deliveroo.fr/fr/menu/paris/saint-ambroise/l-echoppe-de-paris";

function smoothScrollTo(id: string) {
  const el = document.getElementById(id.replace("#", ""));
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ── Language Dropdown Component ── */
function LangDropdown({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const langs: Lang[] = ["fr", "en", "es", "it"];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-[0.75rem] md:text-sm tracking-wide px-3 md:px-5 py-2 rounded flex items-center gap-2 transition-all duration-300"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.9)",
          fontFamily: "var(--font-inter)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        <span className="capitalize">{t({ fr: "Langue", en: "Language", es: "Idioma", it: "Lingua" })}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -2, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -2, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+12px)] z-[999] min-w-[200px] rounded shadow-2xl"
            style={{
              background: "#F8FAFC",
              fontFamily: "var(--font-inter)",
            }}
          >
            {/* Arrow pointing up */}
            <div 
              className="absolute -top-1.5 right-6 w-3 h-3 rotate-45"
              style={{ background: "#F8FAFC" }}
            />
            
            <div className="relative py-2 rounded overflow-hidden bg-[#F8FAFC]">
              {langs.map((l) => (
                <button
                  key={l}
                  onClick={() => { setLang(l); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-5 py-2.5 text-[0.85rem] transition-colors ${
                    l === lang
                      ? "bg-[#DDEBFA]" // Active slate/blue background like the image
                      : "hover:bg-[#F1F5F9]"
                  }`}
                >
                  <span className="font-bold text-slate-500 w-6 text-left">{l.toUpperCase() === 'EN' ? 'UK' : l.toUpperCase()}</span>
                  <span className="text-base leading-none drop-shadow-sm">{LANG_FLAGS[l]}</span>
                  <span className={`tracking-wide text-left flex-1 ${l === lang ? "text-slate-600 font-medium" : "text-slate-400 font-light"}`}>
                    {LANG_LABELS[l]}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { lang, toggle: toggleLang, t } = useLang();
  const { content } = useSiteContent();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 768) setOpen(false); };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const inter: React.CSSProperties = { fontFamily: "var(--font-inter)" };
  const bebas: React.CSSProperties = { fontFamily: "var(--font-bebas)" };

  const pathname = usePathname();
  const router = useRouter();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setOpen(false);
    if (pathname !== "/") {
      router.push(`/${href}`);
      return;
    }
    // Give drawer close animation time, then scroll
    setTimeout(() => smoothScrollTo(href), 50);
  };

  const getNavLabel = (link: typeof NAV_LINKS[0]) => {
    return (link as any)[lang] || link.en;
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-3 transition-all duration-500`}
        style={
          scrolled || open
            ? {
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              backgroundColor: "var(--nav-bg)",
              borderBottom: "1px solid var(--border)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            }
            : {}
        }
      >
        {/* ── Logo ── */}
        <Link href="/" className="flex items-center select-none group" aria-label="L'Échoppe de Paris"
          onClick={() => setOpen(false)}>
          <motion.div
            whileHover={{ scale: 1.04 }}
            transition={{ duration: 0.3 }}
            style={{
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 0 0 1px rgba(124,184,149,0.15), 0 4px 20px rgba(0,0,0,0.55), 0 0 32px rgba(0,0,0,0.4)",
              filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.6))",
            }}
          >
            <Image
              src="/images/logo-full-brand.png"
              alt="L'Échoppe de Paris — Logo officiel"
              width={180}
              height={135}
              className="h-14 md:h-16 w-auto object-contain block"
              loading="eager"
              priority
            />
          </motion.div>
        </Link>

        {/* ── Desktop nav ── */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Navigation principale">
          {NAV_LINKS.slice(0, -1).map((link) => (
            <a
              key={link.fr}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-sm tracking-[0.2em] text-fg/55 hover:text-[#7CB895] transition-colors duration-300 cursor-pointer"
              style={inter}
            >
              {getNavLabel(link)}
            </a>
          ))}

          {/* ── À Emporter — distinctive mint glow link ── */}
          <a
            href={TAKEAWAY_LINK.href}
            onClick={(e) => handleNavClick(e, TAKEAWAY_LINK.href)}
            className="text-sm tracking-[0.2em] cursor-pointer transition-all duration-300 px-3 py-1 rounded-full"
            style={{
              ...inter,
              color: "#7CB895",
              border: "1px solid rgba(124,184,149,0.35)",
              background: "rgba(124,184,149,0.06)",
              boxShadow: "0 0 12px rgba(124,184,149,0.12), inset 0 0 8px rgba(124,184,149,0.04)",
              textShadow: "0 0 8px rgba(124,184,149,0.4)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.background = "rgba(124,184,149,0.12)";
              el.style.boxShadow = "0 0 20px rgba(124,184,149,0.25), inset 0 0 12px rgba(124,184,149,0.08)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = "rgba(124,184,149,0.06)";
              el.style.boxShadow = "0 0 12px rgba(124,184,149,0.12), inset 0 0 8px rgba(124,184,149,0.04)";
            }}
          >
            🥡 {getNavLabel(TAKEAWAY_LINK)}
          </a>
        </nav>

        {/* ── Right actions ── */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Deliveroo button — desktop */}
          <motion.a
            href={DELIVEROO_URL}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.6rem] tracking-[0.15em] uppercase font-semibold transition-all duration-200"
            style={{
              background: "rgba(0,204,153,0.12)",
              border: "1px solid rgba(0,204,153,0.35)",
              color: "#00CC99",
              fontFamily: "var(--font-inter)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-11h2v6h-2zm0-4h2v2h-2z" />
            </svg>
            {t({ fr: "Commander", en: "Order Now", es: "Pedir", it: "Ordinare" })}
          </motion.a>

          {/* ── Call to Order — desktop, mint outline, tel: link ── */}
          <motion.a
            href={`tel:${content.phone.replace(/\\s/g, '')}`}
            aria-label={t({ fr: "Appeler pour commander", en: "Call to Order", es: "Llamar para pedir", it: "Chiama per ordinare" })}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.6rem] tracking-[0.15em] uppercase font-semibold transition-all duration-200"
            style={{
              fontFamily: "var(--font-inter)",
              color: "#7CB895",
              border: "1px solid rgba(124,184,149,0.45)",
              background: "rgba(124,184,149,0.06)",
              boxShadow: "0 0 10px rgba(124,184,149,0.1)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.background = "rgba(124,184,149,0.14)";
              el.style.boxShadow = "0 0 18px rgba(124,184,149,0.25)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = "rgba(124,184,149,0.06)";
              el.style.boxShadow = "0 0 10px rgba(124,184,149,0.1)";
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
            </svg>
            {t({ fr: "Appeler", en: "Call", es: "Llamar", it: "Chiama" })}
          </motion.a>

          {/* Language dropdown */}
          <LangDropdown />

          {/* Desktop CTA */}
          <motion.a
            href="#reservation"
            onClick={(e) => handleNavClick(e, "#reservation")}
            whileHover={{ scale: 1.05, backgroundColor: "#F3CDA0" }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="hidden md:block bg-[#7CB895] text-[#050505] font-semibold text-xs tracking-[0.2em] px-5 py-2.5 uppercase cursor-pointer select-none"
            style={{ ...inter, clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 100%, 8px 100%)" }}>
            {t({ fr: "RÉSERVER", en: "BOOK", es: "RESERVAR", it: "PRENOTA" })}
          </motion.a>

          {/* ── Hamburger button (mobile only) ── */}
          <button
            id="hamburger-toggle"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg gap-[5px] transition-colors hover:bg-white/5"
          >
            <motion.span
              animate={open ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.25 }}
              className="block w-5 h-[1.5px] bg-fg origin-center"
            />
            <motion.span
              animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.2 }}
              className="block w-5 h-[1.5px] bg-fg"
            />
            <motion.span
              animate={open ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.25 }}
              className="block w-5 h-[1.5px] bg-fg origin-center"
            />
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setOpen(false)}
            />

            {/* Drawer panel */}
            <motion.nav
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              style={{ backgroundColor: "var(--drawer-bg)", borderLeft: "1px solid var(--border)" }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[75vw] max-w-xs flex flex-col pt-24 pb-12 px-8 md:hidden"
              aria-label="Mobile navigation"
            >
              {/* Links */}
              <div className="flex flex-col gap-1 flex-1">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.fr}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 + i * 0.06, duration: 0.3 }}
                  >
                    <a
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href)}
                      className={`flex items-center justify-between py-4 border-b border-white/6 group ${link.fr === "RÉSERVER"
                          ? "text-[#7CB895]"
                          : "text-fg/70 hover:text-fg"
                        } transition-colors cursor-pointer`}
                    >
                      <span className="text-[1.6rem] tracking-[0.08em] uppercase" style={bebas}>
                        {getNavLabel(link)}
                      </span>
                      <span className="text-fg/20 group-hover:text-[#7CB895] transition-colors">→</span>
                    </a>
                  </motion.div>
                ))}

                {/* À Emporter mobile link */}
                <motion.div
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.36, duration: 0.3 }}
                >
                  <a
                    href={TAKEAWAY_LINK.href}
                    onClick={(e) => handleNavClick(e, TAKEAWAY_LINK.href)}
                    className="flex items-center justify-between py-4 border-b transition-colors cursor-pointer"
                    style={{ borderColor: "rgba(124,184,149,0.2)" }}
                  >
                    <span className="text-[1.6rem] tracking-[0.08em] uppercase" style={{ ...bebas, color: "#7CB895" }}>
                      🥡 {getNavLabel(TAKEAWAY_LINK)}
                    </span>
                    <span style={{ color: "#7CB895" }}>→</span>
                  </a>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.42, duration: 0.3 }}
                >
                  <a
                    href={DELIVEROO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 py-4 border-b border-white/6 transition-colors"
                    style={{ color: "#00CC99" }}
                  >
                    <span className="text-[1.6rem] tracking-[0.08em] uppercase" style={bebas}>
                      {t({ fr: "LIVRAISON", en: "DELIVERY", es: "ENTREGA", it: "CONSEGNA" })}
                    </span>
                    <span className="text-xs ml-auto opacity-60">Deliveroo →</span>
                  </a>
                </motion.div>
              </div>

              {/* Bottom info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="pt-8"
              >
                <p className="text-fg/25 text-[0.6rem] tracking-widest uppercase mb-1" style={inter}>
                  {content.address}
                </p>
                <a href={`tel:${content.phone.replace(/\\s/g, '')}`} className="text-[#7CB895] text-sm hover:text-[#F3CDA0] transition-colors"
                  style={inter}>{content.phone}</a>
              </motion.div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
