"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TakeawayMenu from "@/components/takeaway/TakeawayMenu";
import TakeawayCartDrawer from "@/components/takeaway/TakeawayCartDrawer";
import { useLang } from "@/context/LangContext";
import { TakeawayCartProvider, useTakeawayCart } from "@/context/TakeawayCartContext";
import { formatEuro } from "@/lib/takeaway/format";

function TakeawayExperience() {
  const { t, lang } = useLang(); const cart = useTakeawayCart(); const [open, setOpen] = useState(false); const [added, setAdded] = useState(false);
  const add = (...args: Parameters<typeof cart.add>) => { cart.add(args[0], args[1], args[2] ?? args[1].quantity); setAdded(true); window.setTimeout(() => setAdded(false), 2400); };
  return <main className="min-h-screen bg-bg"><Navbar /><TakeawayMenu onAdd={add} onOpenCart={() => setOpen(true)} cartCount={cart.count} cartTotal={cart.total} added={added} />{cart.count > 0 ? <button onClick={() => setOpen(true)} className="takeaway-mobile-cart fixed bottom-4 left-4 right-4 z-40 flex min-h-14 items-center justify-between rounded-2xl bg-[#7CB895] px-5 text-[#07140d] shadow-[0_12px_42px_rgba(0,0,0,.35)] md:hidden"><span className="font-semibold">{t({ fr: "Votre commande", en: "Your order", es: "Tu pedido", it: "Il tuo ordine" })} · {cart.count}</span><strong>{formatEuro(cart.total, lang)}</strong></button> : null}<TakeawayCartDrawer open={open} onClose={() => setOpen(false)} /><Footer /></main>;
}
export default function TakeawayPage() { return <TakeawayCartProvider><TakeawayExperience /></TakeawayCartProvider>; }
