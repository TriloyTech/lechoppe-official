// lib/hooks/useCategories.ts
// Fetches custom categories from site_settings, falls back to static list.
"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/postgres/client";

export interface Category {
  key: string;
  emoji: string;
  fr: string;
  en: string;
  es: string;
  it: string;
  is_active: boolean;
  display_order: number;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { key: "burger", emoji: "🍔", fr: "Burgers & Plats", en: "Burgers & Mains", es: "Hamburguesas y platos", it: "Burger e piatti", is_active: true, display_order: 0 },
  { key: "side", emoji: "🥗", fr: "Entrées & Accompagnements", en: "Starters & Sides", es: "Entrantes y guarniciones", it: "Antipasti e contorni", is_active: true, display_order: 1 },
  { key: "dessert", emoji: "🍮", fr: "Desserts", en: "Desserts", es: "Postres", it: "Dolci", is_active: true, display_order: 2 },
  { key: "drink", emoji: "🥂", fr: "Boissons", en: "Drinks", es: "Bebidas", it: "Bevande", is_active: true, display_order: 3 },
];

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const db = createClient();
      const { data } = await db
        .from("site_settings")
        .select("value")
        .eq("key", "categories")
        .maybeSingle();
      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        setCategories((data.value as Partial<Category>[]).map((category, index) => ({
          key: category.key ?? `category_${index}`,
          emoji: category.emoji ?? "🍽️",
          fr: category.fr ?? "",
          en: category.en ?? category.fr ?? "",
          es: category.es ?? category.en ?? category.fr ?? "",
          it: category.it ?? category.en ?? category.fr ?? "",
          is_active: category.is_active ?? true,
          display_order: category.display_order ?? index,
        })).sort((a, b) => a.display_order - b.display_order));
      }
    } catch {
      // silently fall back to defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const saveCategories = async (cats: Category[]) => {
    const db = createClient();
    await db
      .from("site_settings")
      .upsert({ key: "categories", value: cats }, { onConflict: "key" });
    setCategories(cats);
  };

  return { categories, loading, saveCategories, refetch: fetch };
}
