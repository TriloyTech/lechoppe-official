"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/postgres/client";
import { STATIC_MENU, MenuItem, fmt } from "@/data/menu";
import { useLang } from "@/context/LangContext";
import { useCategories } from "@/lib/hooks/useCategories";
import { useMobileMotion } from "@/lib/hooks/useMobileMotion";

const PHONE_NUMBER = "+33 1 53 27 95 39";
const PHONE_RAW    = "+33153279539";

/* ── Data hook ───────────────────────────────────────────────────────────── */
function useMenuItems() {
  const [items, setItems]   = useState<MenuItem[]>(STATIC_MENU);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const { data } = await createClient()
          .from("menu_items").select("*").order("category");
        if (data?.length) {
          // Graceful fallback: if takeaway_available col doesn't exist yet,
          // treat non-drink items as takeaway=true by default
          setItems(data.map((row: Record<string, unknown>) => ({
            ...row,
            takeaway_available:
              row.takeaway_available !== undefined
                ? Boolean(row.takeaway_available)
                : row.category !== "drink",
          })) as MenuItem[]);
        }
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);
  return { items, loading };
}

/* ── Supabase storage URL helper ─────────────────────────────────────────── */
function resolveImageUrl(raw?: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("http") || raw.startsWith("/")) return raw;
  return `/uploads/${raw}`;
}

/* ── Framer variants ─────────────────────────────────────────────────────── */
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
  exit:  { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
  exit:   { opacity: 0, y: -16, scale: 0.97, transition: { duration: 0.25 } },
};

/* ── Order Now button with phone tooltip ─────────────────────────────────── */
function OrderNowButton() {
  const { t }               = useLang();
  const [open, setOpen]     = useState(false);
  const [copied, setCopied] = useState(false);
  const ref                 = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(PHONE_NUMBER).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t({ fr: "Commander par téléphone", en: "Order by phone", es: "Pedir por teléfono", it: "Ordinare per telefono" })}
        className="inline-flex items-center gap-1 text-[0.5rem] tracking-widest uppercase px-2 py-0.5 rounded-full transition-all duration-200"
        style={{
          fontFamily: "var(--font-inter)",
          color: "#7CB895",
          border: "1px solid rgba(124,184,149,0.35)",
          background: open ? "rgba(124,184,149,0.14)" : "rgba(124,184,149,0.06)",
        }}
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
        </svg>
        {t({ fr: "Commander", en: "Order", es: "Pedir", it: "Ordinare" })}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute bottom-full mb-2 right-0 z-50 rounded-xl p-3 min-w-[180px]"
            style={{
              background: "rgba(12,12,12,0.96)",
              border: "1px solid rgba(124,184,149,0.28)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.7), 0 0 20px rgba(124,184,149,0.08)",
              backdropFilter: "blur(16px)",
            }}
          >
            {/* Caret */}
            <div
              className="absolute -bottom-[5px] right-4 w-2.5 h-2.5 rotate-45"
              style={{
                background: "rgba(18,18,18,0.97)",
                borderRight: "1px solid rgba(124,184,149,0.28)",
                borderBottom: "1px solid rgba(124,184,149,0.28)",
              }}
            />
            <p className="text-[0.48rem] tracking-[0.3em] uppercase text-white/30 mb-1.5" style={{ fontFamily: "var(--font-inter)" }}>
              {t({ fr: "à emporter · commandez", en: "takeaway · order", es: "para llevar · pedir", it: "da asporto · ordinare" })}
            </p>
            <a
              href={`tel:${PHONE_RAW}`}
              className="block text-[#7CB895] font-semibold text-sm tracking-wide mb-2.5 hover:text-[#F3CDA0] transition-colors"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              {PHONE_NUMBER}
            </a>
            <button
              onClick={handleCopy}
              className="w-full py-1.5 text-[0.48rem] tracking-[0.2em] uppercase rounded-lg transition-all duration-200"
              style={{
                fontFamily: "var(--font-inter)",
                background: copied ? "rgba(124,184,149,0.2)" : "rgba(124,184,149,0.07)",
                border: "1px solid rgba(124,184,149,0.28)",
                color: copied ? "#7CB895" : "rgba(124,184,149,0.55)",
              }}
            >
              {copied ? t({ fr: "✓ Copié", en: "✓ Copied", es: "✓ Copiado", it: "✓ Copiato" }) : t({ fr: "Copier le numéro", en: "Copy Number", es: "Copiar número", it: "Copia numero" })}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Price badge with glow ───────────────────────────────────────────────── */
