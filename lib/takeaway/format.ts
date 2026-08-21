import type { Lang } from "@/context/LangContext";

const LOCALES: Record<Lang, string> = { fr: "fr-FR", en: "en-GB", es: "es-ES", it: "it-IT" };
export function formatEuro(value: number, lang: Lang) { return new Intl.NumberFormat(LOCALES[lang], { style: "currency", currency: "EUR" }).format(value); }
