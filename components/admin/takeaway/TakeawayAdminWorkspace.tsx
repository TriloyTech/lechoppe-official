"use client";

import { useState } from "react";
import { useLang } from "@/context/LangContext";
import TakeawayOrdersPanel from "./TakeawayOrdersPanel";
import TakeawaySettingsPanel from "./TakeawaySettingsPanel";
import TakeawayMenuManager from "./TakeawayMenuManager";
import TakeawayOptionGroupsManager from "./TakeawayOptionGroupsManager";

type View = "orders" | "menu" | "options" | "settings";

export default function TakeawayAdminWorkspace() {
  const { t } = useLang(); const [view, setView] = useState<View>("orders");
  const views: { key: View; label: string; note: string }[] = [
    { key: "orders", label: t({ fr: "Commandes", en: "Orders", es: "Pedidos", it: "Ordini" }), note: t({ fr: "File active", en: "Live queue", es: "Cola activa", it: "Coda attiva" }) },
    { key: "menu", label: t({ fr: "Disponibilité", en: "Menu availability", es: "Disponibilidad", it: "Disponibilità" }), note: t({ fr: "TVA et vente", en: "VAT & selling", es: "IVA y venta", it: "IVA e vendita" }) },
    { key: "options", label: t({ fr: "Options", en: "Option groups", es: "Opciones", it: "Opzioni" }), note: t({ fr: "Choix et prix", en: "Choices & prices", es: "Opciones y precios", it: "Scelte e prezzi" }) },
    { key: "settings", label: t({ fr: "Paramètres", en: "Settings", es: "Ajustes", it: "Impostazioni" }), note: t({ fr: "Service et horaires", en: "Service & hours", es: "Servicio y horarios", it: "Servizio e orari" }) },
  ];
  return <div className="space-y-6"><header className="rounded-2xl border border-white/10 bg-white/[.035] p-6"><p className="text-[.62rem] font-semibold uppercase tracking-[.24em] text-[#7CB895]">L’ÉCHOPPE · TAKEAWAY</p><div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h1 className="text-3xl font-semibold text-white">{t({ fr: "Centre opérationnel", en: "Operations centre", es: "Centro de operaciones", it: "Centro operativo" })}</h1><p className="mt-1 text-sm text-white/45">{t({ fr: "Gérez le service, la carte et les commandes sans quitter le flux.", en: "Manage service, menu, and orders without losing operational context.", es: "Gestiona servicio, carta y pedidos sin perder el contexto.", it: "Gestisci servizio, menu e ordini senza perdere il contesto." })}</p></div><span className="w-fit rounded-full border border-[#7CB895]/25 bg-[#7CB895]/10 px-3 py-1.5 text-xs text-[#9dd4b5]">{t({ fr: "Paiement sur place", en: "Onsite payment only", es: "Pago en el local", it: "Pagamento sul posto" })}</span></div><nav className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{views.map((item) => <button key={item.key} onClick={() => setView(item.key)} className={`rounded-xl border px-4 py-3 text-left transition ${view === item.key ? "border-[#7CB895]/50 bg-[#7CB895]/10" : "border-white/8 bg-black/20 hover:border-white/15"}`}><strong className={view === item.key ? "text-[#9dd4b5]" : "text-white/80"}>{item.label}</strong><small className="mt-1 block text-white/35">{item.note}</small></button>)}</nav></header>{view === "orders" ? <TakeawayOrdersPanel /> : view === "menu" ? <TakeawayMenuManager /> : view === "options" ? <TakeawayOptionGroupsManager /> : <TakeawaySettingsPanel />}</div>;
}
