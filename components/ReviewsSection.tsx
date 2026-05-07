"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/context/LangContext";

/* ─── Static Google review data ─────────────────────────────────────────── */
interface GoogleReview {
  id: number;
  name: string;
  rating: number;
  text: string;
  date: string;
}

const GOOGLE_REVIEWS: GoogleReview[] = [
  {
    id: 1,
    name: "Sahir Kaleem",
    rating: 5,
    text: "Great little place. Some amazing buttery Burgers! Some of the best cheese I have had in a burger. Highly recommended if you are in the area and want a great burger.",
    date: "7 months ago",
  },
  {
    id: 2,
    name: "Teresa Brown",
    rating: 5,
    text: "Amazing food and service. The burgers are incredible and the atmosphere is lovely.",
    date: "1 year ago",
  },
  {
    id: 3,
    name: "Joel Pagett",
    rating: 5,
    text: "The best burgers in Paris, hands down. Great service and atmosphere. Worth every single bite.",
    date: "3 years ago",
  },
  {
    id: 4,
    name: "Amanda K",
    rating: 5,
    text: "Delicious food and friendly staff. Highly recommend the burger with foie gras — absolutely outstanding.",
    date: "1 year ago",
  },
  {
    id: 5,
    name: "Adriana Danila",
    rating: 5,
    text: "Excellent burgers, very friendly staff. A must visit in Paris. We came back twice in one week!",
    date: "7 years ago",
  },
  {
    id: 6,
    name: "Eddy Nemer",
    rating: 5,
    text: "Great place, great food, great people. The burgers are simply amazing — a true Parisian gem.",
    date: "3 years ago",
  },
  {
    id: 7,
    name: "Matt Wald",
    rating: 5,
    text: "Really great burger. Had the Foie. Amazing. And they were happy to make it keto for me (no frites, no bun). Incredibly accommodating.",
    date: "4 years ago",
  },
  {
    id: 8,
    name: "Janez Nučič",
    rating: 5,
    text: "One of the best burgers in Paris. Great service and warm atmosphere. Will definitely be back.",
    date: "1 year ago",
  },
  {
    id: 9,
    name: "John Quinn",
    rating: 5,
    text: "A fabulous spot for a casual meal. The food was delicious and the service was excellent. Highly recommend.",
    date: "a year ago",
  },
  {
    id: 10,
    name: "Naviya Dwivedi",
    rating: 5,
    text: "The burgers were absolutely delicious and the service was top notch. A great find in Paris — hidden gem!",
    date: "2 years ago",
  },
];

const OVERALL_RATING = 4.5;
const TOTAL_REVIEWS  = 1379;

/* ─── Google "G" logo SVG ───────────────────────────────────────────────── */
function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label="Google">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

/* ─── Star rating ───────────────────────────────────────────────────────── */
function Stars({ n, size = 14 }: { n: number; size?: number }) {
  const full  = Math.floor(n);
  const half  = n % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  const GOLD  = "#FBBC05"; // Google gold

  return (
    <div className="flex items-center gap-[2px]" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: full }).map((_, i) => (
        <svg key={`f${i}`} width={size} height={size} viewBox="0 0 16 16" fill={GOLD}>
          <path d="M8 1.2l1.8 3.6 4 .6-2.9 2.8.7 4L8 10.1l-3.6 2.1.7-4L2.2 5.4l4-.6z" />
        </svg>
      ))}
      {half === 1 && (
        <svg key="h" width={size} height={size} viewBox="0 0 16 16">
          <defs>
            <linearGradient id="hg2">
              <stop offset="50%" stopColor={GOLD} />
              <stop offset="50%" stopColor="rgba(255,255,255,0.12)" />
            </linearGradient>
          </defs>
          <path d="M8 1.2l1.8 3.6 4 .6-2.9 2.8.7 4L8 10.1l-3.6 2.1.7-4L2.2 5.4l4-.6z" fill="url(#hg2)" />
        </svg>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <svg key={`e${i}`} width={size} height={size} viewBox="0 0 16 16" fill="rgba(255,255,255,0.12)">
          <path d="M8 1.2l1.8 3.6 4 .6-2.9 2.8.7 4L8 10.1l-3.6 2.1.7-4L2.2 5.4l4-.6z" />
        </svg>
      ))}
    </div>
  );
}

