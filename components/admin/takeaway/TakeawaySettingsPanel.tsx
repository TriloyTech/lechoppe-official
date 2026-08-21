"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/context/LangContext";
import { DEFAULT_TAKEAWAY_SETTINGS, type PaymentMethod, type TakeawaySettings } from "@/lib/takeaway/types";

const METHODS: PaymentMethod[] = ["cash", "card", "ticket_restaurant", "other"];
const NUMBERS: { key: keyof TakeawaySettings; min?: number }[] = [
  { key: "closing_cutoff_minutes" }, { key: "prep_lead_time_minutes" }, { key: "slot_interval_minutes", min: 1 },
  { key: "advance_order_max_days" }, { key: "max_orders_per_slot" }, { key: "min_order_amount" }, { key: "max_order_amount" },
];

export default function TakeawaySettingsPanel() {
  const { t } = useLang();
  const [settings, setSettings] = useState(DEFAULT_TAKEAWAY_SETTINGS);
  const [scheduleText, setScheduleText] = useState(JSON.stringify(DEFAULT_TAKEAWAY_SETTINGS.operating_hours, null, 2));
  const [message, setMessage] = useState("");
  useEffect(() => { void fetch("/api/admin/takeaway/settings", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (d.settings) { setSettings(d.settings); setScheduleText(JSON.stringify(d.settings.operating_hours, null, 2)); } }); }, []);

  const save = async () => {
    setMessage("");
    let operating_hours: TakeawaySettings["operating_hours"];
    try { operating_hours = JSON.parse(scheduleText); } catch { setMessage(t({ fr: "Horaires JSON invalides.", en: "Invalid hours JSON.", es: "JSON de horarios no válido.", it: "JSON degli orari non valido." })); return; }
    const response = await fetch("/api/admin/takeaway/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...settings, operating_hours }) });
    const data = await response.json();
    if (response.ok) { setSettings(data.settings); setMessage(t({ fr: "Paramètres enregistrés.", en: "Settings saved.", es: "Ajustes guardados.", it: "Impostazioni salvate." })); }
    else setMessage(data.error ?? "Error");
  };

  const toggle = (key: "takeaway_enabled" | "pause_mode" | "audio_alert_enabled") => setSettings((current) => ({ ...current, [key]: !current[key] }));
  return <section className="rounded-2xl border border-theme bg-surface p-5 space-y-5">
    <div><h2 className="text-2xl text-fg">{t({ fr: "Paramètres Takeaway", en: "Takeaway settings", es: "Ajustes para llevar", it: "Impostazioni asporto" })}</h2><p className="text-sm text-fg/55">{t({ fr: "L’activation reste une décision explicite.", en: "Activation always remains an explicit decision.", es: "La activación siempre es una decisión explícita.", it: "L’attivazione resta sempre una decisione esplicita." })}</p></div>
    <div className="grid sm:grid-cols-3 gap-3">
      {(["takeaway_enabled", "pause_mode", "audio_alert_enabled"] as const).map((key) => <label key={key} className="flex gap-3 rounded-xl border border-theme p-3 text-sm text-fg"><input type="checkbox" checked={settings[key]} onChange={() => toggle(key)} />{key.replaceAll("_", " ")}</label>)}
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {NUMBERS.map(({ key, min = 0 }) => <label key={key} className="text-xs text-fg/60">{String(key).replaceAll("_", " ")}<input className="mt-1 w-full rounded-lg border border-theme bg-bg p-2 text-fg" type="number" min={min} step={String(key).includes("amount") ? ".01" : "1"} value={settings[key] as number} onChange={(e) => setSettings((current) => ({ ...current, [key]: Number(e.target.value) }))} /></label>)}
    </div>
    <fieldset><legend className="text-sm text-fg/60 mb-2">{t({ fr: "Paiements acceptés sur place", en: "Accepted onsite payments", es: "Pagos aceptados en el local", it: "Pagamenti accettati sul posto" })}</legend><div className="flex flex-wrap gap-3">{METHODS.map((method) => <label key={method} className="text-sm text-fg"><input className="mr-2" type="checkbox" checked={settings.accepted_payment_methods.includes(method)} onChange={() => setSettings((current) => ({ ...current, accepted_payment_methods: current.accepted_payment_methods.includes(method) ? current.accepted_payment_methods.filter((value) => value !== method) : [...current.accepted_payment_methods, method] }))} />{method.replace("_", " ")}</label>)}</div></fieldset>
    <label className="block text-sm text-fg/60">operating_hours (JSON)<textarea className="mt-1 min-h-40 w-full rounded-lg border border-theme bg-bg p-3 font-mono text-xs text-fg" value={scheduleText} onChange={(e) => setScheduleText(e.target.value)} /></label>
    {message ? <p className="text-sm text-fg/70">{message}</p> : null}<button onClick={save} disabled={settings.accepted_payment_methods.length === 0} className="rounded-lg bg-fg px-5 py-2 text-bg disabled:opacity-40">{t({ fr: "Enregistrer", en: "Save", es: "Guardar", it: "Salva" })}</button>
  </section>;
}
