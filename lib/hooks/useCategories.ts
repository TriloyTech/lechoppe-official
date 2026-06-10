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
}

export const DEFAULT_CATEGORIES: Category[] = [
  { key: "burger",  emoji: "🍔", fr: "Burgers & Plats",         en: "Burgers & Mains" },
  { key: "side",    emoji: "🥗", fr: "Entrées & Accompagnements", en: "Starters & Sides" },
  { key: "dessert", emoji: "🍮", fr: "Desserts",                 en: "Desserts" },
  { key: "drink",   emoji: "🥂", fr: "Boissons",                en: "Drinks" },
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
        setCategories(data.value as Category[]);
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
