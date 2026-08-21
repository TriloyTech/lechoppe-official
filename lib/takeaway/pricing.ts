import type { VatBreakdown } from "./types";

export const toCents = (value: number | string) => Math.round(Number(value) * 100);
export const fromCents = (value: number) => Number((value / 100).toFixed(2));

export interface PriceComponent { cents: number; vatRate: number }

export function calculateUnitPrice(basePrice: number | string, modifiers: (number | string)[]) {
  return Math.max(0, toCents(basePrice) + modifiers.reduce<number>((sum, value) => sum + toCents(value), 0));
}

export function calculateVatBreakdown(components: PriceComponent[], quantity: number, finalUnitCents: number): VatBreakdown[] {
  if (finalUnitCents === 0) return [];
  const byRate = new Map<number, number>();
  for (const component of components) byRate.set(component.vatRate, (byRate.get(component.vatRate) ?? 0) + component.cents * quantity);
  return [...byRate].map(([rate, ttcCents]) => {
    const baseCents = Math.round(ttcCents / (1 + rate / 100));
    return { rate, base_ht: fromCents(baseCents), vat_amount: fromCents(ttcCents - baseCents) };
  }).filter((entry) => entry.base_ht !== 0 || entry.vat_amount !== 0);
}

export function mergeVatBreakdowns(entries: VatBreakdown[]) {
  const totals = new Map<number, { base: number; vat: number }>();
  for (const entry of entries) { const current = totals.get(entry.rate) ?? { base: 0, vat: 0 }; current.base += toCents(entry.base_ht); current.vat += toCents(entry.vat_amount); totals.set(entry.rate, current); }
  return [...totals].map(([rate, value]) => ({ rate, base_ht: fromCents(value.base), vat_amount: fromCents(value.vat) }));
}

export function applyDiscountToVatBreakdown(entries: VatBreakdown[], subtotalCents: number, finalCents: number) {
  if (subtotalCents <= 0 || finalCents === subtotalCents) return entries;
  const ratio = finalCents / subtotalCents;
  return entries.map((entry) => ({ rate: entry.rate, base_ht: fromCents(Math.round(toCents(entry.base_ht) * ratio)), vat_amount: fromCents(Math.round(toCents(entry.vat_amount) * ratio)) }));
}
