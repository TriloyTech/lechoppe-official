"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/postgres/client";
import { useLang } from "@/context/LangContext";
import type { LocalizedText, TakeawayOptionChoice, TakeawayOptionGroup } from "@/lib/takeaway/types";

const LANGUAGES = ["fr", "en", "es", "it"] as const;
const emptyNames = (): LocalizedText => ({ fr: "", en: "", es: "", it: "" });

export default function TakeawayOptionGroupsManager() {
  const { t, lang } = useLang();
  const [groups, setGroups] = useState<TakeawayOptionGroup[]>([]);
  const [choices, setChoices] = useState<TakeawayOptionChoice[]>([]);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newNames, setNewNames] = useState(emptyNames);

  const load = useCallback(async () => {
    const db = createClient();
    const [groupResult, choiceResult] = await Promise.all([
      db.from("takeaway_option_groups").select("*").order("display_order"),
      db.from("takeaway_option_choices").select("*").order("display_order"),
    ]);
    setGroups(groupResult.data ?? []); setChoices(choiceResult.data ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const error = (text: string) => setNotice({ kind: "error", text });
  const saved = () => setNotice({ kind: "success", text: t({ fr: "Modifications enregistrées.", en: "Changes saved.", es: "Cambios guardados.", it: "Modifiche salvate." }) });
  const validNames = (names: LocalizedText) => LANGUAGES.every((language) => names[language].trim().length > 0);

  const createGroup = async () => {
    if (!newKey.trim() || !validNames(newNames)) return error(t({ fr: "Renseignez la clé et les quatre traductions.", en: "Enter the key and all four translations.", es: "Introduzca la clave y las cuatro traducciones.", it: "Inserisci la chiave e tutte e quattro le traduzioni." }));
    const result = await createClient().from("takeaway_option_groups").insert({ key: newKey.trim(), name: newNames, selection_type: "single", is_required: false, min_selections: 0, max_selections: 1, is_active: true, display_order: groups.length });
    if (result.error) return error(result.error.message);
    setNewKey(""); setNewNames(emptyNames()); saved(); await load();
  };

  const updateGroupDraft = (id: string, patch: Partial<TakeawayOptionGroup>) => setGroups((current) => current.map((group) => {
    if (group.id !== id) return group;
    const next = { ...group, ...patch };
    if (next.selection_type === "single") { next.max_selections = 1; next.min_selections = Math.min(next.min_selections, 1); }
    next.is_required = next.min_selections > 0;
    return next;
  }));

  const saveGroup = async (group: TakeawayOptionGroup) => {
    if (!validNames(group.name)) return error(t({ fr: "Les quatre traductions du groupe sont obligatoires.", en: "All four group translations are required.", es: "Las cuatro traducciones del grupo son obligatorias.", it: "Sono richieste tutte e quattro le traduzioni del gruppo." }));
    if (!Number.isInteger(group.min_selections) || !Number.isInteger(group.max_selections) || group.min_selections < 0 || group.max_selections < 1 || group.min_selections > group.max_selections || (group.selection_type === "single" && group.max_selections !== 1) || !Number.isInteger(group.display_order) || group.display_order < 0) return error(t({ fr: "Vérifiez les limites de sélection et l’ordre.", en: "Check selection limits and display order.", es: "Revise los límites de selección y el orden.", it: "Controlla i limiti di selezione e l’ordine." }));
    const result = await createClient().from("takeaway_option_groups").update({ name: group.name, selection_type: group.selection_type, is_required: group.min_selections > 0, min_selections: group.min_selections, max_selections: group.max_selections, is_active: group.is_active, display_order: group.display_order }).eq("id", group.id);
    if (result.error) return error(result.error.message); if (!result.data?.length) return error(t({ fr: "Ce groupe n’existe plus. Rechargez la liste.", en: "This group no longer exists. Reload the list.", es: "Este grupo ya no existe. Recargue la lista.", it: "Questo gruppo non esiste più. Ricarica l’elenco." })); setGroups((current) => current.map((value) => value.id === group.id ? result.data[0] : value)); saved();
  };

  const addChoice = async (group: TakeawayOptionGroup) => {
    const result = await createClient().from("takeaway_option_choices").insert({ group_id: group.id, name: { fr: "Nouveau choix", en: "New choice", es: "Nueva opción", it: "Nuova scelta" }, price_modifier: 0, vat_rate_override: null, is_available: true, is_default: false, display_order: choices.filter((choice) => choice.group_id === group.id).length });
    if (result.error) return error(result.error.message); await load();
  };
  const updateChoiceDraft = (id: string, patch: Partial<TakeawayOptionChoice>) => setChoices((current) => current.map((choice) => choice.id === id ? { ...choice, ...patch } : choice));
  const saveChoice = async (choice: TakeawayOptionChoice) => {
    if (!validNames(choice.name)) return error(t({ fr: "Les quatre traductions du choix sont obligatoires.", en: "All four choice translations are required.", es: "Las cuatro traducciones de la opción son obligatorias.", it: "Sono richieste tutte e quattro le traduzioni della scelta." }));
    if (!Number.isFinite(choice.price_modifier) || (choice.vat_rate_override !== null && (!Number.isFinite(choice.vat_rate_override) || choice.vat_rate_override < 0 || choice.vat_rate_override > 99.99)) || !Number.isInteger(choice.display_order) || choice.display_order < 0) return error(t({ fr: "Vérifiez le prix, la TVA et l’ordre.", en: "Check price, VAT, and display order.", es: "Revise el precio, el IVA y el orden.", it: "Controlla prezzo, IVA e ordine." }));
    const result = await createClient().from("takeaway_option_choices").update({ name: choice.name, price_modifier: choice.price_modifier, vat_rate_override: choice.vat_rate_override, is_available: choice.is_available, is_default: choice.is_default, display_order: choice.display_order }).eq("id", choice.id);
    if (result.error) return error(result.error.message); if (!result.data?.length) return error(t({ fr: "Ce choix n’existe plus. Rechargez la liste.", en: "This choice no longer exists. Reload the list.", es: "Esta opción ya no existe. Recargue la lista.", it: "Questa scelta non esiste più. Ricarica l’elenco." })); setChoices((current) => current.map((value) => value.id === choice.id ? result.data[0] : value)); saved();
  };
  const removeGroup = async (group: TakeawayOptionGroup) => { if (!confirm(t({ fr: "Supprimer ce groupe et ses choix ?", en: "Delete this group and its choices?", es: "¿Eliminar este grupo y sus opciones?", it: "Eliminare il gruppo e le scelte?" }))) return; const result = await createClient().from("takeaway_option_groups").delete().eq("id", group.id); if (result.error) return error(result.error.message); await load(); };
  const removeChoice = async (id: string) => { const result = await createClient().from("takeaway_option_choices").delete().eq("id", id); if (result.error) return error(result.error.message); await load(); };

  return <section className="rounded-2xl border border-theme bg-surface p-5">
    <h2 className="text-2xl text-fg">{t({ fr: "Groupes d’options", en: "Option groups", es: "Grupos de opciones", it: "Gruppi di opzioni" })}</h2>
    <div className="mt-3 rounded-xl border border-theme bg-bg p-3"><input value={newKey} onChange={(event) => setNewKey(event.target.value)} placeholder={t({ fr: "Clé stable", en: "Stable key", es: "Clave estable", it: "Chiave stabile" })} className="w-full rounded border border-theme bg-surface p-2 text-fg" /><div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">{LANGUAGES.map((language) => <input key={language} value={newNames[language]} onChange={(event) => setNewNames((value) => ({ ...value, [language]: event.target.value }))} placeholder={`${language.toUpperCase()} · ${t({ fr: "Nom", en: "Name", es: "Nombre", it: "Nome" })}`} className="rounded border border-theme bg-surface p-2 text-fg" />)}</div><button onClick={() => void createGroup()} className="mt-2 rounded bg-fg px-4 py-2 text-bg">+ {t({ fr: "Créer le groupe", en: "Create group", es: "Crear grupo", it: "Crea gruppo" })}</button></div>
    {notice ? <p className={`mt-2 text-sm ${notice.kind === "error" ? "text-red-400" : "text-green-500"}`}>{notice.text}</p> : null}
    <div className="mt-4 space-y-4">{groups.map((group) => <article key={group.id} className="space-y-3 rounded-xl border border-theme bg-bg p-4">
      <div className="grid gap-2 md:grid-cols-7"><strong className="p-2 text-fg">{group.key}</strong><select className="rounded border border-theme bg-surface p-2 text-fg" value={group.selection_type} onChange={(event) => updateGroupDraft(group.id, { selection_type: event.target.value as "single" | "multiple" })}><option value="single">{t({ fr: "Choix unique", en: "Single choice", es: "Elección única", it: "Scelta singola" })}</option><option value="multiple">{t({ fr: "Choix multiple", en: "Multiple choice", es: "Elección múltiple", it: "Scelta multipla" })}</option></select><input aria-label="min" type="number" min="0" className="rounded border border-theme bg-surface p-2 text-fg" value={group.min_selections} onChange={(event) => updateGroupDraft(group.id, { min_selections: Number(event.target.value) })} /><input aria-label="max" type="number" min="1" disabled={group.selection_type === "single"} className="rounded border border-theme bg-surface p-2 text-fg" value={group.max_selections} onChange={(event) => updateGroupDraft(group.id, { max_selections: Number(event.target.value) })} /><input aria-label="order" type="number" min="0" className="rounded border border-theme bg-surface p-2 text-fg" value={group.display_order} onChange={(event) => updateGroupDraft(group.id, { display_order: Number(event.target.value) })} /><label className="p-2 text-sm text-fg"><input className="mr-1" type="checkbox" checked={group.is_active} onChange={(event) => updateGroupDraft(group.id, { is_active: event.target.checked })} />{t({ fr: "Actif", en: "Active", es: "Activo", it: "Attivo" })}</label><button className="text-red-400" onClick={() => void removeGroup(group)}>×</button></div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{LANGUAGES.map((language) => <input key={language} className="rounded border border-theme bg-surface p-2 text-fg" value={group.name[language]} onChange={(event) => updateGroupDraft(group.id, { name: { ...group.name, [language]: event.target.value } })} />)}</div><button onClick={() => void saveGroup(group)} className="rounded border border-theme px-3 py-1 text-sm text-fg">{t({ fr: "Enregistrer le groupe", en: "Save group", es: "Guardar grupo", it: "Salva gruppo" })}</button>
      <div className="grid gap-2 sm:grid-cols-2">{choices.filter((choice) => choice.group_id === group.id).map((choice) => <div className="rounded-lg border border-theme p-2" key={choice.id}><div className="grid grid-cols-2 gap-1">{LANGUAGES.map((language) => <input key={language} className="rounded border border-theme bg-surface p-1 text-xs text-fg" value={choice.name[language]} onChange={(event) => updateChoiceDraft(choice.id, { name: { ...choice.name, [language]: event.target.value } })} />)}</div><div className="mt-2 grid grid-cols-3 gap-2"><label className="text-xs text-fg/60">{t({ fr: "Modificateur €", en: "Modifier €", es: "Modificador €", it: "Modificatore €" })}<input className="w-full rounded bg-surface p-1 text-fg" type="number" step=".01" value={choice.price_modifier} onChange={(event) => updateChoiceDraft(choice.id, { price_modifier: Number(event.target.value) })} /></label><label className="text-xs text-fg/60">{t({ fr: "TVA prioritaire", en: "VAT override", es: "IVA alternativo", it: "IVA alternativa" })}<input className="w-full rounded bg-surface p-1 text-fg" type="number" step=".01" min="0" max="99.99" value={choice.vat_rate_override ?? ""} onChange={(event) => updateChoiceDraft(choice.id, { vat_rate_override: event.target.value === "" ? null : Number(event.target.value) })} /></label><label className="text-xs text-fg/60">{t({ fr: "Ordre", en: "Order", es: "Orden", it: "Ordine" })}<input className="w-full rounded bg-surface p-1 text-fg" type="number" min="0" value={choice.display_order} onChange={(event) => updateChoiceDraft(choice.id, { display_order: Number(event.target.value) })} /></label></div><div className="mt-2 flex gap-4 text-xs text-fg/60"><label><input type="checkbox" checked={choice.is_available} onChange={(event) => updateChoiceDraft(choice.id, { is_available: event.target.checked })} /> {t({ fr: "Disponible", en: "Available", es: "Disponible", it: "Disponibile" })}</label><label><input type="checkbox" checked={choice.is_default} onChange={(event) => updateChoiceDraft(choice.id, { is_default: event.target.checked })} /> {t({ fr: "Par défaut", en: "Default", es: "Predeterminada", it: "Predefinita" })}</label><button className="ml-auto text-red-400" onClick={() => void removeChoice(choice.id)}>×</button></div><button onClick={() => void saveChoice(choice)} className="mt-2 rounded border border-theme px-3 py-1 text-xs text-fg">{t({ fr: "Enregistrer le choix", en: "Save choice", es: "Guardar opción", it: "Salva scelta" })}</button></div>)}</div>
      <button className="text-sm text-fg/60" onClick={() => void addChoice(group)}>+ {t({ fr: "Ajouter un choix", en: "Add choice", es: "Añadir opción", it: "Aggiungi scelta" })}</button><p className="text-xs text-fg/40">{t({ fr: "Affichage actuel", en: "Current display", es: "Visualización actual", it: "Visualizzazione attuale" })}: {group.name[lang]}</p>
    </article>)}</div>
  </section>;
}
