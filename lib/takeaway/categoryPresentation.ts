import type { Lang } from "@/context/LangContext";
import type { Category } from "@/lib/hooks/useCategories";

export function activeCategories(categories: Category[]) {
  return categories
    .filter((category) => category.is_active !== false)
    .map((category, index) => ({ category, index }))
    .sort((left, right) => {
      const order = Number(left.category.display_order) - Number(right.category.display_order);
      return Number.isFinite(order) && order !== 0 ? order : left.index - right.index;
    })
    .map(({ category }) => category);
}

export function categoryLabel(category: Partial<Category> | undefined, lang: Lang, fallbackKey: string) {
  const requested = category?.[lang];
  for (const value of [requested, category?.en, category?.fr, category?.key, fallbackKey]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallbackKey;
}

export function visibleMenuItems<T extends { category: string }>(items: T[], categories: Category[]) {
  const inactiveKeys = new Set(categories.filter((category) => category.is_active === false).map((category) => category.key));
  return items.filter((item) => !inactiveKeys.has(item.category));
}
