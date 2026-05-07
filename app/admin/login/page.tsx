"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

import { useLang, LANG_LABELS, LANG_FLAGS, Lang } from "@/context/LangContext";

/* ── Compact language dropdown for admin pages ── */
function AdminLangDropdown() {
  const { lang, setLang } = useLang();
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
        className="text-[0.6rem] tracking-[0.25em] uppercase px-2.5 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5"
        style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-inter)" }}
      >
        <span>{LANG_FLAGS[lang]}</span>
        <span>{lang.toUpperCase()}</span>
        <svg width="8" height="8" viewBox="0 0 12 12" fill="currentColor" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-[999] min-w-[140px] rounded-xl overflow-hidden"
            style={{ background: "rgba(20,20,20,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}
          >
            {langs.map((l) => (
              <button
                key={l}
                onClick={() => { setLang(l); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors ${l === lang ? "text-[#7CB895] bg-[#7CB895]/10" : "text-white/60 hover:text-white hover:bg-white/5"}`}
                style={{ fontFamily: "var(--font-inter)" }}
              >
                <span className="text-sm">{LANG_FLAGS[l]}</span>
                <span className="tracking-wide">{LANG_LABELS[l]}</span>
                {l === lang && <span className="ml-auto text-[#7CB895]">✓</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminLoginPage() {
  const router = useRouter();
  const { t, lang, toggle: toggleLang } = useLang();
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bebas: React.CSSProperties = {
    fontFamily: "var(--font-bebas, 'Bebas Neue')",
    letterSpacing: "0.06em",
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        setError(t({ fr: "Mot de passe incorrect. Réessayez.", en: "Incorrect password. Try again.", es: "Contraseña incorrecta. Inténtelo de nuevo.", it: "Password errata. Riprova." }));
        setLoading(false);
      }
    } catch {
      setError(t({ fr: "Erreur réseau. Réessayez.", en: "Network error. Try again.", es: "Error de red. Inténtelo de nuevo.", it: "Errore di rete. Riprova." }));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
      {/* Decorative glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(124,184,149,0.06) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative"
      >
        {/* EN/FR Toggle */}
        <div className="absolute top-0 right-0 flex items-center justify-end z-10">
          <AdminLangDropdown />
        </div>
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <div className="relative">
            <Image
              src="/images/logo.png"
              alt="L'Échoppe de Paris"
              width={110}
              height={110}
              className="w-28 h-28 object-contain"
              style={{}}
            />
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 backdrop-blur-sm">
          <h1
            className="text-[2.8rem] text-[#F5F5F5] uppercase text-center mb-1"
            style={bebas}
          >
            Admin Portal
          </h1>
          <p
            className="text-center text-[#F5F5F5]/30 text-xs tracking-widest uppercase mb-8"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            L&apos;Échoppe de Paris · {t({ fr: "Accès Restreint", en: "Restricted Access", es: "Acceso Restringido", it: "Accesso Limitato" })}
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="admin-passphrase"
                className="block text-[0.65rem] tracking-[0.3em] uppercase text-[#F5F5F5]/40 mb-2"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                {t({ fr: "Mot de passe", en: "Password", es: "Contraseña", it: "Password" })}
              </label>
              <input
                id="admin-passphrase"
                type="password"
                required
                autoComplete="current-password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-[#F5F5F5] text-sm placeholder:text-white/20 focus:outline-none focus:border-[#7CB895]/60 transition-all duration-300"
                style={{ fontFamily: "var(--font-inter)" }}
              />
            </div>

            {error && (
              <p
                className="text-red-400 text-xs"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                ⚠ {error}
              </p>
            )}

            <button
              id="admin-login-submit"
              type="submit"
              disabled={loading || !passphrase}
              className="w-full py-4 bg-[#7CB895] text-[#0A0A0A] text-sm font-semibold tracking-[0.18em] uppercase rounded-lg transition-all duration-300 hover:bg-[#6aaa83] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              {loading ? t({ fr: "Connexion…", en: "Connecting…", es: "Conectando…", it: "Connessione…" }) : t({ fr: "Se connecter →", en: "Login →", es: "Iniciar sesión →", it: "Accedi →" })}
            </button>
          </form>
        </div>

        <p
          className="text-center text-[#F5F5F5]/15 text-xs mt-6"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          &larr;{" "}
          <a href="/" className="hover:text-[#7CB895]/60 transition-colors">
            {t({ fr: "Retour au site", en: "Back to site", es: "Volver al sitio", it: "Torna al sito" })}
          </a>
        </p>
      </motion.div>
    </div>
  );
}
