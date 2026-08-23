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

export function fallbackCategoryLabel(key: string) {
  const label = key.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return label ? label.charAt(0).toLocaleUpperCase() + label.slice(1) : "Category";
}

export function takeawayCategoriesFromItems<T extends { category: string }>(items: T[], metadata: Partial<Category>[]) {
  const metadataByKey = new Map(metadata.filter((category) => typeof category.key === "string" && category.key.trim()).map((category, index) => [category.key as string, { category, index }]));
  const firstItemIndex = new Map<string, number>();
  for (const item of items) {
    const key = item.category.trim();
    if (key && !firstItemIndex.has(key)) firstItemIndex.set(key, firstItemIndex.size);
  }

  return [...firstItemIndex].map(([key, itemIndex]) => {
    const configured = metadataByKey.get(key);
    const fallback = fallbackCategoryLabel(key);
    const category = configured?.category;
    return {
      key,
      emoji: typeof category?.emoji === "string" && category.emoji.trim() ? category.emoji : "🍽️",
      fr: typeof category?.fr === "string" && category.fr.trim() ? category.fr : fallback,
      en: typeof category?.en === "string" && category.en.trim() ? category.en : fallback,
      es: typeof category?.es === "string" && category.es.trim() ? category.es : fallback,
      it: typeof category?.it === "string" && category.it.trim() ? category.it : fallback,
      is_active: true,
      display_order: Number.isFinite(Number(category?.display_order)) ? Number(category?.display_order) : metadata.length + itemIndex,
      configuredIndex: configured?.index ?? metadata.length + itemIndex,
      itemIndex,
    };
  }).sort((left, right) => left.display_order - right.display_order || left.configuredIndex - right.configuredIndex || left.itemIndex - right.itemIndex)
    .map(({ configuredIndex: _configuredIndex, itemIndex: _itemIndex, ...category }) => category);
}

export function visibleMenuItems<T extends { category: string }>(items: T[], categories: Category[]) {
  const inactiveKeys = new Set(categories.filter((category) => category.is_active === false).map((category) => category.key));
  return items.filter((item) => !inactiveKeys.has(item.category));
}
