// lib/hooks/useSiteContent.ts
// Fetches editable site content from site_settings, falls back to static defaults.
"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SiteContent {
  tagline_fr: string;
  tagline_en: string;
  address: string;
  phone: string;
  opening_hours: string; // JSON string of { day: string, hours: string }[]
  privacy_policy: string;
  terms_conditions: string;
  legal_notice: string;
  story_headline_fr: string;
  story_headline_en: string;
  story_text_fr: string;
  story_text_en: string;
  story_pillars: string; // JSON string of { number, title_fr, title_en, body_fr, body_en }[]

  // ── Hero Section ──────────────────────────────────────────────────────────
  hero_eyebrow: string;          // "RESTAURANT BISTRONOMY · PARIS"
  hero_title_line1: string;      // "L'ÉCHOPPE"
  hero_title_line2_fr: string;   // "DE PARIS" (green line)
  hero_title_line2_en: string;
  hero_scroll_hint_fr: string;   // "Défiler pour découvrir"
  hero_scroll_hint_en: string;

  // Slide 2 – Philosophy
  hero_s2_label_fr: string;
  hero_s2_label_en: string;
  hero_s2_title_fr: string;
  hero_s2_title_en: string;
  hero_s2_accent_fr: string;
  hero_s2_accent_en: string;

  // Slide 3 – Product
  hero_s3_title_fr: string;
  hero_s3_title_en: string;
  hero_s3_accent_fr: string;
  hero_s3_accent_en: string;
  hero_s3_body_fr: string;
  hero_s3_body_en: string;

  // Slide 4 – CTA
  hero_s4_label_fr: string;
  hero_s4_label_en: string;
  hero_s4_title_fr: string;
  hero_s4_title_en: string;
  hero_s4_accent_fr: string;
  hero_s4_accent_en: string;
  hero_s4_cta_fr: string;
  hero_s4_cta_en: string;
  hero_s4_note_fr: string;
  hero_s4_note_en: string;
}

