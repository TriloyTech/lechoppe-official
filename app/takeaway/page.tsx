"use client";

import Link from "next/link";
import { useState } from "react";
import TakeawayMenu from "@/components/takeaway/TakeawayMenu";
import TakeawayCartDrawer from "@/components/takeaway/TakeawayCartDrawer";
import { useLang } from "@/context/LangContext";
import { TakeawayCartProvider, useTakeawayCart } from "@/context/TakeawayCartContext";

const LANGUAGES = ["fr", "en", "es", "it"] as const;

function TakeawayExperience() {
  const { t, lang, setLang } = useLang(); const cart = useTakeawayCart(); const [open, setOpen] = useState(false);
  return <main className="min-h-screen bg-bg pt-6 pb-24"><header className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-5"><Link href="/" className="text-fg">← L’Échoppe</Link><div className="text-right"><h1 className="text-3xl text-fg">🥡 {t({ fr: "À emporter", en: "Takeaway", es: "Para llevar", it: "Da asporto" })}</h1><div className="mt-2 flex justify-end gap-2">{LANGUAGES.map((value) => <button key={value} onClick={() => setLang(value)} className={`text-xs uppercase ${lang === value ? "text-fg" : "text-fg/40"}`}>{value}</button>)}</div></div></header><TakeawayMenu onAdd={(item, customization) => cart.add(item, customization)} />{cart.count > 0 ? <button onClick={() => setOpen(true)} className="fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 justify-between rounded-2xl bg-fg p-4 text-bg"><span>{cart.count} {t({ fr: "article(s)", en: "item(s)", es: "artículo(s)", it: "articolo/i" })}</span><strong>{cart.total.toFixed(2)} €</strong></button> : null}<TakeawayCartDrawer open={open} onClose={() => setOpen(false)} /></main>;
}

export default function TakeawayPage() { return <TakeawayCartProvider><TakeawayExperience /></TakeawayCartProvider>; }
