"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Lang = "fr" | "en" | "es" | "it";

export const LANG_LABELS: Record<Lang, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  it: "Italiano",
};

export const LANG_FLAGS: Record<Lang, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  es: "🇪🇸",
  it: "🇮🇹",
};

type Translations = { fr: string; en: string; es?: string; it?: string };

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: {
    (translations: Translations): string;
    (fr: string, en: string): string;
  };
}

const LANG_ORDER: Lang[] = ["fr", "en", "es", "it"];

const Ctx = createContext<LangCtx>({
  lang: "fr",
  setLang: () => {},
  toggle: () => {},
  t: ((a: any, b?: any) => (typeof a === "string" ? a : a.fr)) as any,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const toggle = useCallback(
    () =>
      setLangState((prev) => {
        const idx = LANG_ORDER.indexOf(prev);
        return LANG_ORDER[(idx + 1) % LANG_ORDER.length];
      }),
    []
  );

  const t = useCallback(
    (frOrObj: string | Translations, en?: string): string => {
      // Legacy overload: t("french", "english")
      if (typeof frOrObj === "string") {
        const translations: Translations = { fr: frOrObj, en: en! };
        return translations[lang] ?? translations.en ?? translations.fr;
      }
      // New overload: t({ fr, en, es, it })
      return frOrObj[lang] ?? frOrObj.en ?? frOrObj.fr;
    },
    [lang]
  ) as LangCtx["t"];

  return (
    <Ctx.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </Ctx.Provider>
  );
}

export const useLang = () => useContext(Ctx);
