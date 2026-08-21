"use client";

import Link from "next/link";
import TakeawayMenu from "@/components/takeaway/TakeawayMenu";
import { useLang } from "@/context/LangContext";
import { useState } from "react";
import { TakeawayCartProvider, useTakeawayCart } from "@/context/TakeawayCartContext";
import TakeawayCartDrawer from "@/components/takeaway/TakeawayCartDrawer";

function TakeawayExperience() { const { t } = useLang(); const cart = useTakeawayCart(); const [open, setOpen] = useState(false); return <main className="min-h-screen bg-bg pt-6 pb-24"><header className="mx-auto flex max-w-6xl items-center justify-between p-5"><Link href="/" className="text-fg">← L’Échoppe</Link><h1 className="text-3xl text-fg">🥡 {t({ fr: "À emporter", en: "Takeaway", es: "Para llevar", it: "Da asporto" })}</h1></header><TakeawayMenu onAdd={(item, customization) => cart.add(item, customization)} />{cart.count > 0 ? <button onClick={() => setOpen(true)} className="fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 justify-between rounded-2xl bg-fg p-4 text-bg"><span>{cart.count} {t({ fr: "article(s)", en: "item(s)", es: "artículo(s)", it: "articolo/i" })}</span><strong>{cart.total.toFixed(2)} €</strong></button> : null}<TakeawayCartDrawer open={open} onClose={() => setOpen(false)} /></main>; }
export default function TakeawayPage() { return <TakeawayCartProvider><TakeawayExperience /></TakeawayCartProvider>; }
