"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { STATIC_MENU, MenuItem, fmt } from "@/data/menu";
import { useLang } from "@/context/LangContext";

/* Derive suggestions — prefer Supabase data, fall back to static */
function useChefItems(): MenuItem[] {
  const [items, setItems] = useState<MenuItem[]>(
    STATIC_MENU.filter((m) => m.chef_suggestion)
  );

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("menu_items")
      .select("*")
      .eq("chef_suggestion", true)
      .eq("available", true)
      .then(({ data }) => {
        if (data && data.length > 0) setItems(data as MenuItem[]);
      });
  }, []);

  return items.filter((m) => m.available);
}

function SuggestionCard({ item, index }: { item: MenuItem; index: number }) {
  const hasImage = Boolean(item.image_url);

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="shrink-0 w-[280px] sm:w-[320px] snap-start group"
    >
      <div
        className="relative rounded-2xl overflow-hidden h-full flex flex-col transition-all duration-300 group-hover:shadow-xl"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        {/* Image / placeholder */}
        <div
          className="relative h-44 overflow-hidden"
          style={{ background: "var(--img-bg)" }}
        >
          {hasImage ? (
            <Image
              src={item.image_url!}
              alt={item.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl opacity-20">🍽️</span>
            </div>
          )}
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to top, var(--surface) 0%, transparent 60%)",
            }}
          />
          {/* Chef badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 backdrop-blur-sm rounded-full px-2.5 py-1"
            style={{ background: "var(--price-bg)", border: "1px solid var(--border)" }}>
            <span className="text-[0.55rem]">👨‍🍳</span>
            <span
              className="text-[0.55rem] tracking-[0.25em] uppercase"
              style={{ color: "var(--price-text)", fontFamily: "var(--font-inter)" }}
            >Suggestion</span>
          </div>
          {/* Price pill */}
          <div
            className="absolute bottom-3 right-3 backdrop-blur-sm rounded-full px-3 py-1"
            style={{ background: "var(--price-bg)", border: "1px solid var(--border)" }}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--price-text)", fontFamily: "var(--font-inter)" }}
            >
              {fmt(item.price)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          {/* Category chip */}
          <span
            className="inline-block text-[0.55rem] tracking-[0.3em] uppercase mb-2"
            style={{ color: "#7CB895", fontFamily: "var(--font-inter)" }}
          >
            {item.category}
          </span>
          {/* Name */}
          <h3
            className="text-xl mb-2 transition-colors duration-300"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              letterSpacing: "0.01em",
              color: "var(--fg)",
            }}
          >
            {item.name}
          </h3>
          {/* Description */}
          <p
            className="text-xs leading-relaxed line-clamp-3 flex-1"
            style={{ color: "var(--fg-muted)", fontFamily: "var(--font-inter)" }}
          >
            {item.description}
          </p>
          {/* CTA */}
          <a
            href="#reservation"
            className="mt-4 inline-flex items-center gap-1.5 text-[0.6rem] tracking-widest uppercase transition-colors"
            style={{ color: "#7CB895", fontFamily: "var(--font-inter)" }}
          >
            Réserver →
          </a>
        </div>
      </div>
    </motion.article>
  );
}

export default function ChefSuggestions() {
  const items = useChefItems();
  const { t } = useLang();
  const bebas: React.CSSProperties = { fontFamily: "var(--font-bebas)", letterSpacing: "0.04em", lineHeight: 0.92 };

  return (
    <section id="suggestions" className="relative py-24 bg-bg overflow-hidden">
      {/* Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[400px] pointer-events-none blur-[120px] opacity-[0.05]"
        style={{ background: "radial-gradient(circle, #F3CDA0, transparent 70%)" }} aria-hidden />

      <div className="px-6 md:px-12 lg:px-20 mb-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <span
            className="block text-[0.65rem] tracking-[0.45em] uppercase mb-3"
            style={{ color: "var(--accent-text)", fontFamily: "var(--font-inter)" }}
          >
            {t({ fr: "Notre Sélection", en: "Our Selection", es: "Nuestra Selección", it: "La Nostra Selezione" })}
          </span>
          <h2 className="text-[clamp(3rem,9vw,7rem)] text-fg uppercase" style={bebas}>
            {t({ fr: "Suggestions", en: "Chef's", es: "Sugerencias", it: "Suggerimenti" })}{" "}
            <span style={{ color: "var(--accent-text)" }}>
              {t({ fr: "du Chef", en: "Picks", es: "del Chef", it: "dello Chef" })}
            </span>
          </h2>
        </motion.div>
      </div>

      {/* Horizontal scroll */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-24 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right, var(--bg), transparent)" }} />
        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-24 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left, var(--bg), transparent)" }} />

        <div
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 px-6 md:px-12 lg:px-20"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((item, i) => (
            <SuggestionCard key={item.id} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
