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
  const target = Math.max(0, Math.min(subtotalCents, finalCents));
  const weighted = entries.map((entry, index) => ({ entry, index, weight: toCents(entry.base_ht) + toCents(entry.vat_amount) }));
  const totalWeight = weighted.reduce((sum, value) => sum + value.weight, 0);
  if (target === 0 || totalWeight === 0) return [];
  const allocated = weighted.map((value) => {
    const numerator = BigInt(value.weight) * BigInt(target);
    return { ...value, cents: Number(numerator / BigInt(totalWeight)), remainder: numerator % BigInt(totalWeight) };
  });
  let residual = target - allocated.reduce((sum, value) => sum + value.cents, 0);
  for (const value of [...allocated].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1)) {
    if (residual-- <= 0) break;
    value.cents += 1;
  }
  return allocated.map(({ entry, cents }) => {
    const baseCents = Math.round(cents * 10_000 / (10_000 + Math.round(entry.rate * 100)));
    return { rate: entry.rate, base_ht: fromCents(baseCents), vat_amount: fromCents(cents - baseCents) };
  }).filter((entry) => entry.base_ht !== 0 || entry.vat_amount !== 0);
}