function PriceBadge({ price }: { price: number }) {
  return (
    <motion.span
      whileHover={{ scale: 1.08 }}
      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold tabular-nums"
      style={{
        fontFamily: "var(--font-inter)",
        background: "linear-gradient(135deg, rgba(243,205,160,0.18), rgba(243,205,160,0.08))",
        border: "1px solid rgba(243,205,160,0.3)",
        color: "#F3CDA0",
        boxShadow: "0 0 16px rgba(243,205,160,0.15)",
      }}
    >
      {fmt(price)}
    </motion.span>
  );
}

/* ── Single menu card ────────────────────────────────────────────────────── */
function MenuCard({ item }: { item: MenuItem }) {
  const { t } = useLang();
  const sold     = !item.available;
  const imageUrl = resolveImageUrl(item.image_url);

  return (
    <motion.article
      variants={cardVariants}
      whileHover={{ scale: 1.03, transition: { duration: 0.22, ease: "easeOut" } }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 cursor-default ${
        sold
          ? "border-white/5  bg-white/[0.02] opacity-55"
          : "border-white/8  bg-white/[0.03] hover:border-[#7CB895]/30 hover:shadow-[0_8px_40px_rgba(124,184,149,0.08)]"
      }`}
    >
      {/* Image area */}
      <div className="relative aspect-video overflow-hidden bg-white/[0.03]">
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={item.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </>
        ) : (
          /* Placeholder when no image */
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl opacity-20">🍽️</span>
          </div>
        )}

        {/* Badges on image */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {item.chef_suggestion && !sold && (
            <span
              className="text-[0.5rem] tracking-[0.25em] uppercase bg-[#F3CDA0]/15 text-[#F3CDA0] border border-[#F3CDA0]/30 px-2.5 py-1 rounded-full backdrop-blur-sm"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              ★ {t({ fr: "Chef", en: "Chef's Pick", es: "Selección Chef", it: "Scelta Chef" })}
            </span>
          )}
          {/* Takeaway badge — driven by takeaway_available field */}
          {(item.takeaway_available ?? item.category !== "drink") && !sold && (
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.25 }}
              className="inline-flex items-center gap-1 text-[0.5rem] tracking-[0.25em] uppercase px-2.5 py-1 rounded-full backdrop-blur-sm"
              style={{
                fontFamily: "var(--font-inter)",
                background: "rgba(124,184,149,0.12)",
                border: "1px solid rgba(124,184,149,0.3)",
                color: "#7CB895",
                boxShadow: "0 0 8px rgba(124,184,149,0.15)",
              }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zm-9-1a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
              </svg>
              {t({ fr: "À Emporter", en: "Takeaway", es: "Para Llevar", it: "Da Asporto" })}
            </motion.span>
          )}
          {sold && (
            <span
              className="text-[0.5rem] tracking-[0.25em] uppercase bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-full backdrop-blur-sm"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              {t({ fr: "Épuisé", en: "Sold Out", es: "Agotado", it: "Esaurito" })}
            </span>
          )}
          {/* Allergen badge */}
          {item.has_allergens && !sold && (
            <span
              title={item.allergens_text || t({ fr: "Contient des allergènes", en: "Contains allergens", es: "Contiene alérgenos", it: "Contiene allergeni" })}
              className="text-[0.5rem] tracking-[0.25em] uppercase px-2.5 py-1 rounded-full backdrop-blur-sm cursor-help"
              style={{
                fontFamily: "var(--font-inter)",
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.35)",
                color: "#F59E0B",
              }}
            >
              ⚠ {t({ fr: "Allergènes", en: "Allergens", es: "Alérgenos", it: "Allergeni" })}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        <div className="flex items-start justify-between gap-3">
          <h3
            className="text-white/90 text-lg leading-snug group-hover:text-[#F3CDA0] transition-colors duration-300"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
          >
            {item.name}
          </h3>
          <PriceBadge price={item.price} />
        </div>

        {item.description && (
          <p
            className="text-white/40 text-xs leading-relaxed line-clamp-2"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {item.description}
          </p>
        )}

        {/* Category tag + order CTA row */}
        <div className="mt-auto flex items-center justify-between gap-2">
          <span
            className="text-[0.55rem] tracking-[0.3em] uppercase text-[#7CB895]/60"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {item.category}
          </span>
          {(item.takeaway_available ?? item.category !== "drink") && item.available && (
            <OrderNowButton />
          )}
        </div>
      </div>
    </motion.article>
  );
}

/* ── Dotted list row (items without images) ──────────────────────────────── */
function MenuRow({ item, index }: { item: MenuItem; index: number }) {
  const sold = !item.available;
  return (
    <motion.div
      variants={cardVariants}
      className={`group flex items-end gap-2 py-3 border-b border-white/[0.04] ${sold ? "opacity-40" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span
            className="text-white/90 text-base group-hover:text-[#F3CDA0] transition-colors duration-300"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
          >
            {item.name}
          </span>
          {sold && (
            <span className="text-[0.5rem] tracking-widest uppercase bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full"
              style={{ fontFamily: "var(--font-inter)" }}>Épuisé</span>
          )}
          {item.chef_suggestion && !sold && (
            <span className="text-[#F3CDA0] text-[0.65rem]" title="Chef's Pick">★</span>
          )}
          {(item.takeaway_available ?? item.category !== "drink") && !sold && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(124,184,149,0.45)" aria-label="À emporter">
              <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zm-9-1a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
            </svg>
          )}
        </div>
        {item.description && (
          <p className="text-white/30 text-xs leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>
            {item.description}
          </p>
        )}
      </div>
      <span className="shrink-0 flex-1 max-w-[80px] mb-1.5 border-b border-dotted border-white/20 group-hover:border-[#F3CDA0]/30 transition-colors" aria-hidden />
      <span className="shrink-0 text-[#F3CDA0] text-sm font-medium tabular-nums" style={{ fontFamily: "var(--font-inter)" }}>
        {fmt(item.price)}
      </span>
    </motion.div>
  );
}

/* ── Category section heading ────────────────────────────────────────────── */
const CATEGORY_EMOJI: Record<string, string> = {
  side: "🥗", burger: "🍔", dessert: "🍮", drink: "🥂",
};

function SectionHeading({ cat, title }: { cat: string; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45 }}
      className="flex items-center gap-3 mt-14 mb-2"
    >
      <span className="text-xl">{CATEGORY_EMOJI[cat] ?? "🍽️"}</span>
      <h3
        className="text-[1.8rem] text-[#7CB895] uppercase tracking-[0.08em]"
        style={{ fontFamily: "var(--font-bebas)" }}
      >
        {title}
      </h3>
      <div className="flex-1 h-px bg-[#7CB895]/15" />
    </motion.div>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/5 overflow-hidden">
          <div className="aspect-video skeleton" />
          <div className="p-5 space-y-3">
            <div className="h-5 rounded skeleton w-2/3" />
            <div className="h-3 rounded skeleton w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function FullMenu() {
  const { items, loading } = useMenuItems();
  const { t }              = useLang();
  const { categories }     = useCategories();
  const { d }              = useMobileMotion();
  const [active, setActive] = useState<string>("tous");

  const bebas: React.CSSProperties = { fontFamily: "var(--font-bebas)", letterSpacing: "0.04em", lineHeight: 0.92 };

  // Build ALL_TABS from live categories ("tous" + each category key)
  const ALL_TABS = [
    { key: "tous", emoji: "🍽️", fr: "Tout", en: "All" },
    ...categories,
  ];

  // Filter: show all categories when "tous", otherwise only the selected one
  const visibleItems = active === "tous"
    ? items
    : items.filter((m) => m.category === active);

  const grouped = visibleItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item); return acc;
  }, {});

  // Sort groups to match category order from live categories
  const catOrder = categories.map((c) => c.key);
  const sortedGroups = catOrder.filter((c) => grouped[c]?.length > 0);
  const unknownGroups = Object.keys(grouped).filter((c) => !catOrder.includes(c) && grouped[c]?.length > 0);
  const allGroups = [...sortedGroups, ...unknownGroups];

  /* Items with images → card grid; items without → dotted list rows */
  function renderGroup(cat: string) {
    const catDef    = categories.find((c) => c.key === cat);
    const catTitle  = t(catDef?.fr || cat, catDef?.en || cat);
    const catEmoji  = catDef?.emoji ?? "🍽️";
    const catItems  = grouped[cat];
    const withImg   = catItems.filter((m) => resolveImageUrl(m.image_url));
    const noImg     = catItems.filter((m) => !resolveImageUrl(m.image_url));
    return (
      <div key={cat}>
        {active === "tous" && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: d(0.45) }}
            className="flex items-center gap-3 mt-14 mb-2"
          >
            <span className="text-xl">{catEmoji}</span>
            <h3
              className="text-[1.8rem] text-[#7CB895] uppercase tracking-[0.08em]"
              style={{ fontFamily: "var(--font-bebas)" }}
            >
              {catTitle}
            </h3>
            <div className="flex-1 h-px bg-[#7CB895]/15" />
          </motion.div>
        )}

        {/* ── Image grid (staggered) ── */}
        {withImg.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4"
          >
            {withImg.map((item) => <MenuCard key={item.id} item={item} />)}
          </motion.div>
        )}

        {/* ── Dotted rows for items without images (staggered) ── */}
        {noImg.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            {noImg.map((item, i) => <MenuRow key={item.id} item={item} index={i} />)}
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <section id="menu" className="relative py-24 bg-[#050505] overflow-hidden">
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")", backgroundSize: "128px 128px" }}
        aria-hidden />

      <div className="max-w-5xl mx-auto px-6 md:px-12">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-12">
          <span className="block text-[#7CB895] text-[0.65rem] tracking-[0.45em] uppercase mb-4"
            style={{ fontFamily: "var(--font-inter)" }}>
            {t({ fr: "Notre Carte", en: "Our Menu", es: "Nuestra Carta", it: "Il Nostro Menù" })}
          </span>
          <h2 className="text-[clamp(3.5rem,10vw,8rem)] text-white/90 uppercase mb-4" style={bebas}>
            {t({ fr: "La", en: "The", es: "La", it: "Il" })}{" "}<span style={{ color: "#7CB895" }}>{t({ fr: "Carte", en: "Menu", es: "Carta", it: "Menù" })}</span>
          </h2>
          <p className="text-white/30 text-xs tracking-widest" style={{ fontFamily: "var(--font-inter)" }}>
            ★ = {t({ fr: "Suggestion du Chef", en: "Chef's Recommendation", es: "Recomendación del Chef", it: "Raccomandazione dello Chef" })}
          </p>
        </motion.div>

        {/* ── Sticky filter bar ── */}
        <div className="sticky top-0 z-30 -mx-6 md:-mx-12 px-6 md:px-12 py-3 mb-2"
          style={{ backgroundColor: "rgba(5,5,5,0.92)", backdropFilter: "blur(12px)" }}>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {ALL_TABS.map((cat) => {
              const isActive = active === cat.key;
              return (
                <button key={cat.key} onClick={() => setActive(cat.key)}
                  className={`shrink-0 px-4 py-2 text-xs tracking-[0.2em] uppercase rounded-full border transition-all duration-200 ${
                    isActive
                      ? "bg-[#7CB895] text-[#050505] border-[#7CB895] font-semibold"
                      : "border-white/10 text-white/40 hover:border-white/25 hover:text-white/70"
                  }`}
                  style={{
                    fontFamily: "var(--font-inter)",
                    ...(isActive ? {} : { backdropFilter: "blur(12px)", background: "rgba(255,255,255,0.04)" })
                  }}>
                  {cat.emoji} {t(cat.fr, cat.en)}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <Skeleton />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={active} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {allGroups.map(renderGroup)}
              {allGroups.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-white/20 text-sm" style={{ fontFamily: "var(--font-inter)" }}>
                    {t({ fr: "Aucun article dans cette catégorie.", en: "No items in this category.", es: "No hay artículos en esta categoría.", it: "Nessun articolo in questa categoria." })}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Bottom note */}
        <p className="mt-16 text-center text-white/15 text-[0.6rem] tracking-widest uppercase"
          style={{ fontFamily: "var(--font-inter)" }}>
          {t({
            fr: "Prix TTC · Service non compris · Allergènes disponibles sur demande",
            en: "Prices incl. VAT · Service not included · Allergen info on request",
            es: "Precios IVA incl. · Servicio no incluido · Info alérgenos bajo petición",
            it: "Prezzi IVA incl. · Servizio non incluso · Info allergeni su richiesta"
          })}
        </p>
      </div>
    </section>
  );
}