export const DEFAULT_CONTENT: SiteContent = {
  tagline_fr:    "Bistronomy parisienne depuis 2014",
  tagline_en:    "Parisian bistronomy since 2014",
  address:       "16 Rue Léon Frot, 75011 Paris",
  phone:         "+33 1 53 27 95 39",
  opening_hours: JSON.stringify([
    { day: "Lundi",    day_en: "Monday",    hours: "12:00 – 14:30 / 19:00 – 22:30" },
    { day: "Mardi",    day_en: "Tuesday",   hours: "12:00 – 14:30 / 19:00 – 22:30" },
    { day: "Mercredi", day_en: "Wednesday", hours: "12:00 – 14:30 / 19:00 – 22:30" },
    { day: "Jeudi",    day_en: "Thursday",  hours: "12:00 – 14:30 / 19:00 – 22:30" },
    { day: "Vendredi", day_en: "Friday",    hours: "12:00 – 15:00 / 19:00 – 23:00" },
    { day: "Samedi",   day_en: "Saturday",  hours: "12:00 – 15:00 / 19:00 – 23:00" },
    { day: "Dimanche", day_en: "Sunday",    hours: "Fermé" },
  ]),
  privacy_policy: "",
  terms_conditions: "",
  legal_notice: "",
  story_headline_fr: "Né à Paris,\nFait pour tous.",
  story_headline_en: "Born in Paris,\nMade for Everyone.",
  story_text_fr: "L'Échoppe de Paris est née d'une simple obsession : créer le burger le plus honnête et le plus délicieux de France. Pas une tendance. Un engagement. Nous avons ouvert notre premier comptoir dans le Marais en 2014, et nous n'avons cessé de le perfectionner depuis.",
  story_text_en: "L'Échoppe de Paris was born from a simple obsession: to build the most honest, most delicious burger in France. Not a trend. A commitment. We opened our first counter in the Marais in 2014, and we haven't stopped perfecting it since.",
  story_pillars: JSON.stringify([
    {
      number: "01",
      title_fr: "Le Terroir",
      title_en: "Le Terroir",
      body_fr: "Nous nous approvisionnons exclusivement auprès de fermes familiales françaises situées à moins de 200 km de Paris. Chaque ingrédient a son histoire, de la farine de brioche moulue à l'aube au Wagyu maturé 28 jours.",
      body_en: "We source exclusively from French family farms within 200km of Paris. Every ingredient carries its story — from the brioche flour milled at dawn to the 28-day dry-aged Wagyu."
    },
    {
      number: "02",
      title_fr: "L'Artisanat",
      title_en: "L'Artisanat",
      body_fr: "Notre cuisine ouvre à 5 heures du matin. Les pains sont cuits le jour même. Les sauces montées à la main. Pas de raccourcis pré-emballés. Seulement le rituel silencieux de l'artisanat, répété chaque jour.",
      body_en: "Our kitchen opens at 5 AM. Buns baked fresh. Sauces folded by hand. No pre-packaged shortcuts. Only the quiet ritual of craft, repeated every day."
    },
    {
      number: "03",
      title_fr: "Le Bistro",
      title_en: "Le Bistro",
      body_fr: "L'Échoppe est un bistrot parisien dans l'âme - généreux, sans prétention, vivant. Un comptoir de quartier où se côtoient bonne bouffe et grandes conversations.",
      body_en: "L'Échoppe is a Parisian bistro at its soul — generous, unpretentious, alive. A neighbourhood counter where great food and great conversation coexist."
    }
  ], null, 2),

  // ── Hero defaults (match current hardcoded values) ────────────────────────
  hero_eyebrow:        "Restaurant Bistronomy · Paris",
  hero_title_line1:    "L'ÉCHOPPE",
  hero_title_line2_fr: "DE PARIS",
  hero_title_line2_en: "DE PARIS",
  hero_scroll_hint_fr: "Défiler pour découvrir",
  hero_scroll_hint_en: "Scroll to discover",

  hero_s2_label_fr:  "Notre Philosophie",
  hero_s2_label_en:  "Our Philosophy",
  hero_s2_title_fr:  "Gastronomie",
  hero_s2_title_en:  "Precision",
  hero_s2_accent_fr: "Précise",
  hero_s2_accent_en: "Gastronomy",

  hero_s3_title_fr:  "Wagyu",
  hero_s3_title_en:  "Wagyu",
  hero_s3_accent_fr: "Perfection",
  hero_s3_accent_en: "Perfection",
  hero_s3_body_fr:   "Bœuf Wagyu français 100%, maturé 28 jours.",
  hero_s3_body_en:   "100% French Wagyu beef, dry-aged 28 days.",

  hero_s4_label_fr:  "L'Expérience Ultime",
  hero_s4_label_en:  "The Final Experience",
  hero_s4_title_fr:  "Goûtez la",
  hero_s4_title_en:  "Taste the",
  hero_s4_accent_fr: "Légende",
  hero_s4_accent_en: "Legend",
  hero_s4_cta_fr:    "Réserver",
  hero_s4_cta_en:    "Book Now",
  hero_s4_note_fr:   "Réservation en ligne · Ouvert 7j/7",
  hero_s4_note_en:   "Online reservations · Open 7 days",
};

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_content"]);

      if (data?.length) {
        const row = data.find((d) => d.key === "site_content");
        if (row?.value && typeof row.value === "object") {
          setContent({ ...DEFAULT_CONTENT, ...(row.value as Partial<SiteContent>) });
        }
      }
    } catch {
      // fall back to defaults silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const saveContent = async (c: SiteContent) => {
    const supabase = createClient();
    await supabase
      .from("site_settings")
      .upsert({ key: "site_content", value: c }, { onConflict: "key" });
    setContent(c);
  };

  return { content, loading, saveContent, refetch: fetch };
}
