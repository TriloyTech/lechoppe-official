import { NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";

const FALLBACK_CATEGORIES = [
  { key: "burger", emoji: "🍔", fr: "Burgers & Plats", en: "Burgers & Mains", es: "Hamburguesas y platos", it: "Burger e piatti", is_active: true, display_order: 0 },
  { key: "side", emoji: "🥗", fr: "Entrées & Accompagnements", en: "Starters & Sides", es: "Entrantes y guarniciones", it: "Antipasti e contorni", is_active: true, display_order: 1 },
  { key: "dessert", emoji: "🍮", fr: "Desserts", en: "Desserts", es: "Postres", it: "Dolci", is_active: true, display_order: 2 },
  { key: "drink", emoji: "🥂", fr: "Boissons", en: "Drinks", es: "Bebidas", it: "Bevande", is_active: true, display_order: 3 },
];

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [categoriesResult, itemsResult] = await Promise.all([
      pool.query("SELECT value FROM site_settings WHERE key = $1", ["categories"]),
      pool.query(`SELECT m.id, m.name, m.description, m.price, m.category, m.image_url,
          m.has_allergens, m.allergens_text, m.vat_rate, m.max_quantity_per_order, m.display_order,
          COALESCE(jsonb_agg(jsonb_build_object(
            'id', g.id, 'key', g.key, 'name', g.name, 'selection_type', g.selection_type,
            'is_required', g.is_required, 'min_selections', g.min_selections,
            'max_selections', g.max_selections, 'is_active', g.is_active, 'display_order', link.display_order,
            'choices', COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'id', c.id, 'group_id', c.group_id, 'name', c.name, 'price_modifier', c.price_modifier,
              'vat_rate_override', c.vat_rate_override, 'is_available', c.is_available,
              'is_default', c.is_default, 'display_order', c.display_order
            ) ORDER BY c.display_order, c.id) FROM takeaway_option_choices c WHERE c.group_id = g.id), '[]'::jsonb)
          ) ORDER BY link.display_order, g.display_order) FILTER (WHERE g.id IS NOT NULL), '[]'::jsonb) AS option_groups
        FROM menu_items m
        LEFT JOIN menu_item_option_groups link ON link.item_id = m.id
        LEFT JOIN takeaway_option_groups g ON g.id = link.group_id AND g.is_active
        WHERE m.available = true AND m.takeaway_available = true AND m.vat_rate IS NOT NULL
        GROUP BY m.id
        ORDER BY m.category, m.display_order, m.name`),
    ]);
    const rawCategories = Array.isArray(categoriesResult.rows[0]?.value) ? categoriesResult.rows[0].value : FALLBACK_CATEGORIES;
    const eligibleKeys = new Set(itemsResult.rows.map((item) => item.category));
    const categories = rawCategories.filter((category: { key?: string; is_active?: boolean }) => category.is_active !== false && category.key && eligibleKeys.has(category.key)).sort((a: { display_order?: number }, b: { display_order?: number }) => (a.display_order ?? 0) - (b.display_order ?? 0));
    return NextResponse.json({ categories, items: itemsResult.rows });
  } catch {
    return NextResponse.json({ categories: [], items: [], unavailable: true }, { status: 503 });
  }
}
