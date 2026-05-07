"use client";

import { motion } from "framer-motion";

import { useLang } from "@/context/LangContext";
import { useSiteContent } from "@/lib/hooks/useSiteContent";
function PillarCard({ number, title, body, index }: { number: string; title: string; body: string; index: number }) {
  const bebas: React.CSSProperties = {
    fontFamily: "var(--font-bebas, 'Bebas Neue')",
    letterSpacing: "0.06em",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="group relative p-8 rounded-2xl transition-all duration-500"
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      {/* Background number */}
      <div
        className="absolute top-4 right-6 text-[7rem] leading-none select-none pointer-events-none"
        style={{ color: "var(--fg)", opacity: 0.03, ...bebas }}
        aria-hidden="true"
      >
        {number}
      </div>

      <span
        className="block text-xs tracking-[0.35em] uppercase mb-4"
        style={{ color: "#7CB895", fontFamily: "var(--font-inter)" }}
      >
        {number}
      </span>

      <h3
        className="text-[clamp(2rem,4vw,3rem)] uppercase mb-4 leading-none"
        style={{ color: "var(--fg)", ...bebas }}
      >
        {title}
      </h3>

      <p
        className="text-sm leading-relaxed max-w-prose"
        style={{ color: "var(--fg-muted)", fontFamily: "var(--font-inter)" }}
      >
        {body}
      </p>

      {/* Hover accent line */}
      <div className="mt-6 w-0 group-hover:w-12 h-px bg-[#7CB895] transition-all duration-500" />
    </motion.div>
  );
}

import React from 'react';

export default function StorySection() {
  const { content } = useSiteContent();
  const { t, lang } = useLang();

  let pillars = [];
  try {
    pillars = JSON.parse(content.story_pillars || "[]");
  } catch (e) {
    pillars = [];
  }

  const bebas: React.CSSProperties = {
    fontFamily: "var(--font-bebas, 'Bebas Neue')",
    letterSpacing: "0.04em",
    lineHeight: 0.92,
  };

  return (
    <section
      id="histoire"
      className="relative px-6 md:px-12 lg:px-20 py-32 bg-bg overflow-hidden"
    >
      {/* Decorative glow */}
      <div
        className="absolute top-1/4 left-0 w-[500px] h-[500px] rounded-full pointer-events-none blur-[120px] opacity-10"
        style={{ background: "radial-gradient(circle, #7CB895, transparent 70%)" }}
        aria-hidden="true"
      />

      {/* Eyebrow + headline */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="mb-20 max-w-3xl"
      >
        <span
          className="block text-[0.65rem] tracking-[0.45em] uppercase mb-5"
          style={{ color: "var(--accent-text)", fontFamily: "var(--font-inter)" }}
        >
          {t({ fr: "Notre Histoire", en: "Our Story", es: "Nuestra Historia", it: "La Nostra Storia" })}
        </span>
        <h2
          className="text-[clamp(3.5rem,10vw,8.5rem)] uppercase text-fg whitespace-pre-line"
          style={bebas}
        >
          {t(content.story_headline_fr, content.story_headline_en)}
        </h2>
        <p
          className="mt-8 max-w-xl text-base leading-relaxed whitespace-pre-line"
          style={{ color: "var(--fg-muted)", fontFamily: "var(--font-inter)" }}
        >
          {t(content.story_text_fr, content.story_text_en)}
        </p>
      </motion.div>

      {/* Three pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pillars.map((p: any, i: number) => (
          <PillarCard 
            key={p.number} 
            number={p.number} 
            title={p[`title_${lang}`] || p.title_en || p.title_fr} 
            body={p[`body_${lang}`] || p.body_en || p.body_fr} 
            index={i} 
          />
        ))}
      </div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 pt-12"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {[
          { value: "2014", fr: "Fondé à Paris", en: "Founded in Paris", es: "Fundado en París", it: "Fondato a Parigi" },
          { value: "121",  fr: "Recettes testées", en: "Recipes Tested", es: "Recetas Probadas", it: "Ricette Testate" },
          { value: "28J",  fr: "Maturation Wagyu", en: "Wagyu Aging", es: "Maduración Wagyu", it: "Stagionatura Wagyu" },
          { value: "5H",   fr: "Ouverture cuisine", en: "Kitchen Opening", es: "Apertura Cocina", it: "Apertura Cucina" },
        ].map((stat) => (
          <div key={stat.fr} className="text-center">
            <div
              className="text-[clamp(2.5rem,6vw,5rem)]"
              style={{ color: "#7CB895", ...bebas }}
            >
              {stat.value}
            </div>
            <div
              className="text-xs tracking-[0.25em] uppercase mt-1"
              style={{ color: "var(--fg-subtle)", fontFamily: "var(--font-inter)" }}
            >
              {t({ fr: stat.fr, en: stat.en, es: stat.es, it: stat.it })}
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
