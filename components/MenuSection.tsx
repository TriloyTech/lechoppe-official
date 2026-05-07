"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { MenuItem } from "@/lib/supabase/types";
import { useLang } from "@/context/LangContext";

// ── Category display config ────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { label: string; labelEn: string; labelEs: string; labelIt: string; emoji: string }> = {
  "burger":  { label: "Burgers & Plats",    labelEn: "Burgers & Mains", labelEs: "Hamburguesas & Platos", labelIt: "Burger & Piatti", emoji: "🍔" },
  "side":    { label: "Entrees & Salades",  labelEn: "Starters & Sides", labelEs: "Entrantes & Ensaladas", labelIt: "Antipasti & Contorni", emoji: "🥗" },
  "dessert": { label: "Desserts",           labelEn: "Desserts",        labelEs: "Postres",             labelIt: "Dolci",           emoji: "🍮" },
  "drink":   { label: "Boissons",           labelEn: "Drinks",          labelEs: "Bebidas",             labelIt: "Bevande",         emoji: "🥂" },
};
function getCategoryDisplay(cat: string, lang: string): { label: string; emoji: string } {
  const cfg = CATEGORY_CONFIG[cat.toLowerCase()];
  if (cfg) {
    const labels: Record<string, string> = { fr: cfg.label, en: cfg.labelEn, es: cfg.labelEs, it: cfg.labelIt };
    return { label: labels[lang] || cfg.labelEn, emoji: cfg.emoji };
  }
  // Unknown / custom category — capitalise it
  return {
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
    emoji: "✦",
  };
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="aspect-[4/3]" style={{ background: "var(--img-bg)" }} />
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 rounded" style={{ background: "var(--img-bg)" }} />
        <div className="h-3 w-full rounded" style={{ background: "var(--img-bg)" }} />
        <div className="h-3 w-4/5 rounded" style={{ background: "var(--img-bg)" }} />
      </div>
    </div>
  );
}

// ── Individual card ───────────────────────────────────────────────────────────
function MenuCard({ item, index }: { item: MenuItem; index: number }) {
  const bebas: React.CSSProperties = {
    fontFamily: "var(--font-bebas, 'Bebas Neue')",
    letterSpacing: "0.06em",
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 32, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.97 }}
      transition={{
        duration: 0.45,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`group relative rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${
        item.available ? "" : "opacity-45"
      }`}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: "var(--img-bg)" }}>
        {item.image_url ? (
          <>
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-106"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-15">
            {getCategoryDisplay(item.category, "fr").emoji}
          </div>
        )}

        {/* Chef Pick badge */}
        {item.chef_suggestion && (
          <div className="absolute top-3 left-3 flex items-center gap-1 backdrop-blur-md px-2.5 py-1 rounded-full"
            style={{ background: "rgba(243,205,160,0.18)", border: "1px solid rgba(243,205,160,0.35)" }}>
            <span className="text-[0.5rem]">👨‍🍳</span>
            <span className="text-[0.5rem] tracking-[0.3em] uppercase font-semibold"
              style={{ color: "#F3CDA0", fontFamily: "var(--font-inter)" }}>
              Chef&apos;s Pick
            </span>
          </div>
        )}

        {/* Price badge */}
        <div
          className="absolute top-3 right-3 backdrop-blur-md px-3 py-1 rounded-full"
          style={{ background: "var(--price-bg)", border: "1px solid var(--border)" }}
        >
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--price-text)", fontFamily: "var(--font-inter)" }}
          >
            €{item.price.toFixed(2)}
          </span>
        </div>

        {/* Unavailable overlay */}
        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
            <span
              className="text-white/60 text-xs tracking-widest uppercase border border-white/20 px-3 py-1 rounded-full"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Épuisé
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3
            className="text-[clamp(1.1rem,2.5vw,1.4rem)] uppercase leading-tight"
            style={{ color: "var(--fg)", ...bebas }}
          >
            {item.name}
          </h3>
        </div>
        {item.description && (
          <p
            className="text-sm leading-relaxed flex-1"
            style={{ color: "var(--fg-muted)", fontFamily: "var(--font-inter)" }}
          >
            {item.description}
          </p>
        )}
        {/* Reservation CTA */}
        <a
          href="#reservation"
          className="mt-4 inline-flex items-center gap-1.5 text-[0.6rem] tracking-widest uppercase transition-colors duration-200 hover:opacity-80"
          style={{ color: "#7CB895", fontFamily: "var(--font-inter)" }}
        >
          Réserver →
        </a>
      </div>
    </motion.article>
  );
}

