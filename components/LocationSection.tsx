"use client";
import { motion } from "framer-motion";
import { useLang } from "@/context/LangContext";
import { useSiteContent } from "@/lib/hooks/useSiteContent";
import { useMemo } from "react";

const MAP_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2625.0!2d2.3858157!3d48.853985!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e6720ac0344d39%3A0x41605db1cf934fdf!2sL'Echoppe%20de%20Paris!5e0!3m2!1sfr!2sfr!4v1714172400000!5m2!1sfr!2sfr";

const card: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--surface)",
  boxShadow: "var(--card-shadow)",
};

export default function LocationSection() {
  const { t } = useLang();
  const { content } = useSiteContent();
  const bebas: React.CSSProperties = { fontFamily: "var(--font-bebas)", letterSpacing: "0.04em", lineHeight: 0.92 };

  // Parse hours from JSON or fallback
  const hoursData = useMemo(() => {
    try {
      return JSON.parse(content.opening_hours);
    } catch {
      return [
        { day: "Lun – Sam", day_en: "Mon – Sat", hours: "11h30 – 15h00  ·  18h30 – 23h00" },
        { day: "Dimanche",  day_en: "Sunday",    hours: "11h30 – 15h00  ·  18h30 – 23h00" },
      ];
    }
  }, [content.opening_hours]);

  return (
    <section id="location" className="relative px-6 md:px-12 lg:px-20 py-32 bg-bg overflow-hidden">
      {/* Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none blur-[120px] opacity-[0.06]"
        style={{ background: "radial-gradient(circle, #7CB895, transparent 70%)" }} aria-hidden />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-16">
        <span
          className="block text-[0.65rem] tracking-[0.45em] uppercase mb-4"
          style={{ color: "#7CB895", fontFamily: "var(--font-inter)" }}
        >{t({ fr: "Nous Trouver", en: "Find Us", es: "Encúéntranos", it: "Trovaci" })}</span>
        <h2 className="text-[clamp(3.5rem,10vw,8rem)] uppercase text-fg" style={bebas}>
          {t({ fr: "Notre", en: "Our", es: "Nuestra", it: "Il Nostro" })} <span style={{ color: "#7CB895" }}>{t({ fr: "Adresse", en: "Address", es: "Dirección", it: "Indirizzo" })}</span>
        </h2>
      </motion.div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Map */}
        <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="lg:col-span-3 rounded-2xl overflow-hidden shadow-2xl"
          style={{ border: "1px solid var(--border)" }}>
          <iframe
            src={MAP_EMBED}
            width="100%" height="420"
            style={{ border: 0 }}
            className="map-iframe"
            allowFullScreen loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="L'Échoppe de Paris location"
          />
        </motion.div>

        {/* Info */}
        <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}
          className="lg:col-span-2 space-y-6">

          {/* Address card */}
          <div className="p-6 rounded-2xl" style={card}>
            <span
              className="block text-[0.6rem] tracking-[0.35em] uppercase mb-3"
              style={{ color: "#7CB895", fontFamily: "var(--font-inter)" }}
            >{t({ fr: "Adresse", en: "Address", es: "Dirección", it: "Indirizzo" })}</span>
            <p className="text-base leading-relaxed text-fg" style={{ fontFamily: "var(--font-inter)" }}>
              {content.address.split(',').map((line, i) => <span key={i}>{line.trim()}<br /></span>)}
            </p>
            <a
              href="https://google.com/maps?cid=4710868228502671327&g_mp=CiVnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLkdldFBsYWNlEAIYASAA&hl=fr&gl=FR&source=embed"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-xs tracking-widest uppercase px-4 py-2 rounded-full transition-colors"
              style={{
                color: "#7CB895",
                border: "1px solid rgba(124,184,149,0.35)",
                fontFamily: "var(--font-inter)",
              }}
            >
              {t({ fr: "Itinéraire →", en: "Get Directions →", es: "Cómo Llegar →", it: "Indicazioni →" })}
            </a>
          </div>

          {/* Hours */}
          <div className="p-6 rounded-2xl" style={card}>
            <span
              className="block text-[0.6rem] tracking-[0.35em] uppercase mb-4"
              style={{ color: "var(--accent-text)", fontFamily: "var(--font-inter)" }}
            >{t({ fr: "Horaires", en: "Opening Hours", es: "Horarios", it: "Orari" })}</span>
            <div className="space-y-3">
              {hoursData.map((h: any, i: number) => (
                <div key={i} className="flex justify-between items-center gap-4">
                  <span className="text-sm" style={{ color: "var(--fg-muted)", fontFamily: "var(--font-inter)" }}>
                    {t(h.day, h.day_en)}
                  </span>
                  <span className="text-sm text-right" style={{ color: "var(--fg)", fontFamily: "var(--font-inter)" }}>
                    {h.hours}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Phone */}
          <a
            href={`tel:${content.phone.replace(/\\s/g, '')}`}
            className="flex items-center gap-3 p-5 rounded-2xl transition-all group"
            style={{ ...card }}
          >
            <span className="text-xl">📞</span>
            <div>
              <div
                className="text-[0.6rem] tracking-widest uppercase mb-0.5"
                style={{ color: "var(--fg-subtle)", fontFamily: "var(--font-inter)" }}
              >{t({ fr: "Réservation par téléphone", en: "Phone Reservation", es: "Reserva por Teléfono", it: "Prenotazione Telefonica" })}</div>
              <div
                className="text-sm"
                style={{ color: "#7CB895", fontFamily: "var(--font-inter)" }}
              >{content.phone}</div>
            </div>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
