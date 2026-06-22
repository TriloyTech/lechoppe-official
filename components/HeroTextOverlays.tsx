"use client";

import { MotionValue, motion, useTransform } from "framer-motion";
import { useSiteContent } from "@/lib/hooks/useSiteContent";
import { useLang } from "@/context/LangContext";

interface Props {
  scrollYProgress: MotionValue<number>;
  onBookClick?: () => void;
}

export default function HeroTextOverlays({ scrollYProgress, onBookClick }: Props) {
  const { content } = useSiteContent();
  const { t } = useLang();

  // ── Slide 1 · 0-10%: "L'ÉCHOPPE DE PARIS" — centred ─────────────────────
  const op1 = useTransform(scrollYProgress, [0, 0.02, 0.08, 0.13], [0, 1, 1, 0]);
  const y1  = useTransform(scrollYProgress, [0, 0.13], [20, -30]);

  // ── Slide 2 · 30-40%: Philosophy — left ──────────────────────────────────
  const op2 = useTransform(scrollYProgress, [0.28, 0.33, 0.38, 0.44], [0, 1, 1, 0]);
  const x2  = useTransform(scrollYProgress, [0.28, 0.35], [-50, 0]);

  // ── Slide 3 · 60-70%: Product — right ────────────────────────────────────
  const op3 = useTransform(scrollYProgress, [0.58, 0.63, 0.68, 0.74], [0, 1, 1, 0]);
  const x3  = useTransform(scrollYProgress, [0.58, 0.65], [50, 0]);

  // ── Slide 4 · 90-100%: CTA — centred ─────────────────────────────────────
  const op4    = useTransform(scrollYProgress, [0.88, 0.93, 0.98, 1.0], [0, 1, 1, 1]);
  const scale4 = useTransform(scrollYProgress, [0.88, 0.95], [0.92, 1]);

  // ── Shared typography styles ──────────────────────────────────────────────
  const bebas: React.CSSProperties = {
    fontFamily: "var(--font-bebas, 'Bebas Neue')",
    lineHeight: 0.9,
    letterSpacing: "0.04em",
  };
  const inter: React.CSSProperties = {
    fontFamily: "var(--font-inter, 'Inter')",
  };

  const headingShadow =
    "drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]";

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10">

      {/* ── Slide 1: Opening title ── */}
      <motion.div
        style={{ opacity: op1, y: y1 }}
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-8"
      >
        <span
          className="block text-[#7CB895] text-[0.6rem] md:text-xs tracking-[0.45em] uppercase mb-4 md:mb-5 drop-shadow-md"
          style={inter}
        >
          {content.hero_eyebrow || "Restaurant Bistronomy · Paris"}
        </span>

        <h1
          className={`text-5xl sm:text-7xl md:text-9xl text-[#F5F5F5] uppercase ${headingShadow}`}
          style={bebas}
        >
          {content.hero_title_line1 || "L'ÉCHOPPE"}
          <br />
          <span style={{ color: "#7CB895" }}>
            {t(
              content.hero_title_line2_fr || "DE PARIS",
              content.hero_title_line2_en || "DE PARIS"
            )}
          </span>
        </h1>

        <span
          className="mt-6 md:mt-8 text-[#F5F5F5]/50 text-[0.6rem] tracking-[0.35em] uppercase animate-bounce drop-shadow-md"
          style={inter}
        >
          ↓ {t(
            content.hero_scroll_hint_fr || "Défiler pour découvrir",
            content.hero_scroll_hint_en || "Scroll to discover"
          )}
        </span>
      </motion.div>

      {/* ── Slide 2: Left-aligned · Philosophy ── */}
      <motion.div
        style={{ opacity: op2, x: x2 }}
        className="absolute left-8 md:left-16 lg:left-24 top-1/2 -translate-y-1/2 max-w-[calc(100%-4rem)] md:max-w-none"
      >
        <div className="w-10 md:w-12 h-[2px] mb-4 md:mb-5" style={{ backgroundColor: "#7CB895" }} />

        <p
          className="text-[#7CB895] text-[0.6rem] tracking-[0.4em] uppercase mb-2 md:mb-3 drop-shadow-md"
          style={inter}
        >
          {t(
            content.hero_s2_label_fr || "Notre Philosophie",
            content.hero_s2_label_en || "Our Philosophy"
          )}
        </p>

        <h2
          className={`text-5xl sm:text-7xl md:text-9xl text-[#F5F5F5] uppercase ${headingShadow}`}
          style={bebas}
        >
          {t(content.hero_s2_title_fr || "Gastronomie", content.hero_s2_title_en || "Precision")}
          <br />
          <span style={{ color: "#F3CDA0" }}>
            {t(content.hero_s2_accent_fr || "Précise", content.hero_s2_accent_en || "Gastronomy")}
          </span>
        </h2>

        <p
          className="mt-3 md:mt-4 max-w-[20ch] text-[#F5F5F5]/60 text-xs md:text-sm leading-relaxed drop-shadow-md"
          style={inter}
        >
          {t(content.tagline_fr, content.tagline_en)}
        </p>
      </motion.div>

      {/* ── Slide 3: Right-aligned · Product ── */}
      <motion.div
        style={{ opacity: op3, x: x3 }}
        className="absolute right-8 md:right-16 lg:right-24 top-1/2 -translate-y-1/2 text-right max-w-[calc(100%-4rem)] md:max-w-none"
      >
        <h2
          className={`text-5xl sm:text-7xl md:text-9xl text-[#F5F5F5] uppercase ${headingShadow}`}
          style={bebas}
        >
          {t(content.hero_s3_title_fr || "Wagyu", content.hero_s3_title_en || "Wagyu")}
          <br />
          <span style={{ color: "#7CB895" }}>
            {t(content.hero_s3_accent_fr || "Perfection", content.hero_s3_accent_en || "Perfection")}
          </span>
        </h2>

        <p
          className="mt-3 md:mt-4 max-w-[20ch] ml-auto text-[#F5F5F5]/60 text-xs md:text-sm leading-relaxed drop-shadow-md"
          style={inter}
        >
          {t(
            content.hero_s3_body_fr || "Bœuf Wagyu français 100%, maturé 28 jours.",
            content.hero_s3_body_en || "100% French Wagyu beef, dry-aged 28 days."
          )}
        </p>

        <div
          className="w-10 md:w-12 h-[2px] mt-4 md:mt-5 ml-auto"
          style={{ backgroundColor: "#F3CDA0" }}
        />
      </motion.div>

      {/* ── Slide 4: Centred CTA ── */}
      <motion.div
        style={{ opacity: op4, scale: scale4 }}
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 pointer-events-auto"
      >
        <p
          className="text-[#F3CDA0] text-[0.6rem] tracking-[0.5em] uppercase mb-4 md:mb-6 drop-shadow-md"
          style={inter}
        >
          {t(
            content.hero_s4_label_fr || "L'Expérience Ultime",
            content.hero_s4_label_en || "The Final Experience"
          )}
        </p>

        <h2
          className={`text-5xl sm:text-7xl md:text-9xl text-[#F5F5F5] uppercase ${headingShadow} mb-6 md:mb-8`}
          style={bebas}
        >
          {t(content.hero_s4_title_fr || "Goûtez la", content.hero_s4_title_en || "Taste the")}
          <br />
          <span style={{ color: "#F3CDA0" }}>
            {t(content.hero_s4_accent_fr || "Légende", content.hero_s4_accent_en || "Legend")}
          </span>
        </h2>

        {/* Book Now CTA */}
        <button
          onClick={(e) => {
            e.preventDefault();
            if (onBookClick) onBookClick();
          }}
          className="group relative inline-flex items-center gap-2 md:gap-3 px-7 md:px-9 py-3.5 md:py-4 bg-[#F5F5F5] text-[#0A0A0A] text-xs md:text-sm font-semibold tracking-[0.18em] uppercase overflow-hidden transition-all duration-300 hover:bg-[#7CB895] hover:text-[#F5F5F5]"
          style={{ ...inter, clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 100%, 10px 100%)" }}
        >
          <span className="relative z-10">
            {t(content.hero_s4_cta_fr || "Réserver", content.hero_s4_cta_en || "Book Now")}
          </span>
          <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-1">→</span>
        </button>

        <p
          className="mt-4 md:mt-6 text-[#F5F5F5]/40 text-[0.6rem] md:text-xs tracking-widest drop-shadow-md"
          style={inter}
        >
          {t(
            content.hero_s4_note_fr || "Réservation en ligne · Ouvert 7j/7",
            content.hero_s4_note_en || "Online reservations · Open 7 days"
          )}
        </p>
      </motion.div>

    </div>
  );
}