// ── Category section header ───────────────────────────────────────────────────
function CategoryHeader({ category, count, lang }: { category: string; count: number; lang: string }) {
  const { label, emoji } = getCategoryDisplay(category, lang);
  const bebas: React.CSSProperties = { fontFamily: "var(--font-bebas, 'Bebas Neue')", letterSpacing: "0.05em" };

  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-4 mb-7 mt-2"
    >
      <span className="text-2xl">{emoji}</span>
      <h3
        className="text-[clamp(1.8rem,5vw,3.2rem)] uppercase"
        style={{ color: "#7CB895", ...bebas }}
      >
        {label}
      </h3>
      <span
        className="text-[0.55rem] tracking-[0.3em] uppercase border px-2.5 py-1 rounded-full self-end mb-1.5"
        style={{ color: "var(--fg-muted)", borderColor: "var(--border)", fontFamily: "var(--font-inter)" }}
      >
        {count} {count === 1 ? "plat" : "plats"}
      </span>
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </motion.div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────
export default function MenuSection() {
  const supabase = createClient();
  const { t, lang } = useLang();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const bebas: React.CSSProperties = {
    fontFamily: "var(--font-bebas, 'Bebas Neue')",
    letterSpacing: "0.04em",
    lineHeight: 0.92,
  };

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .order("category")
      .order("name");
    setItems(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  // Derive unique ordered categories from DB data
  const categories = useMemo(() => {
    const ORDER = ["side", "burger", "dessert", "drink"];
    const seen = new Set<string>();
    items.forEach(i => seen.add(i.category));
    // Sort: known order first, then alphabetical
    return Array.from(seen).sort((a, b) => {
      const ai = ORDER.indexOf(a);
      const bi = ORDER.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [items]);

  // Filtered items (only available items for public display)
  const visibleItems = items.filter(i => i.available);

  // Group by category (only available)
  const grouped = useMemo(() => {
    const map: Record<string, MenuItem[]> = {};
    visibleItems.forEach(item => {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    });
    return map;
  }, [visibleItems]);

  // What categories to show (depends on active filter)
  const displayCategories = useMemo(() => {
    if (activeFilter === "all") return categories.filter(c => grouped[c]?.length > 0);
    return categories.filter(c => c === activeFilter && grouped[c]?.length > 0);
  }, [activeFilter, categories, grouped]);

  return (
    <section id="menu" className="relative px-6 md:px-12 lg:px-20 py-32 bg-bg">
      {/* Top fade */}
      <div
        className="absolute top-0 inset-x-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, var(--bg), transparent)" }}
      />

      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-16"
      >
        <span
          className="block text-[0.65rem] tracking-[0.45em] uppercase mb-4"
          style={{ color: "#7CB895", fontFamily: "var(--font-inter)" }}
        >
          {t({ fr: "Notre Cuisine", en: "Our Kitchen", es: "Nuestra Cocina", it: "La Nostra Cucina" })}
        </span>
        <h2
          className="text-[clamp(4rem,12vw,10rem)] uppercase text-fg"
          style={bebas}
        >
          {t({ fr: "Le", en: "Our", es: "El", it: "Il" })}{" "}
          <span style={{ color: "#7CB895" }}>{t({ fr: "Menu", en: "Menu", es: "Menú", it: "Menù" })}</span>
        </h2>
        <div className="w-16 h-px mx-auto mt-6" style={{ background: "rgba(124,184,149,0.4)" }} />
      </motion.div>

      {/* Category filter tabs — dynamically generated from DB */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-wrap justify-center gap-2 mb-16"
      >
        {/* ALL button */}
        <button
          onClick={() => setActiveFilter("all")}
          className="px-5 py-2 text-xs tracking-[0.2em] uppercase transition-all duration-300 rounded-full border"
          style={
            activeFilter === "all"
              ? { background: "#7CB895", color: "#0A0A0A", borderColor: "#7CB895", fontWeight: 600, fontFamily: "var(--font-inter)" }
              : { background: "transparent", color: "var(--fg-muted)", borderColor: "var(--border)", fontFamily: "var(--font-inter)" }
          }
        >
          ✦ {t({ fr: "Tout", en: "All", es: "Todo", it: "Tutto" })}
        </button>

        {/* Per-category buttons */}
        {categories.map((cat) => {
          const { label, emoji } = getCategoryDisplay(cat, lang);
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className="px-5 py-2 text-xs tracking-[0.2em] uppercase transition-all duration-300 rounded-full border"
              style={
                activeFilter === cat
                  ? { background: "#7CB895", color: "#0A0A0A", borderColor: "#7CB895", fontWeight: 600, fontFamily: "var(--font-inter)" }
                  : { background: "transparent", color: "var(--fg-muted)", borderColor: "var(--border)", fontFamily: "var(--font-inter)" }
              }
            >
              {emoji} {label}
            </button>
          );
        })}
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : visibleItems.length === 0 ? (
        <div
          className="text-center py-24 text-sm tracking-widest uppercase"
          style={{ color: "var(--fg-subtle)", fontFamily: "var(--font-inter)" }}
        >
          {t({ fr: "Aucun article disponible", en: "No items available", es: "No hay artículos disponibles", it: "Nessun articolo disponibile" })}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-20"
          >
            {displayCategories.map((cat) => {
              const catItems = grouped[cat] ?? [];
              return (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <CategoryHeader category={cat} count={catItems.length} lang={lang} />
                  <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                  >
                    <AnimatePresence mode="popLayout">
                      {catItems.map((item, idx) => (
                        <MenuCard key={item.id} item={item} index={idx} />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              );
            })}

            {displayCategories.length === 0 && (
              <div
                className="text-center py-24 text-sm tracking-widest uppercase"
                style={{ color: "var(--fg-subtle)", fontFamily: "var(--font-inter)" }}
              >
                {t({ fr: "Aucun article dans cette catégorie", en: "No items in this category", es: "No hay artículos en esta categoría", it: "Nessun articolo in questa categoria" })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </section>
  );
}
