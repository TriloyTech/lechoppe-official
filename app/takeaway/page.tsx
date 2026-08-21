"use client";

import Link from "next/link";
import TakeawayMenu from "@/components/takeaway/TakeawayMenu";
import { useLang } from "@/context/LangContext";

export default function TakeawayPage() { const { t } = useLang(); return <main className="min-h-screen bg-bg pt-6"><header className="mx-auto flex max-w-6xl items-center justify-between p-5"><Link href="/" className="text-fg">← L’Échoppe</Link><h1 className="text-3xl text-fg">🥡 {t({ fr: "À emporter", en: "Takeaway", es: "Para llevar", it: "Da asporto" })}</h1></header><TakeawayMenu /></main>; }
