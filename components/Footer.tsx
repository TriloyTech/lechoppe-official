"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useLang } from "@/context/LangContext";
import { useSiteContent } from "@/lib/hooks/useSiteContent";

const DELIVEROO_URL = "https://deliveroo.fr/fr/menu/paris/saint-ambroise/l-echoppe-de-paris";

const LEGAL = [
  { fr: "Politique de Confidentialité", en: "Privacy Policy", es: "Política de Privacidad", it: "Privacy Policy", href: "/privacy" },
  { fr: "Conditions Générales", en: "Terms & Conditions", es: "Términos y Condiciones", it: "Termini e Condizioni", href: "/terms" },
  { fr: "Mentions Légales", en: "Legal Notice", es: "Aviso Legal", it: "Note Legali", href: "/legal" },
];

export default function Footer({ onBookClick }: { onBookClick?: () => void }) {
  const { t } = useLang();
  const { content } = useSiteContent(); // Dynamic content from admin

  const bebas: React.CSSProperties = { fontFamily: "var(--font-bebas)", letterSpacing: "0.06em" };
  const inter: React.CSSProperties = { fontFamily: "var(--font-inter)" };

  // Generate dynamic columns based on site content
  const COLS = [
    {
      fr: "Carte", en: "Menu", es: "Carta", it: "Menù",
      links: [
        { fr: "Les Burgers", en: "Burgers", es: "Hamburguesas", it: "Burger", href: "/#menu" },
        { fr: "Accompagnements", en: "Sides", es: "Acompañamientos", it: "Contorni", href: "/#menu" },
        { fr: "Boissons", en: "Drinks", es: "Bebidas", it: "Bevande", href: "/#menu" },
        { fr: "Desserts", en: "Desserts", es: "Postres", it: "Dolci", href: "/#menu" },
      ],
    },
    {
      fr: "Restaurant", en: "Restaurant", es: "Restaurante", it: "Ristorante",
      links: [
        { fr: "Notre Histoire", en: "Our Story", es: "Nuestra Historia", it: "La Nostra Storia", href: "/#histoire" },
        { fr: "Réservations", en: "Reservations", es: "Reservas", it: "Prenotazioni", href: "/#reservation" },
        { fr: "Avis Clients", en: "Reviews", es: "Opiniones", it: "Recensioni", href: "/#avis" },
        { fr: "Nous Trouver", en: "Find Us", es: "Encüentranos", it: "Trovaci", href: "/#location" },
      ],
    },
    {
      fr: "Contact", en: "Contact", es: "Contacto", it: "Contatto",
      links: [
        { fr: content.phone, en: content.phone, es: content.phone, it: content.phone, href: `tel:${content.phone.replace(/\\s/g, '')}` },
        { fr: "contact@lechoppe.fr", en: "contact@lechoppe.fr", es: "contact@lechoppe.fr", it: "contact@lechoppe.fr", href: "mailto:contact@lechoppe.fr" },
        { fr: content.address.split(',')[0], en: content.address.split(',')[0], es: content.address.split(',')[0], it: content.address.split(',')[0], href: "#location" },
        { fr: content.address.split(',').slice(1).join(',').trim(), en: content.address.split(',').slice(1).join(',').trim(), es: content.address.split(',').slice(1).join(',').trim(), it: content.address.split(',').slice(1).join(',').trim(), href: "#location" },
      ],
    },
  ];

  return (
    <footer className="relative bg-bg overflow-hidden" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="absolute top-0 left-0 w-[400px] h-[300px] pointer-events-none blur-[100px] opacity-[0.05]"
        style={{ background: "radial-gradient(circle, #7CB895, transparent 70%)" }} aria-hidden />

      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pt-20 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div>
            <Link href="/" className="block mb-5 group">
              <div style={{
                display: "inline-block",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 0 0 1px rgba(124,184,149,0.12), 0 4px 24px rgba(0,0,0,0.6), 0 0 40px rgba(0,0,0,0.4)",
                filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.5))",
              }}>
                <Image
                  src="/images/logo-full-brand.png"
                  alt="L'Échoppe de Paris"
                  width={160}
                  height={120}
                  className="h-auto w-36 object-contain block opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                  unoptimized
                />
              </div>
            </Link>
            <p className="text-fg/60 text-sm leading-relaxed max-w-xs mb-8" style={inter}>
              {t(content.tagline_fr, content.tagline_en)}
            </p>

            {/* Socials */}
            <div className="flex gap-3">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:text-[#7CB895] hover:border-[#7CB895]"
                style={{ border: "1px solid var(--border)", color: "var(--fg-subtle)" }}
                aria-label="Instagram"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:text-[#7CB895] hover:border-[#7CB895]"
                style={{ border: "1px solid var(--border)", color: "var(--fg-subtle)" }}
                aria-label="Facebook"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:text-[#7CB895] hover:border-[#7CB895]"
                style={{ border: "1px solid var(--border)", color: "var(--fg-subtle)" }}
                aria-label="TikTok"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
                </svg>
              </a>
            </div>

            {/* Takeaway service note */}
            <div
              className="mt-5 flex items-start gap-2.5 p-3 rounded-xl"
              style={{
                background: "rgba(124,184,149,0.06)",
                border: "1px solid rgba(124,184,149,0.18)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#7CB895" className="shrink-0 mt-0.5" aria-hidden>
                <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zm-9-1a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z" />
              </svg>
              <p className="text-[0.65rem] leading-relaxed" style={{ color: "rgba(124,184,149,0.8)", ...inter }}>
                {t({
                  fr: "Profitez de nos burgers chez vous. Commande à emporter disponible.",
                  en: "Enjoy our burgers at home. Takeaway orders available.",
                  es: "Disfruta de nuestras hamburguesas en casa. Pedidos para llevar disponibles.",
                  it: "Goditi i nostri burger a casa. Ordini da asporto disponibili."
                })}
              </p>
            </div>
          </div>

          {/* Link columns */}
          {COLS.map((col) => (
            <div key={col.fr}>
              <h4 className="text-[1.4rem] text-fg uppercase mb-5" style={bebas}>{t({ fr: col.fr, en: col.en, es: (col as any).es, it: (col as any).it })}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.fr}>
                    {l.href.includes("#reservation") ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (onBookClick) onBookClick();
                        }}
                        className="text-fg/40 text-sm hover:text-[#7CB895] transition-colors duration-300 text-left"
                        style={inter}
                      >
                        {t({ fr: l.fr, en: l.en, es: (l as any).es, it: (l as any).it })}
                      </button>
                    ) : (
                      <Link href={l.href}
                        className="text-fg/40 text-sm hover:text-[#7CB895] transition-colors duration-300"
                        style={inter}>{t({ fr: l.fr, en: l.en, es: (l as any).es, it: (l as any).it })}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Separator */}
        <div className="w-full h-[1px] mb-8" style={{ background: "var(--border)" }} />

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[0.65rem] text-fg/30 uppercase tracking-[0.1em]" style={inter}>
            © L'Échoppe de Paris. {t({ fr: "Tous droits réservés.", en: "All rights reserved.", es: "Todos los derechos reservados.", it: "Tutti i diritti riservati." })}
            <span className="mx-2">|</span>
            {t({ fr: "Propulsé par", en: "Powered by", es: "Desarrollado por", it: "Sviluppato da" })} <a href="https://triloytech.com/" target="_blank" rel="noopener noreferrer" className="hover:text-[#7CB895] transition-colors">TriloyTech</a>
          </p>

          <ul className="flex gap-6">
            {LEGAL.map((l) => (
              <li key={l.fr}>
                <Link href={l.href} className="text-[0.65rem] text-fg/30 hover:text-fg/60 uppercase tracking-[0.1em] transition-colors" style={inter}>
                  {t({ fr: l.fr, en: l.en, es: (l as any).es, it: (l as any).it })}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