/* ─── Review card ───────────────────────────────────────────────────────── */
function ReviewCard({ review }: { review: GoogleReview }) {
  const initials = review.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article
      className="relative shrink-0 w-[310px] mx-3 p-6 rounded-2xl flex flex-col gap-4 select-none"
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* Google badge top-right */}
      <div className="absolute top-4 right-4 opacity-60">
        <GoogleLogo size={16} />
      </div>

      {/* Stars */}
      <Stars n={review.rating} />

      {/* Body */}
      <p
        className="text-white/90 text-sm leading-relaxed line-clamp-4 flex-1"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        &ldquo;{review.text}&rdquo;
      </p>

      {/* Author row */}
      <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[0.65rem] font-semibold shrink-0"
          style={{
            background: "linear-gradient(135deg, rgba(66,133,244,0.25), rgba(52,168,83,0.15))",
            border: "1px solid rgba(66,133,244,0.3)",
            color: "#4285F4",
            fontFamily: "var(--font-inter)",
          }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white/80 truncate" style={{ fontFamily: "var(--font-inter)" }}>
            {review.name}
          </div>
          <div className="text-[0.6rem] tracking-wider text-white/25" style={{ fontFamily: "var(--font-inter)" }}>
            {review.date}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ─── Marquee strip ─────────────────────────────────────────────────────── */
function MarqueeStrip({
  reviews,
  reverse = false,
}: {
  reviews: GoogleReview[];
  reverse?: boolean;
}) {
  const animStyle: React.CSSProperties = {
    animation: `marquee 55s linear infinite ${reverse ? "reverse" : ""}`,
    willChange: "transform",
  };

  const doubled = [...reviews, ...reviews];

  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className="flex w-max" style={animStyle}>
        {doubled.map((r, i) => (
          <ReviewCard key={`${r.id}-${i}`} review={r} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main section ──────────────────────────────────────────────────────── */
export default function ReviewsSection() {
  const { t } = useLang();
  const bebas: React.CSSProperties = { fontFamily: "var(--font-bebas)", letterSpacing: "0.04em", lineHeight: 0.92 };
  const inter: React.CSSProperties = { fontFamily: "var(--font-inter)" };

  // Split reviews into two rows for dual-direction marquee
  const mid  = Math.ceil(GOOGLE_REVIEWS.length / 2);
  const row1 = GOOGLE_REVIEWS.slice(0, mid);
  const row2 = GOOGLE_REVIEWS.slice(mid);

  // Pad short rows so marquee has enough cards for smooth loop
  const pad = (arr: GoogleReview[]) => (arr.length < 5 ? [...arr, ...arr, ...arr] : arr);

  return (
    <section id="avis" className="relative py-28 overflow-hidden" style={{ background: "#050505" }}>
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(251,188,5,0.04) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
        aria-hidden
      />

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        className="text-center px-6 mb-14"
      >
        {/* Eyebrow */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <div className="h-px w-12 bg-white/10" />
          <span className="text-[0.6rem] tracking-[0.5em] uppercase text-white/40" style={inter}>
            {t({ fr: "Avis Google", en: "Google Reviews", es: "Opiniones de Google", it: "Recensioni Google" })}
          </span>
          <div className="h-px w-12 bg-white/10" />
        </div>

        {/* Headline */}
        <h2 className="text-[clamp(3.5rem,10vw,8rem)] text-white uppercase mb-5" style={bebas}>
          {t({ fr: "Ce Qu'ils", en: "What They", es: "Lo Que", it: "Cosa" })}{" "}
          <span style={{ color: "#FBBC05" }}>{t({ fr: "Disent", en: "Say", es: "Dicen", it: "Dicono" })}</span>
        </h2>

        {/* Google aggregate score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-3 flex-wrap justify-center"
        >
          <GoogleLogo size={22} />
          <Stars n={OVERALL_RATING} size={18} />
          <span className="text-3xl font-light text-white/80 tabular-nums" style={inter}>
            {OVERALL_RATING.toFixed(1)}
          </span>
          <span className="text-white/30 text-sm" style={inter}>/5</span>
          <span className="text-white/20 text-sm" style={inter}>·</span>
          <span className="text-white/50 text-sm" style={inter}>
            {TOTAL_REVIEWS.toLocaleString()} {t({ fr: "avis Google", en: "Google reviews", es: "opiniones de Google", it: "recensioni Google" })}
          </span>
          {/* Verified badge */}
          <span
            className="text-[0.5rem] tracking-[0.25em] uppercase px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(66,133,244,0.12)",
              color: "#4285F4",
              border: "1px solid rgba(66,133,244,0.25)",
              ...inter,
            }}
          >
            ● {t({ fr: "Vérifié Google", en: "Google Verified", es: "Verificado por Google", it: "Verificato Google" })}
          </span>
        </motion.div>
      </motion.div>

      {/* ── Dual marquee rows ── */}
      <div className="space-y-4">
        <MarqueeStrip reviews={pad(row1)} />
        <MarqueeStrip reviews={pad(row2)} reverse />
      </div>

      {/* ── Google attribution footer ── */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
        className="mt-12 flex flex-col items-center gap-3"
      >
        <a
          href="https://www.google.com/maps/place/L'Echoppe+de+Paris"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-white/20 hover:text-white/50 transition-colors duration-300"
          style={inter}
        >
          <GoogleLogo size={14} />
          <span className="text-[0.6rem] tracking-[0.3em] uppercase">
            {t({ fr: "Avis certifiés Google · Voir sur Google Maps", en: "Certified Google Reviews · View on Google Maps", es: "Reseñas certificadas de Google · Ver en Google Maps", it: "Recensioni certificate Google · Vedi su Google Maps" })}
          </span>
        </a>
      </motion.div>

      {/* ── Marquee keyframe ── */}
      <style jsx>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
