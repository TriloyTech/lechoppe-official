export type LinkedGroupRule = { group_id: string; selection_type: "single" | "multiple"; min_selections: number; max_selections: number; is_active: boolean };
export type SelectedChoiceRule = { id: string; group_id: string; is_available: boolean; is_active: boolean };

export function validateOptionSelections(groups: LinkedGroupRule[], choices: (SelectedChoiceRule | undefined)[]) {
  const activeGroups = groups.filter((group) => group.is_active);
  const activeIds = new Set(activeGroups.map((group) => group.group_id));
  if (choices.some((choice) => !choice || !choice.is_available || !choice.is_active || !activeIds.has(choice.group_id))) throw new Error("Invalid option selection");
  const counts = new Map<string, number>();
  for (const choice of choices as SelectedChoiceRule[]) counts.set(choice.group_id, (counts.get(choice.group_id) ?? 0) + 1);
  for (const group of activeGroups) {
    const count = counts.get(group.group_id) ?? 0;
    if (count < group.min_selections || count > group.max_selections || (group.selection_type === "single" && count > 1)) throw new Error("Option selection requirements changed");
  }
}

export function validateSubtotalLimits(subtotalCents: number, minimumCents: number, maximumCents: number) {
  if (minimumCents > 0 && subtotalCents < minimumCents) throw new Error("Order is below the minimum amount");
  if (maximumCents > 0 && subtotalCents > maximumCents) throw new Error("Order exceeds the maximum amount");
}

export function validateBusinessQuantity(configuredMaximum: number, quantity: number) {
  if (configuredMaximum > 0 && quantity > configuredMaximum) throw new Error("Item quantity limit exceeded");
}

export function validateCatalogLookup(requestedItemCount: number, loadedItemCount: number, requestedChoiceCount: number, loadedChoiceCount: number) {
  if (requestedItemCount !== loadedItemCount || requestedChoiceCount !== loadedChoiceCount) throw new Error("An item or option is unavailable");
}

export function percentageDiscountCents(subtotalCents: number, percentage: number) {
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) throw new Error("Invalid promotion code");
  return Math.min(subtotalCents, Math.round(subtotalCents * percentage / 100));
}

export function requireEligiblePromotion<T extends { code: string; discount: number | string }>(offer: T | null | undefined) {
  if (!offer) throw new Error("Invalid promotion code");
  const discount = Number(offer.discount); if (!Number.isFinite(discount) || discount < 0 || discount > 100) throw new Error("Invalid promotion code");
  return { ...offer, discount };
}

export function findDeepLinkedItem<T extends { id: string }>(items: T[], search: string) {
  const requested = new URLSearchParams(search).get("item");
  return requested ? items.find((item) => item.id === requested) ?? null : null;
}
