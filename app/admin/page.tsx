
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/postgres/client";
import type { MenuItem, Reservation } from "@/lib/postgres/types";
import { useLang, LANG_LABELS, LANG_FLAGS, Lang } from "@/context/LangContext";
import { useCategories, Category, DEFAULT_CATEGORIES } from "@/lib/hooks/useCategories";
import { useSiteContent, DEFAULT_CONTENT, SiteContent } from "@/lib/hooks/useSiteContent";

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
    <div ref={ref} className="relative w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-white/40 hover:bg-white/5 hover:text-white transition-colors text-sm border border-transparent"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">🌍</span>
          <span className="tracking-wide">{LANG_LABELS[lang]}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#7CB895] uppercase">{lang}</span>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" className={`transition-transform duration-200 text-white/40 ${open ? 'rotate-180' : ''}`}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 bottom-full mb-2 z-[999] w-full rounded-xl overflow-hidden"
            style={{ background: "rgba(20,20,20,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}
          >
            {langs.map((l) => (
              <button
                key={l}
                onClick={() => { setLang(l); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${l === lang ? "text-[#7CB895] bg-[#7CB895]/10" : "text-white/60 hover:text-white hover:bg-white/5"}`}
                style={{ fontFamily: "var(--font-inter)" }}
              >
                <span className="text-base">{LANG_FLAGS[l]}</span>
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

/* ── Admin Menu Sort Dropdown Component ── */
interface AdminSortDropdownProps {
  sortBy: string;
  onChange: (val: string) => void;
  t: (frOrObj: any, en?: string) => string;
}

function AdminSortDropdown({ sortBy, onChange, t }: AdminSortDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const options = [
    { key: "created_at", fr: "Nouveautés", en: "Newest", es: "Novedades", it: "Novità" },
    { key: "updated_at", fr: "Mis à jour", en: "Recently Updated", es: "Modificado", it: "Aggiornato" },
    { key: "name", fr: "Nom", en: "Name", es: "Nombre", it: "Nome" },
  ];

  const currentOption = options.find((o) => o.key === sortBy) || options[0];

  return (
    <div ref={ref} className="relative z-30">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-4 py-3 text-xs tracking-wider uppercase bg-[#111] hover:bg-white/5 text-white/70 hover:text-white border border-white/10 rounded-lg flex items-center gap-2 transition-all duration-200"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        <span className="opacity-60">{t({ fr: "Trier par :", en: "Sort by :", es: "Ordenar por :", it: "Ordina per :" })}</span>
        <span className="text-[#7CB895] font-semibold">{t(currentOption)}</span>
        <svg
          width="8"
          height="8"
          viewBox="0 0 12 12"
          fill="currentColor"
          className={`transition-transform duration-200 text-white/40 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+8px)] z-[100] min-w-[180px] rounded-xl overflow-hidden border border-white/10 shadow-2xl"
            style={{
              background: "#161616",
              boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
              fontFamily: "var(--font-inter)",
            }}
          >
            <div className="py-1">
              {options.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    onChange(opt.key);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs transition-colors text-left ${
                    opt.key === sortBy
                      ? "bg-[#7CB895]/10 text-[#7CB895] font-semibold"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{t(opt)}</span>
                  {opt.key === sortBy && (
                    <span className="text-[#7CB895] text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type Tab = "dashboard" | "reservations" | "menu" | "categories" | "content" | "offers" | "appearance" | "settings";

const TIME_SLOTS = [
  "12:00","12:30","13:00","13:30",
  "19:00","19:30","20:00","20:30","21:00","21:30",
];

type ResDraft = {
  name: string; email: string; phone: string;
  party_size: string; date: string; time: string;
  notes: string; status: Reservation["status"];
};
const EMPTY_RES: ResDraft = {
  name:"", email:"", phone:"", party_size:"2",
  date:"", time:"19:30", notes:"", status:"confirmed",
};

type MenuDraft = {
  name: string;
  description: string;
  price: string;
  category: string;
  available: boolean;
  chef_suggestion: boolean;
  takeaway_available: boolean;
  image_url: string;
  has_allergens: boolean;
  allergens_text: string;
};

const NAMED_CATEGORIES = [
  { dbValue: "burger",  label: "🍔 Burger / Plats Principaux",  emoji: "🍔" },
  { dbValue: "side",    label: "🥗 Entree / Starters & Sides",  emoji: "🥗" },
  { dbValue: "dessert", label: "🍮 Dessert / Desserts",         emoji: "🍮" },
  { dbValue: "drink",   label: "🥂 Boisson / Drinks",           emoji: "🥂" },
];

function getCategoryLabel(dbVal: string): string {
  return NAMED_CATEGORIES.find(c => c.dbValue === dbVal)?.label ?? dbVal;
}

const EMPTY_DRAFT: MenuDraft = {
  name: "", description: "", price: "", category: "burger",
  available: true, chef_suggestion: false, takeaway_available: true, image_url: "",
  has_allergens: false, allergens_text: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const bebas: React.CSSProperties = {
  fontFamily: "var(--font-bebas, 'Bebas Neue')",
  letterSpacing: "0.08em",
};
const inter: React.CSSProperties = { fontFamily: "var(--font-inter, 'Inter')" };

const inputCls =
  "w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2.5 text-[#F5F5F5] text-sm " +
  "placeholder:text-white/20 focus:outline-none focus:border-[#7CB895]/60 transition-all duration-300";

const statusColors: Record<Reservation["status"], string> = {
  pending:   "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  confirmed: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  cancelled: "bg-red-500/20 text-red-400 border border-red-500/30",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Modals / Panels
// ─────────────────────────────────────────────────────────────────────────────

function MenuItemModal({
  item,
  onClose,
  onSave,
}: {
  item: MenuItem | null;
  onClose: () => void;
  onSave: (draft: Partial<MenuItem>) => Promise<void>;
}) {
  const { t } = useLang();
  const { categories: liveCategories } = useCategories();
  const [draft, setDraft] = useState<MenuDraft>(
    item
      ? {
          name: item.name,
          description: item.description ?? "",
          price: item.price.toString(),
          category: item.category,
          available: item.available ?? true,
          chef_suggestion: item.chef_suggestion ?? false,
          takeaway_available: item.takeaway_available ?? true,
          image_url: item.image_url ?? "",
          has_allergens: item.has_allergens ?? false,
          allergens_text: item.allergens_text ?? "",
        }
      : EMPTY_DRAFT
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    (window as any).lenis?.stop();
    return () => {
      document.body.style.overflow = "unset";
      (window as any).lenis?.start();
    };
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setUploadingImage(true);
      setErr("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/images", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setDraft({ ...draft, image_url: data.url });
    } catch (error: any) {
      setErr(error.message || t({ fr: "Erreur lors du téléchargement de l'image", en: "Error uploading image", es: "Error al subir la imagen", it: "Errore durante il caricamento dell'immagine" }));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    setErr("");
    const p = parseFloat(draft.price);
    if (!draft.name.trim() || isNaN(p) || p < 0) {
      setErr(t({ fr: "Veuillez remplir correctement les champs obligatoires (Nom, Prix).", en: "Please fill required fields properly (Name, Price).", es: "Complete correctamente los campos obligatorios (Nombre, Precio).", it: "Compilare correttamente i campi obbligatori (Nome, Prezzo)." }));
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name:             draft.name.trim(),
        description:      draft.description.trim() || null,
        price:            p,
        category:         draft.category,
        available:        draft.available,
        chef_suggestion:  draft.chef_suggestion,
        takeaway_available: draft.takeaway_available,
        image_url:        draft.image_url.trim() || null,
        has_allergens:    draft.has_allergens,
        allergens_text:   draft.allergens_text.trim() || null,
      });
      onClose();
    } catch (error: any) {
      setErr(error.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        data-lenis-prevent="true"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
      >
        <div className="px-6 pt-6 pb-2 shrink-0">
          <h3 className="text-xl text-[#7CB895]" style={bebas}>
            {item ? t({ fr: "Modifier un Plat", en: "Edit Dish", es: "Editar Plato", it: "Modifica Piatto" }) : t("Nouveau Plat", "New Dish")}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin">
          <div>
            <label className="block text-[0.6rem] tracking-widest uppercase text-white/40 mb-1.5">{t({ fr: "Nom *", en: "Name *", es: "Nombre *", it: "Nome *" })}</label>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} placeholder={t({ fr: "Ex: Le Burger Signature", en: "Ex: Signature Burger", es: "Ej: La Hamburguesa Signature", it: "Es: Il Burger Signature" })} />
          </div>

          <div>
            <label className="block text-[0.6rem] tracking-widest uppercase text-white/40 mb-1.5">{t({ fr: "Description", en: "Description", es: "Descripción", it: "Descrizione" })}</label>
            <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={inputCls + " resize-none"} rows={2} placeholder={t({ fr: "Ingrédients, préparation...", en: "Ingredients, prep...", es: "Ingredientes, preparación...", it: "Ingredienti, preparazione..." })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.6rem] tracking-widest uppercase text-white/40 mb-1.5">{t({ fr: "Prix (€) *", en: "Price (€) *", es: "Precio (€) *", it: "Prezzo (€) *" })}</label>
              <input type="number" step="0.5" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} className={inputCls} placeholder="15.50" />
            </div>
            <div>
              <label className="block text-[0.6rem] tracking-widest uppercase text-white/40 mb-1.5">{t({ fr: "Catégorie", en: "Category", es: "Categoría", it: "Categoria" })}</label>
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={inputCls}>
                {(liveCategories.length > 0
                  ? liveCategories.map(lc => ({ dbValue: lc.key, label: lc.emoji + ' ' + lc.fr + ' / ' + lc.en }))
                  : NAMED_CATEGORIES.map(nc => ({ dbValue: nc.dbValue, label: nc.label }))
                ).map((cat) => (
                  <option key={cat.dbValue} value={cat.dbValue} className="bg-[#111]">{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[0.6rem] tracking-widest uppercase text-white/40 mb-1.5">{t({ fr: "URL de l'image", en: "Image URL", es: "URL de la imagen", it: "URL dell'immagine" })}</label>
            <div className="flex gap-2">
              <input value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} className={inputCls} placeholder="https://..." />
              <label className={`shrink-0 flex items-center justify-center px-4 bg-[#1A1A1A] border border-white/10 rounded-lg transition-colors cursor-pointer text-white/60 ${uploadingImage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'}`}>
                {uploadingImage ? (
                  <svg className="animate-spin h-5 w-5 text-[#7CB895]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  "📁"
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
              </label>
            </div>
            {draft.image_url && (
              <div className="mt-3 relative w-full h-40 rounded-lg overflow-hidden border border-white/10 bg-[#0A0A0A] flex items-center justify-center">
                {uploadingImage && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                    <svg className="animate-spin h-8 w-8 text-[#7CB895] mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-xs text-[#7CB895] uppercase tracking-widest">{t({ fr: "Téléchargement...", en: "Uploading...", es: "Subiendo...", it: "Caricamento..." })}</span>
                  </div>
                )}
                <img src={draft.image_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 py-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => setDraft((p) => ({ ...p, available: !p.available }))} className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${draft.available ? "bg-[#7CB895]" : "bg-white/10"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${draft.available ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-white/60">{t({ fr: "Disponible", en: "Available", es: "Disponible", it: "Disponibile" })}</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => setDraft((p) => ({ ...p, takeaway_available: !p.takeaway_available }))} className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${draft.takeaway_available ? "bg-[#D4AF37]" : "bg-white/10"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${draft.takeaway_available ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-white/60">🛍️ {t({ fr: "À emporter", en: "Takeaway", es: "Para llevar", it: "Da asporto" })}</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => setDraft((p) => ({ ...p, chef_suggestion: !p.chef_suggestion }))} className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${draft.chef_suggestion ? "bg-[#F3CDA0]" : "bg-white/10"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${draft.chef_suggestion ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-white/60">👨‍🍳 {t({ fr: "Chef Pick", en: "Chef Pick", es: "Selección del Chef", it: "Scelta dello Chef" })}</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => setDraft((p) => ({ ...p, has_allergens: !p.has_allergens }))} className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${draft.has_allergens ? "bg-amber-500" : "bg-white/10"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${draft.has_allergens ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-white/60">⚠️ {t({ fr: "Allergènes", en: "Allergens", es: "Alérgenos", it: "Allergeni" })}</span>
            </label>
          </div>

          <AnimatePresence>
            {draft.has_allergens && (
              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}>
                <label className="block text-[0.6rem] tracking-widest uppercase text-white/40 mb-1.5 mt-1">
                  {t({ fr: "Détail des allergènes", en: "Allergen details", es: "Detalle de alérgenos", it: "Dettaglio allergeni" })}
                </label>
                <input
                  id="mi-allergens"
                  type="text"
                  value={draft.allergens_text}
                  onChange={(e) => setDraft(p => ({ ...p, allergens_text: e.target.value }))}
                  className={inputCls}
                  placeholder={t({ fr: "Gluten, lactose, fruits à coque…", en: "Gluten, dairy, tree nuts…", es: "Gluten, lácteos, frutos secos…", it: "Glutine, latticini, frutta a guscio…" })}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {err && <p className="text-red-400 text-xs">⚠ {err}</p>}
        </div>

        <div className="px-6 pb-6 pt-2 shrink-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-xs tracking-widest uppercase border border-white/10 text-white/50 hover:bg-white/5 rounded-lg transition-colors">
            {t({ fr: "Annuler", en: "Cancel", es: "Cancelar", it: "Annulla" })}
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 text-xs tracking-widest uppercase bg-[#7CB895] text-[#0A0A0A] font-semibold rounded-lg hover:bg-[#6aaa83] disabled:opacity-40 transition-colors">
            {saving ? t({ fr: "Sauvegarde…", en: "Saving…", es: "Guardando…", it: "Salvataggio…" }) : item ? t({ fr: "Mettre à jour", en: "Update", es: "Actualizar", it: "Aggiorna" }) : t("Créer", "Create")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Categories Panel
// ─────────────────────────────────────────────────────────────────────────────
function CategoriesPanel({ t }: { t: (fr: string, en: string) => string }) {
  const db = useMemo(() => createClient(), []);
  const [cats, setCats] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [setupRunning, setSetupRunning] = useState(false);
  const [copiedEmoji, setCopiedEmoji] = useState("");

  const EMOJI_CHART = [
    "🍔", "🍕", "🥗", "🥪", "🌭", "🌮", "🌯", "🥩", "🍗", "🍖", 
    "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🍤", "🍙", "🍚",
    "🍘", "🍥", "🥠", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🍰",
    "🍮", "🎂", "🧁", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰",
    "🥜", "🍯", "🥛", "🍼", "☕", "🍵", "🥤", "🧃", "🧉", "🍶",
    "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🍾", "🧊", "🥄",
    "🍴", "🍽️", "🥣", "🥡", "🥢", "🧂", "🥐", "🥖", "🥨", "🥯",
    "🧀", "🥞", "🧇", "🥓", "🍳", "🍟", "🍠", "🍓", "🍉", "🍒"
  ];

  useEffect(() => { 
    (async () => {
      const { data } = await db.from("site_settings").select("value").eq("key", "categories").maybeSingle();
      if (data?.value && Array.isArray(data.value)) setCats(data.value as Category[]);
      else setCats(DEFAULT_CATEGORIES);
    })();
  }, [db]);

  const runSetup = async () => {
    setSetupRunning(true); setMsg("");
    const pass = window.prompt(t({ fr: "Entrez le mot de passe admin", en: "Enter admin passphrase", es: "Ingrese la contraseña de admin", it: "Inserisci la password admin" }));
    if (!pass) { setSetupRunning(false); return; }
    try {
      const r = await fetch("/api/admin/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passphrase: pass }) });
      const d = await r.json();
      setMsg(d.success ? t({ fr: "Configuration ✓ Rechargez la page.", en: "Setup done ✓ Reload the page.", es: "Configuración ✓ Recargue la página.", it: "Configurazione ✓ Ricarica la pagina." }) : d.error || "Error");
    } catch (e) { setMsg(String(e)); }
    setSetupRunning(false);
  };

  const save = async () => {
    setSaving(true); setMsg("");
    const { error } = await db.from("site_settings").upsert({ key: "categories", value: cats }, { onConflict: "key" });
    setMsg(error ? error.message : t({ fr: "Sauvegardé ✓", en: "Saved ✓", es: "Guardado ✓", it: "Salvato ✓" }));
    setSaving(false);
  };

  const add    = () => setCats(p => [...p, { key: `cat_${Date.now()}`, emoji: "🍽️", fr: "Nouvelle catégorie", en: "New Category" }]);
  const remove = (i: number) => setCats(p => p.filter((_, j) => j !== i));
  const move   = (i: number, dir: -1 | 1) => { const a = [...cats], b = i + dir; if (b < 0 || b >= a.length) return; [a[i], a[b]] = [a[b], a[i]]; setCats(a); };
  const upd    = (i: number, f: keyof Category, v: string) => setCats(p => p.map((x, j) => j === i ? { ...x, [f]: v } : x));

  const copyEmoji = (emoji: string) => {
    navigator.clipboard.writeText(emoji);
    setCopiedEmoji(emoji);
    setTimeout(() => setCopiedEmoji(""), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <div className="flex-1 max-w-3xl w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-[2.5rem] text-[#7CB895]" style={bebas}>{t({ fr: "Catégories du Menu", en: "Menu Categories", es: "Categorías del Menú", it: "Categorie del Menu" })}</h2>
            <p className="text-white/40 text-sm mt-1">{t({ fr: "Gérez les catégories qui apparaissent sur le site public.", en: "Manage the categories that appear on the public site.", es: "Gestione las categorías que aparecen en el sitio público.", it: "Gestisci le categorie visualizzate sul sito pubblico." })}</p>
          </div>
        </div>
        
        <div className="bg-[#111] border border-white/10 rounded-xl p-6">
          <div className="space-y-3">
            {cats.map((cat, i) => (
              <div key={cat.key} className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-lg p-3 transition-colors hover:border-white/10">
                <div className="flex flex-col gap-1">
                  <button onClick={() => move(i, -1)} className="text-white/20 hover:text-white/60 px-1 transition-colors">▲</button>
                  <button onClick={() => move(i, 1)}  className="text-white/20 hover:text-white/60 px-1 transition-colors">▼</button>
                </div>
                <input value={cat.emoji} onChange={e => upd(i, "emoji", e.target.value)} maxLength={4} className="w-12 text-center bg-white/5 border border-white/10 rounded-lg p-2 text-lg outline-none focus:border-[#7CB895]/50 transition-colors" />
                <input value={cat.fr} onChange={e => upd(i, "fr", e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-[#7CB895]/50 transition-colors" placeholder="FR name" />
                <input value={cat.en} onChange={e => upd(i, "en", e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-[#7CB895]/50 transition-colors" placeholder="EN name" />
                <button onClick={() => remove(i)} className="text-red-400/40 hover:text-red-400 text-xl px-2 transition-colors">×</button>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-6 pt-6 border-t border-white/10">
            <button onClick={add} className="px-6 py-2.5 text-xs tracking-widest uppercase border border-white/10 text-white/50 hover:bg-white/5 rounded-lg transition-colors">
              + {t({ fr: "Ajouter", en: "Add Category", es: "Añadir", it: "Aggiungi" })}
            </button>
            <button onClick={save} disabled={saving} className="px-6 py-2.5 text-xs tracking-widest uppercase bg-[#7CB895] text-[#0A0A0A] font-semibold rounded-lg hover:bg-[#6aaa83] transition-colors">
              {saving ? t({ fr: "Sauvegarde…", en: "Saving…", es: "Guardando…", it: "Salvataggio…" }) : t("Sauvegarder", "Save")}
            </button>
            {msg && <span className={`self-center text-sm ${msg.includes("✓") ? "text-[#7CB895]" : "text-red-400"}`}>{msg}</span>}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-80 shrink-0 bg-[#111] border border-white/10 rounded-xl p-6 lg:sticky top-10">
        <h3 className="text-[#7CB895] font-semibold mb-2 text-sm uppercase tracking-wider">{t({ fr: "Tableau d'Icônes", en: "Icon Chart", es: "Tabla de Iconos", it: "Tabella Icone" })}</h3>
        <p className="text-white/40 text-xs mb-6">
          {t({ fr: "Cliquez sur une icône pour la copier, puis collez-la dans le champ de la catégorie à gauche.", en: "Click an icon to copy it, then paste it in the category field on the left.", es: "Haga clic en un icono para copiarlo, luego péguelo en el campo de categoría a la izquierda.", it: "Fai clic su un'icona per copiarla, poi incollala nel campo categoria a sinistra." })}
        </p>
        <div className="grid grid-cols-6 gap-2">
          {EMOJI_CHART.map(emoji => (
            <button 
              key={emoji}
              onClick={() => copyEmoji(emoji)}
              className="text-2xl hover:bg-white/10 p-2 rounded-lg transition-colors text-center relative group"
            >
              {emoji}
              {copiedEmoji === emoji && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#7CB895] text-black text-[0.6rem] font-bold px-2 py-1 rounded-md pointer-events-none animate-in fade-in zoom-in duration-200">
                  {t({ fr: "Copié !", en: "Copied!", es: "¡Copiado!", it: "Copiato!" })}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Content Panel
// ─────────────────────────────────────────────────────────────────────────────
function ContentPanel({ t }: { t: (fr: string, en: string) => string }) {
  const db = useMemo(() => createClient(), []);
  const [form, setForm] = useState<SiteContent>(DEFAULT_CONTENT);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { 
    (async () => {
      const { data } = await db.from("site_settings").select("value").eq("key", "site_content").maybeSingle();
      if (data?.value && typeof data.value === "object") setForm({ ...DEFAULT_CONTENT, ...(data.value as Partial<SiteContent>) });
    })();
  }, [db]);

  const save = async () => {
    setSaving(true); setMsg("");
    const { error } = await db.from("site_settings").upsert({ key: "site_content", value: form }, { onConflict: "key" });
    setMsg(error ? error.message : t({ fr: "Sauvegardé ✓", en: "Saved ✓", es: "Guardado ✓", it: "Salvato ✓" }));
    setSaving(false);
  };

  const set = (key: keyof SiteContent) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  const safeParseJSON = (str: string, fallback: any) => {
    try { return JSON.parse(str); } catch { return fallback; }
  };

  const storyPillars = safeParseJSON(form.story_pillars || "[]", []);
  const openingHours = safeParseJSON(form.opening_hours || "[]", []);

  const updatePillar = (index: number, key: string, val: string) => {
    const newArr = [...storyPillars];
    newArr[index] = { ...newArr[index], [key]: val };
    setForm(p => ({ ...p, story_pillars: JSON.stringify(newArr, null, 2) }));
  };

  const updateHour = (index: number, key: string, val: string) => {
    const newArr = [...openingHours];
    newArr[index] = { ...newArr[index], [key]: val };
    setForm(p => ({ ...p, opening_hours: JSON.stringify(newArr, null, 2) }));
  };

  const addPillar = () => {
    const newArr = [...storyPillars, { number: `0${storyPillars.length + 1}`, title_fr: "", title_en: "", body_fr: "", body_en: "" }];
    setForm(p => ({ ...p, story_pillars: JSON.stringify(newArr, null, 2) }));
  };

  const removePillar = (index: number) => {
    const newArr = storyPillars.filter((_: any, i: number) => i !== index);
    setForm(p => ({ ...p, story_pillars: JSON.stringify(newArr, null, 2) }));
  };

  const addHour = () => {
    const newArr = [...openingHours, { day: "", day_en: "", hours: "" }];
    setForm(p => ({ ...p, opening_hours: JSON.stringify(newArr, null, 2) }));
  };

  const removeHour = (index: number) => {
    const newArr = openingHours.filter((_: any, i: number) => i !== index);
    setForm(p => ({ ...p, opening_hours: JSON.stringify(newArr, null, 2) }));
  };

  const lbl = (label: string) => <label className="block text-[0.6rem] tracking-widest uppercase text-white/40 mb-2">{label}</label>;
  const row = (frKey: keyof SiteContent, enKey: keyof SiteContent, frLabel: string, enLabel: string, textarea = false) => (
    <div className="grid grid-cols-2 gap-6">
      <div>{lbl(frLabel)}{textarea
        ? <textarea rows={2} value={String(form[frKey] ?? "")} onChange={set(frKey)} className={inputCls + " resize-none"} />
        : <input value={String(form[frKey] ?? "")} onChange={set(frKey)} className={inputCls} />}
      </div>
      <div>{lbl(enLabel)}{textarea
        ? <textarea rows={2} value={String(form[enKey] ?? "")} onChange={set(enKey)} className={inputCls + " resize-none"} />
        : <input value={String(form[enKey] ?? "")} onChange={set(enKey)} className={inputCls} />}
      </div>
    </div>
  );

  const sectionTitle = (icon: string, label: string) => (
    <div className="flex items-center gap-3 mb-5 pt-6 border-t border-white/10">
      <span className="text-xl">{icon}</span>
      <h3 className="text-[#7CB895] text-lg" style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.06em" }}>{label}</h3>
    </div>
  );

  const slideTitle = (n: string, label: string) => (
    <p className="text-[0.6rem] tracking-widest uppercase text-white/30 mb-4 flex items-center gap-2">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#7CB895]/20 text-[#7CB895] font-bold text-[0.55rem]">{n}</span>
      {label}
    </p>
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h2 className="text-[2.5rem] text-[#7CB895]" style={bebas}>{t({ fr: "Contenu du site", en: "Site Content", es: "Contenido del sitio", it: "Contenuto del sito" })}</h2>
        <p className="text-white/40 text-sm mt-1">{t({ fr: "Modifiez tous les textes visibles sur le site public.", en: "Edit all text visible on the public website.", es: "Edite todos los textos visibles en el sitio público.", it: "Modifica tutti i testi visibili sul sito pubblico." })}</p>
      </div>

      <div className="bg-[#111] border border-white/10 rounded-xl p-8 space-y-6">

        {/* ── 1. HERO SECTION ──────────────────────────────────────────────── */}
        <div className="bg-[#1A1A1A] p-6 rounded-xl border border-white/5 relative overflow-hidden">
          {sectionTitle("1️⃣", t({ fr: "Accueil & Défilement", en: "Home & Scroll (Hero)", es: "Inicio y Desplazamiento", it: "Home e Scorrimento" }))}
          <p className="text-white/40 text-xs mb-6 mt-[-10px]">{t({ fr: "Textes superposés sur l'animation de fond au début du site.", en: "Text overlaid on the background animation at the start of the site.", es: "Textos superpuestos en la animación de fondo al inicio del sitio.", it: "Testi sovrapposti sull'animazione di sfondo all'inizio del sito." })}</p>

          <div className="space-y-6">
            <div>
              {lbl(t({ fr: "Accroche du haut (eyebrow)", en: "Top eyebrow text", es: "Texto superior (eyebrow)", it: "Testo superiore (eyebrow)" }))}
              <input value={form.hero_eyebrow ?? ""} onChange={set("hero_eyebrow")} className={inputCls} placeholder="Restaurant Bistronomy · Paris" />
              <p className="text-white/25 text-[0.6rem] mt-1">{t({ fr: "Ligne verte au-dessus du grand titre", en: "Green line above the main title", es: "Línea verde sobre el título principal", it: "Linea verde sopra il titolo principale" })}</p>
            </div>

            {slideTitle("1", t({ fr: "Diapo 1 — Grand titre d'ouverture", en: "Slide 1 — Opening title", es: "Diapositiva 1 — Título de apertura", it: "Diapositiva 1 — Titolo di apertura" }))}
            <div>
              {lbl(t({ fr: "Titre — Ligne 1 (blanc)", en: "Title — Line 1 (white)", es: "Título — Línea 1 (blanco)", it: "Titolo — Linea 1 (bianco)" }))}
              <input value={form.hero_title_line1 ?? ""} onChange={set("hero_title_line1")} className={inputCls} placeholder="L'ÉCHOPPE" />
            </div>
            {row("hero_title_line2_fr", "hero_title_line2_en",
              t({ fr: "Ligne 2 FR (verte)", en: "Line 2 FR (green)", es: "Línea 2 FR (verde)", it: "Linea 2 FR (verde)" }),
              t({ fr: "Ligne 2 EN (verte)", en: "Line 2 EN (green)", es: "Línea 2 EN (verde)", it: "Linea 2 EN (verde)" })
            )}
            {row("hero_scroll_hint_fr", "hero_scroll_hint_en",
              t({ fr: "Invite de défilement FR", en: "Scroll hint FR", es: "Indicación de desplazamiento FR", it: "Indicazione di scorrimento FR" }),
              t({ fr: "Invite de défilement EN", en: "Scroll hint EN", es: "Indicación de desplazamiento EN", it: "Indicazione di scorrimento EN" })
            )}

            <div className="border-t border-white/5 pt-4">
              {slideTitle("2", t({ fr: "Diapo 2 — Philosophie (gauche)", en: "Slide 2 — Philosophy (left)", es: "Diapositiva 2 — Filosofía (izquierda)", it: "Diapositiva 2 — Filosofia (sinistra)" }))}
              {row("hero_s2_label_fr", "hero_s2_label_en", t({ fr: "Label FR", en: "Label EN", es: "Etiqueta FR", it: "Etichetta FR" }), t({ fr: "Label FR", en: "Label EN", es: "Etiqueta FR", it: "Etichetta FR" }))}
              {row("hero_s2_title_fr", "hero_s2_title_en", t({ fr: "Titre FR (blanc)", en: "Title FR (white)", es: "Título FR (blanco)", it: "Titolo FR (bianco)" }), t("Titre EN (blanc)", "Title EN (white)"))}
              {row("hero_s2_accent_fr", "hero_s2_accent_en", t({ fr: "Accent FR (doré)", en: "Accent FR (gold)", es: "Acento FR (dorado)", it: "Accento FR (dorato)" }), t("Accent EN (doré)", "Accent EN (gold)"))}
            </div>

            <div className="border-t border-white/5 pt-4">
              {slideTitle("3", t({ fr: "Diapo 3 — Produit (droite)", en: "Slide 3 — Product (right)", es: "Diapositiva 3 — Producto (derecha)", it: "Diapositiva 3 — Prodotto (destra)" }))}
              {row("hero_s3_title_fr", "hero_s3_title_en", t({ fr: "Titre FR (blanc)", en: "Title FR (white)", es: "Título FR (blanco)", it: "Titolo FR (bianco)" }), t("Titre EN (blanc)", "Title EN (white)"))}
              {row("hero_s3_accent_fr", "hero_s3_accent_en", t({ fr: "Accent FR (vert)", en: "Accent FR (green)", es: "Acento FR (verde)", it: "Accento FR (verde)" }), t("Accent EN (vert)", "Accent EN (green)"))}
              {row("hero_s3_body_fr", "hero_s3_body_en", t({ fr: "Sous-titre FR", en: "Body text FR", es: "Subtítulo FR", it: "Sottotitolo FR" }), t("Sous-titre EN", "Body text EN"), true)}
            </div>

            <div className="border-t border-white/5 pt-4">
              {slideTitle("4", t({ fr: "Diapo 4 — Appel à l'action (centré)", en: "Slide 4 — CTA (centred)", es: "Diapositiva 4 — Llamada a la acción (centrada)", it: "Diapositiva 4 — Invito all'azione (centrato)" }))}
              {row("hero_s4_label_fr", "hero_s4_label_en", t({ fr: "Label FR", en: "Label FR", es: "Etiqueta FR", it: "Etichetta FR" }), t("Label EN", "Label EN"))}
              {row("hero_s4_title_fr", "hero_s4_title_en", t({ fr: "Titre FR (blanc)", en: "Title FR (white)", es: "Título FR (blanco)", it: "Titolo FR (bianco)" }), t("Titre EN (blanc)", "Title EN (white)"))}
              {row("hero_s4_accent_fr", "hero_s4_accent_en", t({ fr: "Accent FR (doré)", en: "Accent FR (gold)", es: "Acento FR (dorado)", it: "Accento FR (dorato)" }), t("Accent EN (doré)", "Accent EN (gold)"))}
              {row("hero_s4_cta_fr", "hero_s4_cta_en", t({ fr: "Bouton CTA FR", en: "CTA button FR", es: "Botón CTA FR", it: "Pulsante CTA FR" }), t("Bouton CTA EN", "CTA button EN"))}
              {row("hero_s4_note_fr", "hero_s4_note_en", t({ fr: "Note sous le bouton FR", en: "Note below button FR", es: "Nota bajo el botón FR", it: "Nota sotto il pulsante FR" }), t("Note sous le bouton EN", "Note below button EN"))}
            </div>
          </div>
        </div>

        {/* ── 2. MENU INFO ────────────────────────────────────────────── */}
        <div className="bg-[#1A1A1A] p-6 rounded-xl border border-white/5">
          {sectionTitle("2️⃣", t({ fr: "Menu & Suggestions", en: "Menu & Suggestions", es: "Menú y Sugerencias", it: "Menu e Suggerimenti" }))}
          <p className="text-white/60 text-sm mt-[-10px] bg-white/5 p-4 rounded-lg border border-white/10">
            {t({ fr: "Le Menu, les Suggestions du Chef et la liste des plats sont gérés dans l'onglet ", en: "The Menu, Chef's Suggestions, and item list are managed in the ", es: "El menú, las sugerencias del chef y los platos se gestionan en la pestaña ", it: "Il menu, i suggerimenti dello chef e i piatti sono gestiti nella scheda " })}
            <strong className="text-[#7CB895]">"🍽️ Menu"</strong> {t({ fr: "en haut de cette page.", en: "tab at the top of this page.", es: "en la parte superior de esta página.", it: "nella parte superiore di questa pagina." })}
          </p>
        </div>

        {/* ── 3. STORY SECTION ─────────────────────────────────────────────── */}
        <div className="bg-[#1A1A1A] p-6 rounded-xl border border-white/5">
          {sectionTitle("3️⃣", t({ fr: "Section Histoire", en: "Our Story Section", es: "Sección Historia", it: "Sezione Storia" }))}
          <p className="text-white/40 text-xs mb-6 mt-[-10px]">{t({ fr: "Le texte de présentation et les 3 piliers de la marque.", en: "The introduction text and the 3 brand pillars.", es: "El texto de presentación y los 3 pilares de la marca.", it: "Il testo di presentazione e i 3 pilastri del marchio." })}</p>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>{lbl(t({ fr: "Titre Principal FR", en: "Main Headline FR", es: "Título Principal FR", it: "Titolo Principale FR" }))}<textarea rows={2} value={form.story_headline_fr || ""} onChange={e=>setForm(p=>({...p,story_headline_fr:e.target.value}))} className={inputCls + " resize-none"} /></div>
              <div>{lbl(t({ fr: "Titre Principal EN", en: "Main Headline EN", es: "Título Principal EN", it: "Titolo Principale EN" }))}<textarea rows={2} value={form.story_headline_en || ""} onChange={e=>setForm(p=>({...p,story_headline_en:e.target.value}))} className={inputCls + " resize-none"} /></div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>{lbl(t({ fr: "Texte de présentation FR", en: "Introduction Text FR", es: "Texto de presentación FR", it: "Testo di presentazione FR" }))}<textarea rows={4} value={form.story_text_fr || ""} onChange={e=>setForm(p=>({...p,story_text_fr:e.target.value}))} className={inputCls + " resize-none"} /></div>
              <div>{lbl(t({ fr: "Texte de présentation EN", en: "Introduction Text EN", es: "Texto de presentación EN", it: "Testo di presentazione EN" }))}<textarea rows={4} value={form.story_text_en || ""} onChange={e=>setForm(p=>({...p,story_text_en:e.target.value}))} className={inputCls + " resize-none"} /></div>
            </div>

            <div className="border-t border-white/5 pt-4">
              {lbl(t({ fr: "Piliers de l'Histoire (Ex: Terroir, Artisanat, Bistro)", en: "Story Pillars (e.g. Terroir, Craft, Bistro)", es: "Pilares de la Historia (Ej: Terroir, Artesanía, Bistró)", it: "Pilastri della Storia (Es: Terroir, Artigianato, Bistro)" }))}
              <div className="space-y-4">
                {storyPillars.map((p: any, i: number) => (
                  <div key={i} className="bg-black/40 border border-white/5 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-3 mb-2 justify-between">
                      <span className="text-[#7CB895] font-bold">{p.number || `0${i+1}`}</span>
                      <button onClick={() => removePillar(i)} className="text-white/40 hover:text-red-400 text-xs uppercase tracking-wider px-2 py-1 transition-colors">
                        {t({ fr: "Supprimer", en: "Remove", es: "Eliminar", it: "Elimina" })}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[0.55rem] text-white/30 uppercase mb-1">{t({ fr: "Titre FR", en: "Title FR", es: "Título FR", it: "Titolo FR" })}</label>
                        <input value={p.title_fr} onChange={e=>updatePillar(i, "title_fr", e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[0.55rem] text-white/30 uppercase mb-1">{t({ fr: "Titre EN", en: "Title EN", es: "Título EN", it: "Titolo EN" })}</label>
                        <input value={p.title_en} onChange={e=>updatePillar(i, "title_en", e.target.value)} className={inputCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[0.55rem] text-white/30 uppercase mb-1">{t({ fr: "Texte FR", en: "Body FR", es: "Texto FR", it: "Testo FR" })}</label>
                        <textarea rows={2} value={p.body_fr} onChange={e=>updatePillar(i, "body_fr", e.target.value)} className={inputCls + " resize-none"} />
                      </div>
                      <div>
                        <label className="block text-[0.55rem] text-white/30 uppercase mb-1">{t({ fr: "Texte EN", en: "Body EN", es: "Texto EN", it: "Testo EN" })}</label>
                        <textarea rows={2} value={p.body_en} onChange={e=>updatePillar(i, "body_en", e.target.value)} className={inputCls + " resize-none"} />
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addPillar} className="w-full py-3 border border-white/10 border-dashed rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors text-xs uppercase tracking-widest mt-2">
                  + {t({ fr: "Ajouter un Pilier", en: "Add Pillar", es: "Añadir un Pilar", it: "Aggiungi un Pilastro" })}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. LOCATION & HOURS ────────────────────────────────────────── */}
        <div className="bg-[#1A1A1A] p-6 rounded-xl border border-white/5">
          {sectionTitle("4️⃣", t({ fr: "Localisation & Horaires", en: "Location & Hours", es: "Ubicación y Horarios", it: "Posizione e Orari" }))}
          <p className="text-white/40 text-xs mb-6 mt-[-10px]">{t({ fr: "Infos affichées dans la section contact et le pied de page.", en: "Info displayed in the contact section and footer.", es: "Información mostrada en la sección de contacto y pie de página.", it: "Informazioni visualizzate nella sezione contatti e nel footer." })}</p>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>{lbl(t({ fr: "Adresse Physique", en: "Physical Address", es: "Dirección Física", it: "Indirizzo Fisico" }))}<input value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} className={inputCls} /></div>
              <div>{lbl(t({ fr: "Téléphone de Contact", en: "Contact Phone", es: "Teléfono de Contacto", it: "Telefono di Contatto" }))}<input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} className={inputCls} /></div>
            </div>

            <div className="border-t border-white/5 pt-4">
              {lbl(t({ fr: "Horaires d'Ouverture", en: "Opening Hours", es: "Horarios de Apertura", it: "Orari di Apertura" }))}
              <div className="space-y-2 mt-2">
                {openingHours.map((h: any, i: number) => (
                  <div key={i} className="flex gap-4 items-center bg-black/40 border border-white/5 rounded-lg p-3 relative group pr-10">
                    <div className="w-1/3">
                      <label className="block text-[0.55rem] text-white/30 uppercase mb-1">{t({ fr: "Jour FR", en: "Day FR", es: "Día FR", it: "Giorno FR" })}</label>
                      <input value={h.day} onChange={e=>updateHour(i, "day", e.target.value)} className={inputCls} />
                    </div>
                    <div className="w-1/3">
                      <label className="block text-[0.55rem] text-white/30 uppercase mb-1">{t({ fr: "Jour EN", en: "Day EN", es: "Día EN", it: "Giorno EN" })}</label>
                      <input value={h.day_en} onChange={e=>updateHour(i, "day_en", e.target.value)} className={inputCls} />
                    </div>
                    <div className="w-1/3">
                      <label className="block text-[0.55rem] text-white/30 uppercase mb-1">{t({ fr: "Horaires", en: "Hours", es: "Horarios", it: "Orari" })}</label>
                      <input value={h.hours} onChange={e=>updateHour(i, "hours", e.target.value)} className={inputCls} placeholder="12:00 – 14:30 / 19:00 – 22:30" />
                    </div>
                    <button onClick={() => removeHour(i)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xl" title={t({ fr: "Supprimer", en: "Remove", es: "Eliminar", it: "Elimina" })}>
                      &times;
                    </button>
                  </div>
                ))}
                <button onClick={addHour} className="w-full py-3 border border-white/10 border-dashed rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors text-xs uppercase tracking-widest mt-2">
                  + {t({ fr: "Ajouter un Horaire", en: "Add Hours", es: "Añadir un Horario", it: "Aggiungi un Orario" })}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 5. FOOTER & LEGAL ──────────────────────────────────────────── */}
        <div className="bg-[#1A1A1A] p-6 rounded-xl border border-white/5">
          {sectionTitle("5️⃣", t({ fr: "Footer & Mentions Légales", en: "Footer & Legal", es: "Footer y Avisos Legales", it: "Footer e Note Legali" }))}
          <p className="text-white/40 text-xs mb-6 mt-[-10px]">{t({ fr: "Le slogan global en bas de page et les pages légales.", en: "The global tagline at the bottom and legal pages.", es: "El eslogan global en el pie de página y las páginas legales.", it: "Lo slogan globale in fondo alla pagina e le pagine legali." })}</p>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>{lbl(t({ fr: "Slogan Global FR", en: "Global Tagline FR", es: "Eslogan Global FR", it: "Slogan Globale FR" }))}<input value={form.tagline_fr} onChange={e=>setForm(p=>({...p,tagline_fr:e.target.value}))} className={inputCls} /></div>
              <div>{lbl(t({ fr: "Slogan Global EN", en: "Global Tagline EN", es: "Eslogan Global EN", it: "Slogan Globale EN" }))}<input value={form.tagline_en} onChange={e=>setForm(p=>({...p,tagline_en:e.target.value}))} className={inputCls} /></div>
            </div>

            <div className="border-t border-white/5 pt-4">
              {lbl(t({ fr: "Politique de confidentialité (HTML ou texte)", en: "Privacy Policy (HTML or text)", es: "Política de privacidad (HTML o texto)", it: "Privacy Policy (HTML o testo)" }))}
              <textarea rows={3} value={form.privacy_policy} onChange={e=>setForm(p=>({...p,privacy_policy:e.target.value}))} className={inputCls + " resize-none"} />
            </div>

            <div>
              {lbl(t({ fr: "Conditions générales (HTML ou texte)", en: "Terms & Conditions (HTML or text)", es: "Términos y condiciones (HTML o texto)", it: "Termini e condizioni (HTML o testo)" }))}
              <textarea rows={3} value={form.terms_conditions} onChange={e=>setForm(p=>({...p,terms_conditions:e.target.value}))} className={inputCls + " resize-none"} />
            </div>

            <div>
              {lbl(t({ fr: "Mentions légales (HTML ou texte)", en: "Legal Notice (HTML or text)", es: "Aviso legal (HTML o texto)", it: "Note legali (HTML o testo)" }))}
              <textarea rows={3} value={form.legal_notice || ""} onChange={e=>setForm(p=>({...p,legal_notice:e.target.value}))} className={inputCls + " resize-none"} />
            </div>
          </div>
        </div>

        {/* ── SAVE ────────────────────────────────────────────────────────── */}
        <div className="pt-6 border-t border-white/10 flex gap-4 items-center">
          <button onClick={save} disabled={saving} className="px-8 py-3 text-sm tracking-widest uppercase bg-[#7CB895] text-[#0A0A0A] font-semibold rounded-lg hover:bg-[#6aaa83] transition-colors">
            {saving ? t({ fr: "Sauvegarde…", en: "Saving…", es: "Guardando…", it: "Salvataggio…" }) : t("Mettre à jour le site", "Update Site")}
          </button>
          {msg && <span className={`text-sm ${msg.includes("✓") ? "text-[#7CB895]" : "text-red-400"}`}>{msg}</span>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Offers Panel
// ─────────────────────────────────────────────────────────────────────────────

function OffersPanel({ db, t }: { db: any; t: (fr: string, en: string) => string }) {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editOffer, setEditOffer] = useState<any | null>(null);
  const [form, setForm] = useState({ code: "", discount: 10, active: true, expiryType: "infinite", valid_until: "" });
  const [saving, setSaving] = useState(false);

  const fetchOffers = async () => {
    setLoading(true);
    const { data } = await db.from("offers").select("*").order("created_at", { ascending: false });
    setOffers(data || []);
    setLoading(false);
  };

  useEffect(() => { 
    fetchOffers();
  }, [db]);

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
      (window as any).lenis?.stop();
    } else {
      document.body.style.overflow = "unset";
      (window as any).lenis?.start();
    }
    return () => {
      document.body.style.overflow = "unset";
      (window as any).lenis?.start();
    };
  }, [modalOpen]);

  const handleOpenModal = (offer?: any) => {
    if (offer) {
      setEditOffer(offer);
      const hasExp = !!offer.valid_until;
      setForm({ 
        code: offer.code, 
        discount: offer.discount, 
        active: offer.active,
        expiryType: hasExp ? "custom" : "infinite",
        valid_until: hasExp ? new Date(offer.valid_until).toISOString().slice(0, 10) : ""
      });
    } else {
      setEditOffer(null);
      setForm({ code: "", discount: 10, active: true, expiryType: "infinite", valid_until: "" });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || (form.expiryType !== "infinite" && !form.valid_until)) return;
    setSaving(true);
    try {
      // Ensure the validity lasts until the end of the selected day
      let validUntilTimestamp = null;
      if (form.expiryType !== "infinite" && form.valid_until) {
        validUntilTimestamp = new Date(form.valid_until + "T23:59:59.999Z").toISOString();
      }

      const payload = {
        code: form.code,
        discount: form.discount,
        active: form.active,
        valid_until: validUntilTimestamp
      };

      if (editOffer) {
        await db.from("offers").update(payload).eq("id", editOffer.id);
      } else {
        await db.from("offers").insert([payload]);
      }
      setModalOpen(false);
      fetchOffers();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    await db.from("offers").update({ active: !currentStatus }).eq("id", id);
    fetchOffers();
  };

  const handleDelete = async (id: string) => {
    if (confirm(t({ fr: "Supprimer ce code promo ?", en: "Delete this promo code?", es: "¿Eliminar este código promo?", it: "Eliminare questo codice promo?" }))) {
      await db.from("offers").delete().eq("id", id);
      fetchOffers();
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-[2.5rem] text-[#7CB895]" style={bebas}>{t({ fr: "Codes Promo", en: "Promo Codes", es: "Códigos Promo", it: "Codici Promo" })}</h2>
          <p className="text-white/40 text-sm mt-1">{t({ fr: "Gérez les offres spéciales et réductions.", en: "Manage special offers and discounts.", es: "Gestione las ofertas especiales y descuentos.", it: "Gestisci le offerte speciali e gli sconti." })}</p>
        </div>
        <button onClick={() => handleOpenModal()} className="px-5 py-2 text-xs uppercase bg-[#7CB895] text-black font-semibold rounded-lg hover:bg-[#6aaa83] transition-colors">
          + {t({ fr: "Nouvelle Offre", en: "New Offer", es: "Nueva Oferta", it: "Nuova Offerta" })}
        </button>
      </div>
      
      <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 border-b border-white/10 text-white/40 uppercase tracking-widest text-[0.6rem]">
            <tr>
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Remise</th>
              <th className="px-6 py-4">Expiration</th>
              <th className="px-6 py-4">Statut</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-white/20">Chargement...</td></tr>
            ) : offers.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-white/20">{t({ fr: "Aucune offre", en: "No offers", es: "Sin ofertas", it: "Nessuna offerta" })}</td></tr>
            ) : (
              offers.map(o => (
                <tr key={o.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 font-mono text-white/90">{o.code}</td>
                  <td className="px-6 py-4 text-[#D4AF37]">{o.discount}%</td>
                  <td className="px-6 py-4 text-white/50 text-xs">
                    {o.valid_until ? new Date(o.valid_until).toLocaleDateString() : t({ fr: "Infinie", en: "Infinite", es: "Infinita", it: "Infinita" })}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleActive(o.id, o.active)}
                      className={`px-3 py-1 rounded text-xs transition-colors ${o.active ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}
                    >
                      {o.active ? t({ fr: "Actif", en: "Active", es: "Activo", it: "Attivo" }) : t("Inactif", "Inactive")}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-3">
                    <button onClick={() => handleOpenModal(o)} className="text-white/40 hover:text-white transition-colors">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(o.id)} className="text-red-400/50 hover:text-red-400 transition-colors">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Offer Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div data-lenis-prevent="true" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#1A1A1A] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl text-[#7CB895] uppercase tracking-wider mb-6" style={bebas}>
                {editOffer ? t({ fr: "Modifier l'Offre", en: "Edit Offer", es: "Editar Oferta", it: "Modifica Offerta" }) : t({ fr: "Nouvelle Offre", en: "New Offer", es: "Nueva Oferta", it: "Nuova Offerta" })}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[0.6rem] text-white/40 uppercase tracking-widest mb-1">Code *</label>
                  <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-[#7CB895]/50 outline-none" placeholder="ex: BIENVENUE15" />
                </div>
                <div>
                  <label className="block text-[0.6rem] text-white/40 uppercase tracking-widest mb-1">{t({ fr: "Remise (%) *", en: "Discount (%) *", es: "Descuento (%) *", it: "Sconto (%) *" })}</label>
                  <input type="number" value={form.discount} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-[#7CB895]/50 outline-none" />
                </div>

                <div className="pt-2">
                  <label className="block text-[0.6rem] text-white/40 uppercase tracking-widest mb-2">{t({ fr: "Durée de validité", en: "Validity duration", es: "Duración de validez", it: "Durata di validità" })}</label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button onClick={() => setForm({ ...form, expiryType: "infinite", valid_until: "" })} className={`py-2 text-xs rounded-lg border transition-colors ${form.expiryType === 'infinite' ? 'bg-[#7CB895]/20 border-[#7CB895] text-[#7CB895]' : 'border-white/10 text-white/50 hover:bg-white/5'}`}>
                      {t({ fr: "Infinie", en: "Infinite", es: "Infinita", it: "Infinita" })}
                    </button>
                    <button onClick={() => {
                      const d = new Date(); d.setDate(d.getDate() + 7);
                      setForm({ ...form, expiryType: "7_days", valid_until: d.toISOString().split("T")[0] });
                    }} className={`py-2 text-xs rounded-lg border transition-colors ${form.expiryType === '7_days' ? 'bg-[#7CB895]/20 border-[#7CB895] text-[#7CB895]' : 'border-white/10 text-white/50 hover:bg-white/5'}`}>
                      {t({ fr: "7 Jours", en: "7 Days", es: "7 Días", it: "7 Giorni" })}
                    </button>
                    <button onClick={() => {
                      const d = new Date(); d.setMonth(d.getMonth() + 1);
                      setForm({ ...form, expiryType: "1_month", valid_until: d.toISOString().split("T")[0] });
                    }} className={`py-2 text-xs rounded-lg border transition-colors ${form.expiryType === '1_month' ? 'bg-[#7CB895]/20 border-[#7CB895] text-[#7CB895]' : 'border-white/10 text-white/50 hover:bg-white/5'}`}>
                      {t({ fr: "1 Mois", en: "1 Month", es: "1 Mes", it: "1 Mese" })}
                    </button>
                    <button onClick={() => setForm({ ...form, expiryType: "custom" })} className={`py-2 text-xs rounded-lg border transition-colors ${form.expiryType === 'custom' ? 'bg-[#7CB895]/20 border-[#7CB895] text-[#7CB895]' : 'border-white/10 text-white/50 hover:bg-white/5'}`}>
                      {t({ fr: "Date Précise", en: "Specific Date", es: "Fecha Específica", it: "Data Specifica" })}
                    </button>
                  </div>

                  <AnimatePresence>
                    {form.expiryType !== "infinite" && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value, expiryType: "custom" })} min={new Date().toISOString().split("T")[0]} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-[#7CB895]/50 outline-none" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="text-sm text-white/80">{t({ fr: "Statut (Actif)", en: "Status (Active)", es: "Estado (Activo)", it: "Stato (Attivo)" })}</label>
                  <button onClick={() => setForm({ ...form, active: !form.active })} className={`w-12 h-6 rounded-full transition-colors relative ${form.active ? 'bg-[#7CB895]' : 'bg-white/10'}`}>
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.active ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              {/* Error message for missing tables */}
              <p className="text-red-400/80 text-[0.6rem] mt-6 text-center leading-relaxed">
                {t({ fr: "Si la sauvegarde échoue, assurez-vous que la connexion à Supabase est établie.", en: "If saving fails, ensure the Supabase connection is established.", es: "Si el guardado falla, asegúrese de que la conexión a Supabase esté establecida.", it: "Se il salvataggio fallisce, assicurarsi che la connessione a Supabase sia attiva." })}
              </p>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setModalOpen(false)} className="flex-1 py-2 text-xs uppercase tracking-widest border border-white/10 text-white/60 hover:bg-white/5 rounded-lg transition-colors">
                  {t({ fr: "Annuler", en: "Cancel", es: "Cancelar", it: "Annulla" })}
                </button>
                <button onClick={handleSave} disabled={saving || !form.code || (form.expiryType !== 'infinite' && !form.valid_until)} className={`flex-1 py-2 text-xs uppercase tracking-widest font-semibold rounded-lg transition-colors ${saving || !form.code || (form.expiryType !== 'infinite' && !form.valid_until) ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-[#7CB895] text-black hover:bg-[#6aaa83]'}`}>
                  {saving ? "..." : (editOffer ? t({ fr: "Mettre à jour", en: "Update", es: "Actualizar", it: "Aggiorna" }) : t("Créer", "Create"))}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Overview
// ─────────────────────────────────────────────────────────────────────────────
function DashboardPanel({ reservations, menuItems, t }: { reservations: Reservation[], menuItems: MenuItem[], t: (fr:string, en:string)=>string }) {
  const pendingRes = reservations.filter(r => r.status === "pending").length;
  const today = new Date().toISOString().split('T')[0];
  const todayRes = reservations.filter(r => r.date === today && r.status !== "cancelled").length;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="text-[2.5rem] text-white" style={bebas}>{t({ fr: "Vue d'ensemble", en: "Dashboard Overview", es: "Vista General", it: "Panoramica" })}</h2>
        <p className="text-white/40 text-sm mt-1">{t({ fr: "Bienvenue sur l'interface d'administration de L'Échoppe.", en: "Welcome to L'Échoppe's administration interface.", es: "Bienvenido a la interfaz de administración de L'Échoppe.", it: "Benvenuto nell'interfaccia di amministrazione de L'Échoppe." })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#7CB895]/10 rounded-full blur-3xl group-hover:bg-[#7CB895]/20 transition-all"></div>
          <h3 className="text-white/40 text-xs tracking-widest uppercase mb-2">{t({ fr: "Réservations à traiter", en: "Pending Reservations", es: "Reservas pendientes", it: "Prenotazioni in attesa" })}</h3>
          <p className="text-5xl font-light text-[#7CB895]">{pendingRes}</p>
        </div>
        
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-3xl group-hover:bg-[#D4AF37]/20 transition-all"></div>
          <h3 className="text-white/40 text-xs tracking-widest uppercase mb-2">{t({ fr: "Réservations du jour", en: "Today's Reservations", es: "Reservas de hoy", it: "Prenotazioni di oggi" })}</h3>
          <p className="text-5xl font-light text-[#D4AF37]">{todayRes}</p>
        </div>
        
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all"></div>
          <h3 className="text-white/40 text-xs tracking-widest uppercase mb-2">{t({ fr: "Plats au Menu", en: "Menu Items", es: "Platos en el Menú", it: "Piatti nel Menu" })}</h3>
          <p className="text-5xl font-light text-white">{menuItems.length}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const { t, lang, toggle } = useLang();
  const db = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // App state
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  // Navigation state
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [menuSortBy, setMenuSortBy] = useState<string>("created_at");
  
  // Modal states
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Bulk Selection state
  const [selectedReservations, setSelectedReservations] = useState<Set<string>>(new Set());
  const [showPastReservations, setShowPastReservations] = useState(false);

  const filteredReservations = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return reservations.filter(r => {
      if (showPastReservations) return true;
      const resDate = new Date(r.date);
      resDate.setHours(0, 0, 0, 0);
      return resDate >= today;
    });
  }, [reservations, showPastReservations]);

  const sortedMenuItems = useMemo(() => {
    return [...menuItems].sort((a, b) => {
      if (menuSortBy === "created_at") {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA; // descending (newest first)
      }
      if (menuSortBy === "updated_at") {
        const timeA = (a.updated_at || a.created_at) ? new Date(a.updated_at || a.created_at).getTime() : 0;
        const timeB = (b.updated_at || b.created_at) ? new Date(b.updated_at || b.created_at).getTime() : 0;
        return timeB - timeA; // descending (most recently updated first)
      }
      if (menuSortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
  }, [menuItems, menuSortBy]);

  const toggleReservationSelection = (id: string) => {
    const newSet = new Set(selectedReservations);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedReservations(newSet);
  };

  const toggleAllReservations = () => {
    if (selectedReservations.size === filteredReservations.length && filteredReservations.length > 0) {
      setSelectedReservations(new Set());
    } else {
      setSelectedReservations(new Set(filteredReservations.map(r => r.id)));
    }
  };

  const deleteSelectedReservations = async () => {
    if (selectedReservations.size === 0) return;
    if (confirm(t(`Êtes-vous sûr de vouloir supprimer ces ${selectedReservations.size} réservation(s) ?`, `Are you sure you want to delete these ${selectedReservations.size} reservation(s)?`))) {
      await db.from("reservations").delete().in("id", Array.from(selectedReservations));
      setSelectedReservations(new Set());
      fetchData();
    }
  };


  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [menuRes, resRes] = await Promise.all([
      db.from("menu_items").select("*").order("category").order("name"),
      db.from("reservations").select("*").order("date", { ascending: true }).order("time", { ascending: true }),
    ]);

    if (!menuRes.error) setMenuItems(menuRes.data || []);
    if (!resRes.error) setReservations(resRes.data || []);
    setLoading(false);
  }, [db]);

  useEffect(() => {  fetchData(); }, [fetchData]);

  const updateResStatus = async (id: string, status: Reservation["status"]) => {
    await db.from("reservations").update({ status }).eq("id", id);
    fetchData();
  };

  const handleSaveItem = async (draft: Partial<MenuItem>) => {
    if (editingItem) {
      const { error } = await db.from("menu_items").update(draft).eq("id", editingItem.id);
      if (error) throw error;
    } else {
      const { error } = await db.from("menu_items").insert([draft]);
      if (error) throw error;
    }
    fetchData();
  };

  const deleteItem = async (id: string) => {
    if (confirm(t({ fr: "Supprimer ce plat ?", en: "Delete this dish?", es: "¿Eliminar este plato?", it: "Eliminare questo piatto?" }))) {
      await db.from("menu_items").delete().eq("id", id);
      fetchData();
    }
  };

  const SidebarItem = ({ icon, label, tab }: { icon: string, label: string, tab: Tab }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm ${
        activeTab === tab 
          ? "bg-[#7CB895]/10 text-[#7CB895] font-medium border border-[#7CB895]/20" 
          : "text-white/50 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="tracking-wide">{label}</span>
      {tab === "reservations" && reservations.filter(r => r.status === "pending").length > 0 && (
        <span className="ml-auto bg-[#D4AF37] text-black text-[0.6rem] font-bold px-2 py-0.5 rounded-full">
          {reservations.filter(r => r.status === "pending").length}
        </span>
      )}
    </button>
  );

  if (loading && menuItems.length === 0) {
    return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-[#7CB895] font-mono">CHARGEMENT...</div>;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] flex selection:bg-[#D4AF37]/30">
      {/* ── WordPress-style Left Sidebar ── */}
      <aside className="w-64 bg-[#0A0A0A] border-r border-white/5 flex flex-col h-screen sticky top-0 shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-1">
            <img src="/images/logo-full-brand.png" alt="L'Échoppe Logo" className="h-8 object-contain" />
          </div>
          <p className="text-[0.6rem] text-white/30 uppercase tracking-[0.2em] mt-2">Admin Portal</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          <div className="text-[0.65rem] text-white/20 uppercase tracking-widest mb-3 px-4 mt-2 font-semibold">Général</div>
          <SidebarItem icon="📊" label={t({ fr: "Tableau de bord", en: "Dashboard", es: "Panel de Control", it: "Pannello di Controllo" })} tab="dashboard" />
          <SidebarItem icon="📅" label={t({ fr: "Réservations", en: "Reservations", es: "Reservas", it: "Prenotazioni" })} tab="reservations" />
          
          <div className="text-[0.65rem] text-white/20 uppercase tracking-widest mb-3 px-4 mt-8 font-semibold">Restaurant</div>
          <SidebarItem icon="🍽️" label={t({ fr: "Menu & Plats", en: "Menu Items", es: "Menú y Platos", it: "Menu e Piatti" })} tab="menu" />
          <SidebarItem icon="🗂️" label={t({ fr: "Catégories", en: "Categories", es: "Categorías", it: "Categorie" })} tab="categories" />
          <SidebarItem icon="🎁" label={t({ fr: "Codes Promo", en: "Promo Codes", es: "Códigos Promo", it: "Codici Promo" })} tab="offers" />
          
          <div className="text-[0.65rem] text-white/20 uppercase tracking-widest mb-3 px-4 mt-8 font-semibold">Site Web CMS</div>
          <SidebarItem icon="✏️" label={t({ fr: "Contenu & Infos", en: "Content & Info", es: "Contenido e Info", it: "Contenuti e Info" })} tab="content" />
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          <AdminLangDropdown />
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm"
          >
            <span className="text-lg">🚪</span>
            <span>{t({ fr: "Déconnexion", en: "Sign Out", es: "Cerrar Sesión", it: "Disconnetti" })}</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 overflow-y-auto p-10 bg-[#050505]">
        
        {/* Render Active Panel */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "dashboard" && <DashboardPanel reservations={reservations} menuItems={menuItems} t={t} />}
            {activeTab === "categories" && <CategoriesPanel t={t} />}
            {activeTab === "content" && <ContentPanel t={t} />}
            {activeTab === "offers" && <OffersPanel db={db} t={t} />}
            
            {activeTab === "reservations" && (
              <div className="max-w-6xl">
                <div className="mb-8 flex justify-between items-end">
                  <div>
                    <h2 className="text-[2.5rem] text-[#7CB895]" style={bebas}>{t({ fr: "Réservations", en: "Reservations", es: "Reservas", it: "Prenotazioni" })}</h2>
                    <p className="text-white/40 text-sm mt-1">{t({ fr: "Gérez vos tables et demandes clients.", en: "Manage your tables and customer requests.", es: "Gestione sus mesas y solicitudes de clientes.", it: "Gestisci i tavoli e le richieste dei clienti." })}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setShowPastReservations(!showPastReservations)}
                      className="px-4 py-3 text-xs tracking-widest uppercase bg-white/5 text-white/60 border border-white/10 font-bold rounded-lg hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                    >
                      {showPastReservations ? t({ fr: "Masquer Historique", en: "Hide History", es: "Ocultar Historial", it: "Nascondi Cronologia" }) : t("Voir Historique", "Show History")}
                    </button>
                    {selectedReservations.size > 0 && (
                      <button 
                        onClick={deleteSelectedReservations} 
                        className="px-6 py-3 text-xs tracking-widest uppercase bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-lg hover:bg-red-500/30 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.1)] flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        {t(`Supprimer (${selectedReservations.size})`, `Delete (${selectedReservations.size})`)}
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 border-b border-white/10 text-white/40 uppercase tracking-widest text-[0.6rem]">
                      <tr>
                        <th className="px-4 py-4 w-10 text-center">
                          <input 
                            type="checkbox" 
                            className="cursor-pointer accent-[#7CB895]"
                            checked={filteredReservations.length > 0 && selectedReservations.size === filteredReservations.length}
                            onChange={toggleAllReservations}
                          />
                        </th>
                        <th className="px-6 py-4">Client</th>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4">Date & Heure</th>
                        <th className="px-6 py-4">Couvert(s)</th>
                        <th className="px-6 py-4">Statut</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredReservations.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-8 text-center text-white/20">{t({ fr: "Aucune réservation.", en: "No reservations.", es: "Sin reservas.", it: "Nessuna prenotazione." })}</td></tr>
                      ) : (
                        filteredReservations.map((r) => (
                          <tr key={r.id} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-4 w-10 text-center">
                              <input 
                                type="checkbox" 
                                className="cursor-pointer accent-[#7CB895]"
                                checked={selectedReservations.has(r.id)}
                                onChange={() => toggleReservationSelection(r.id)}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-white/90">{r.name}</div>
                              {r.notes && <div className="text-[0.65rem] text-white/40 mt-1 max-w-[150px] truncate" title={r.notes}>📝 {r.notes}</div>}
                            </td>
                            <td className="px-6 py-4 text-white/60 text-xs">
                              <div>{r.email}</div>
                              <div>{r.phone}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-white/90">{new Date(r.date).toLocaleDateString()}</div>
                              <div className="text-[#D4AF37] font-mono text-xs">{r.time}</div>
                            </td>
                            <td className="px-6 py-4 text-white/80">{r.party_size}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[0.6rem] uppercase tracking-widest ${statusColors[r.status]}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              {r.status === "pending" && (
                                <button onClick={() => updateResStatus(r.id, "confirmed")} className="px-3 py-1 bg-[#7CB895]/20 text-[#7CB895] border border-[#7CB895]/30 hover:bg-[#7CB895]/30 rounded text-xs transition-colors">
                                  {t({ fr: "Confirmer", en: "Confirm", es: "Confirmar", it: "Conferma" })}
                                </button>
                              )}
                              {r.status !== "cancelled" && (
                                <button onClick={() => updateResStatus(r.id, "cancelled")} className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 rounded text-xs transition-colors">
                                  {t({ fr: "Annuler", en: "Cancel", es: "Cancelar", it: "Annulla" })}
                                </button>
                              )}
                              <button onClick={() => {
                                if (confirm(t({ fr: "Supprimer cette réservation ?", en: "Delete this reservation?", es: "¿Eliminar esta reserva?", it: "Eliminare questa prenotazione?" }))) {
                                  db.from("reservations").delete().eq("id", r.id).then(() => fetchData());
                                }
                              }} className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded text-xs transition-colors">
                                {t({ fr: "Supprimer", en: "Delete", es: "Eliminar", it: "Elimina" })}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "menu" && (
              <div className="max-w-6xl">
                <div className="mb-8 flex justify-between items-end">
                  <div>
                    <h2 className="text-[2.5rem] text-[#7CB895]" style={bebas}>{t({ fr: "Menu & Plats", en: "Menu & Dishes", es: "Menú y Platos", it: "Menu e Piatti" })}</h2>
                    <p className="text-white/40 text-sm mt-1">{t({ fr: "Gérez votre carte, prix, et badges (Chef, Emporter).", en: "Manage your menu, prices, and badges (Chef, Takeaway).", es: "Gestione su carta, precios y badges (Chef, Para Llevar).", it: "Gestisci il tuo menu, prezzi e badge (Chef, Asporto)." })}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <AdminSortDropdown sortBy={menuSortBy} onChange={setMenuSortBy} t={t} />
                    <button onClick={() => setIsAddingItem(true)} className="px-6 py-3 text-xs tracking-widest uppercase bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                      + {t({ fr: "Ajouter un Plat", en: "Add Dish", es: "Añadir un Plato", it: "Aggiungi un Piatto" })}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedMenuItems.map(item => (
                    <div key={item.id} className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden group hover:border-white/20 transition-colors">
                      {item.image_url && (
                        <div className="h-48 relative overflow-hidden bg-black/50">
                          <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
                          
                          <div className="absolute top-3 left-3 flex flex-col gap-2">
                            <span className={`px-2 py-1 rounded text-[0.6rem] uppercase tracking-widest font-semibold backdrop-blur-md ${item.available ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                              {item.available ? "DISPO" : "RUPTURE"}
                            </span>
                            {item.has_allergens && (
                              <span className="px-2 py-1 rounded text-[0.6rem] uppercase tracking-widest font-semibold backdrop-blur-md bg-amber-500/20 text-amber-300 border border-amber-500/30 w-fit">
                                ⚠️ ALLERG.
                              </span>
                            )}
                          </div>
                          <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                            {item.chef_suggestion && (
                              <span className="px-2 py-1 rounded text-[0.6rem] uppercase tracking-widest font-semibold backdrop-blur-md bg-[#F3CDA0]/20 text-[#F3CDA0] border border-[#F3CDA0]/30 shadow-[0_0_10px_rgba(243,205,160,0.2)]">
                                👨‍🍳 CHEF
                              </span>
                            )}
                            {item.takeaway_available && (
                              <span className="px-2 py-1 rounded text-[0.6rem] uppercase tracking-widest font-semibold backdrop-blur-md bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                                🛍️ EMPORTER
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-lg text-white/90 truncate pr-2">{item.name}</h3>
                          <span className="text-[#D4AF37] font-mono">€{Number(item.price).toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-3">{getCategoryLabel(item.category)}</p>
                        
                        <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                          <button onClick={() => setEditingItem(item)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded text-xs tracking-widest uppercase transition-colors">
                            {t({ fr: "Modifier", en: "Edit", es: "Editar", it: "Modifica" })}
                          </button>
                          <button onClick={() => deleteItem(item.id)} className="px-4 py-2 bg-red-500/5 hover:bg-red-500/20 text-red-500/50 hover:text-red-400 rounded transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* Modals */}
      <AnimatePresence>
        {(isAddingItem || editingItem) && (
          <MenuItemModal 
            item={editingItem} 
            onClose={() => { setIsAddingItem(false); setEditingItem(null); }} 
            onSave={handleSaveItem} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
