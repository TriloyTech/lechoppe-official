"use client";

import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/context/LangContext";
import { createClient } from "@/lib/postgres/client";
import type { MenuItem } from "@/lib/postgres/types";
import type { TakeawayOptionGroup } from "@/lib/takeaway/types";

type GroupLink = { item_id: string; group_id: string; display_order: number };
type MenuView = "takeaway" | "add";
type Translate = ReturnType<typeof useLang>["t"];

export default function TakeawayMenuManager() {
  const { t, lang } = useLang();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [groups, setGroups] = useState<TakeawayOptionGroup[]>([]);
  const [links, setLinks] = useState<GroupLink[]>([]);
  const [view, setView] = useState<MenuView>("takeaway");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const db = createClient();
    const [itemsResult, groupsResult, linksResult] = await Promise.all([
      db.from("menu_items").select("*").order("display_order"),
      db.from("takeaway_option_groups").select("*").order("display_order"),
      db.from("menu_item_option_groups").select("*").order("display_order"),
    ]);
    if (itemsResult.error || groupsResult.error || linksResult.error) {
      setMessage(itemsResult.error?.message || groupsResult.error?.message || linksResult.error?.message || t({ fr: "Chargement impossible.", en: "Could not load the catalog.", es: "No se pudo cargar el catálogo.", it: "Impossibile caricare il catalogo." }));
    }
    setItems(itemsResult.data ?? []);
    setGroups(groupsResult.data ?? []);
    setLinks(linksResult.data ?? []);
    setLoading(false);
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const update = async (item: MenuItem, values: Partial<MenuItem>) => {
    const { error } = await createClient().from("menu_items").update(values).eq("id", item.id);
    setMessage(error?.message ?? "");
    await load();
  };

  const toggleLink = async (itemId: string, groupId: string) => {
    const db = createClient();
    const existing = links.find((link) => link.item_id === itemId && link.group_id === groupId);
    if (existing) await db.from("menu_item_option_groups").delete().eq("item_id", itemId).eq("group_id", groupId);
    else await db.from("menu_item_option_groups").insert({ item_id: itemId, group_id: groupId, display_order: links.filter((link) => link.item_id === itemId).length });
    await load();
  };

  const orderLink = async (itemId: string, groupId: string, displayOrder: number) => {
    await createClient().from("menu_item_option_groups").update({ display_order: Math.max(0, displayOrder) }).eq("item_id", itemId).eq("group_id", groupId);
    await load();
  };

  const takeawayItems = items.filter((item) => item.takeaway_available);
  const candidateItems = items.filter((item) => !item.takeaway_available);
  const visibleItems = view === "takeaway" ? takeawayItems : candidateItems;
  const count = takeawayItems.length;
  const countLabel = t({
    fr: `${count} article${count === 1 ? "" : "s"} Takeaway`,
    en: `${count} Takeaway item${count === 1 ? "" : "s"}`,
    es: `${count} artículo${count === 1 ? "" : "s"} Takeaway`,
    it: `${count} articol${count === 1 ? "o" : "i"} Takeaway`,
  });

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5 md:p-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="text-xl font-semibold text-white">{t({ fr: "Disponibilité de la carte", en: "Menu availability", es: "Disponibilidad de la carta", it: "Disponibilità menu" })}</h2>
          <p className="mt-1 text-sm text-white/40">{t({ fr: "La disponibilité cuisine et l’éligibilité Takeaway restent indépendantes.", en: "Kitchen availability and Takeaway eligibility remain independent.", es: "La disponibilidad de cocina y Takeaway son independientes.", it: "Disponibilità cucina e idoneità Takeaway restano indipendenti." })}</p>
        </div>
        <span className="w-fit rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/45">{countLabel}</span>
      </header>

      <div aria-label={t({ fr: "Vues de disponibilité de la carte", en: "Menu availability views", es: "Vistas de disponibilidad de la carta", it: "Viste disponibilità menu" })} className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/20 p-1" role="tablist">
        <ViewTab active={view === "takeaway"} count={takeawayItems.length} label={t({ fr: "Carte Takeaway", en: "Takeaway menu", es: "Menú Takeaway", it: "Menu Takeaway" })} onClick={() => setView("takeaway")} />
        <ViewTab active={view === "add"} count={candidateItems.length} label={t({ fr: "Ajouter des articles", en: "Add items", es: "Añadir artículos", it: "Aggiungi articoli" })} onClick={() => setView("add")} />
      </div>

      {message ? <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300" role="alert">{message}</p> : null}
      {loading ? (
        <p className="mt-6 text-sm text-white/40">{t({ fr: "Chargement du catalogue…", en: "Loading catalog…", es: "Cargando catálogo…", it: "Caricamento catalogo…" })}</p>
      ) : (
        <div className="mt-5" role="tabpanel">
          {view === "add" ? <p className="mb-4 text-sm text-white/45">{t({ fr: "Choisissez des articles existants de la carte à proposer en Takeaway.", en: "Choose existing menu items to make available for Takeaway.", es: "Elige artículos existentes de la carta para ofrecerlos en Takeaway.", it: "Scegli gli articoli esistenti del menu da rendere disponibili per il Takeaway." })}</p> : null}
          {visibleItems.length === 0 ? (
            <EmptyState
              action={view === "takeaway" ? t({ fr: "Ajouter des articles", en: "Add items", es: "Añadir artículos", it: "Aggiungi articoli" }) : undefined}
              message={view === "takeaway" ? t({ fr: "Aucun article n’est actuellement disponible dans la carte Takeaway.", en: "No items are currently available in the Takeaway menu.", es: "Actualmente no hay artículos disponibles en el menú Takeaway.", it: "Al momento non ci sono articoli disponibili nel menu Takeaway." }) : t({ fr: "Tous les articles éligibles de la carte sont déjà dans la carte Takeaway.", en: "All eligible menu items are already in the Takeaway menu.", es: "Todos los artículos elegibles ya están en el menú Takeaway.", it: "Tutti gli articoli idonei sono già nel menu Takeaway." })}
              onAction={view === "takeaway" ? () => setView("add") : undefined}
            />
          ) : (
            <div className="space-y-3">
              {visibleItems.map((item) => view === "takeaway" ? (
                <TakeawayItemCard groups={groups} item={item} key={item.id} lang={lang} links={links} onOrderLink={orderLink} onToggleLink={toggleLink} onUpdate={update} t={t} />
              ) : (
                <CandidateItemCard item={item} key={item.id} onUpdate={update} t={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ViewTab({ active, count, label, onClick }: { active: boolean; count: number; label: string; onClick: () => void }) {
  return <button aria-selected={active} className={`min-w-0 rounded-lg px-3 py-2.5 text-sm font-medium transition sm:px-4 ${active ? "bg-white/10 text-white shadow-sm" : "text-white/45 hover:text-white/70"}`} onClick={onClick} role="tab" type="button"><span className="break-words">{label}</span><span className="ml-2 text-xs text-white/35">{count}</span></button>;
}

function Availability({ available, t }: { available: boolean; t: Translate }) {
  return <span className={`rounded-full border px-2 py-1 text-[.62rem] uppercase tracking-wider ${available ? "border-[#7CB895]/25 text-[#9dd4b5]" : "border-red-400/20 text-red-300"}`}>{available ? t({ fr: "Disponible cuisine", en: "Kitchen available", es: "Disponible en cocina", it: "Disponibile in cucina" }) : t({ fr: "Épuisé", en: "Sold out", es: "Agotado", it: "Esaurito" })}</span>;
}

function TakeawayItemCard({ groups, item, lang, links, onOrderLink, onToggleLink, onUpdate, t }: {
  groups: TakeawayOptionGroup[];
  item: MenuItem;
  lang: "fr" | "en" | "es" | "it";
  links: GroupLink[];
  onOrderLink: (itemId: string, groupId: string, order: number) => Promise<void>;
  onToggleLink: (itemId: string, groupId: string) => Promise<void>;
  onUpdate: (item: MenuItem, values: Partial<MenuItem>) => Promise<void>;
  t: Translate;
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="break-words text-white/90">{item.name}</strong><Availability available={item.available} t={t} /></div><p className="mt-1 text-xs text-white/35">{item.category}</p></div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-3 lg:w-[34rem]">
          <Field label={t({ fr: "TVA %", en: "VAT %", es: "IVA %", it: "IVA %" })}><input className="admin-input" max="99.99" min="0" onChange={(event) => void onUpdate(item, { vat_rate: event.target.value === "" ? 0 : Number(event.target.value) })} step=".01" type="number" value={item.vat_rate ?? 0} /></Field>
          <Field label={t({ fr: "Quantité max.", en: "Maximum quantity", es: "Cantidad máxima", it: "Quantità massima" })}><input className="admin-input" min="0" onChange={(event) => void onUpdate(item, { max_quantity_per_order: Number(event.target.value) })} type="number" value={item.max_quantity_per_order} /></Field>
          <Field label={t({ fr: "Ordre", en: "Display order", es: "Orden de visualización", it: "Ordine di visualizzazione" })}><input className="admin-input" min="0" onChange={(event) => void onUpdate(item, { display_order: Number(event.target.value) })} type="number" value={item.display_order} /></Field>
        </div>
      </div>
      <div className="mt-4 border-t border-white/8 pt-4">
        <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#7CB895]/35 bg-[#7CB895]/10 px-4 text-sm text-[#9dd4b5]"><input checked={item.takeaway_available} onChange={(event) => void onUpdate(item, { takeaway_available: event.target.checked })} type="checkbox" /><span>{t({ fr: "Disponible à emporter", en: "Takeaway enabled", es: "Disponible para llevar", it: "Disponibile da asporto" })}</span></label>
        {groups.length ? <fieldset className="mt-4"><legend className="text-xs uppercase tracking-wider text-white/35">{t({ fr: "Groupes d’options", en: "Option groups", es: "Grupos de opciones", it: "Gruppi di opzioni" })}</legend><div className="mt-2 flex flex-wrap gap-2">{groups.map((group) => {
          const link = links.find((value) => value.item_id === item.id && value.group_id === group.id);
          return <label className={`flex min-h-10 max-w-full items-center gap-2 rounded-lg border px-3 text-xs ${link ? "border-[#7CB895]/30 text-[#9dd4b5]" : "border-white/8 text-white/45"}`} key={group.id}><input checked={Boolean(link)} onChange={() => void onToggleLink(item.id, group.id)} type="checkbox" /><span className="break-words">{group.name[lang]}</span>{link ? <input aria-label={t({ fr: "Ordre du groupe", en: "Group order", es: "Orden del grupo", it: "Ordine del gruppo" })} className="w-12 shrink-0 rounded border border-white/10 bg-black/30 px-1 py-1 text-white" min="0" onChange={(event) => void onOrderLink(item.id, group.id, Number(event.target.value))} type="number" value={link.display_order} /> : null}</label>;
        })}</div></fieldset> : null}
      </div>
    </article>
  );
}

function CandidateItemCard({ item, onUpdate, t }: { item: MenuItem; onUpdate: (item: MenuItem, values: Partial<MenuItem>) => Promise<void>; t: Translate }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="break-words text-white/90">{item.name}</strong><Availability available={item.available} t={t} /></div><p className="mt-1 text-xs text-white/35">{item.category}</p></div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end lg:w-[30rem]">
          <Field label={t({ fr: "TVA %", en: "VAT %", es: "IVA %", it: "IVA %" })}><input aria-label={t({ fr: `TVA pour ${item.name}`, en: `VAT for ${item.name}`, es: `IVA para ${item.name}`, it: `IVA per ${item.name}` })} className="admin-input" max="99.99" min="0" onChange={(event) => void onUpdate(item, { vat_rate: event.target.value === "" ? 0 : Number(event.target.value) })} step=".01" type="number" value={item.vat_rate ?? 0} /></Field>
          <button className="min-h-10 rounded-lg border border-[#7CB895]/35 bg-[#7CB895]/10 px-4 py-2 text-sm font-medium text-[#9dd4b5] transition hover:bg-[#7CB895]/15" onClick={() => void onUpdate(item, { takeaway_available: true })} type="button">{t({ fr: "Ajouter au Takeaway", en: "Add to Takeaway", es: "Añadir a Takeaway", it: "Aggiungi al Takeaway" })}</button>
        </div>
      </div>
      <div className="mt-4 border-t border-white/8 pt-3 text-sm"><p className="text-white/50">{t({ fr: `TVA ${item.vat_rate ?? 0}%`, en: `VAT ${item.vat_rate ?? 0}%`, es: `IVA ${item.vat_rate ?? 0}%`, it: `IVA ${item.vat_rate ?? 0}%` })}</p></div>
    </article>
  );
}

function EmptyState({ action, message, onAction }: { action?: string; message: string; onAction?: () => void }) {
  return <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-5 py-10 text-center"><p className="text-sm text-white/50">{message}</p>{action && onAction ? <button className="mt-4 rounded-lg border border-[#7CB895]/35 bg-[#7CB895]/10 px-4 py-2 text-sm font-medium text-[#9dd4b5] transition hover:bg-[#7CB895]/15" onClick={onAction} type="button">{action}</button> : null}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="min-w-0 text-xs text-white/40"><span>{label}</span>{children}</label>;
}
