import { NextResponse } from "next/server";
import { pool } from "@/lib/postgres/db";
import { takeawayCategoriesFromItems } from "@/lib/takeaway/categoryPresentation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [categoriesResult, itemsResult] = await Promise.all([
      pool.query("SELECT value FROM site_settings WHERE key = $1", ["categories"]),
      pool.query(`SELECT m.id, m.name, m.description, m.price, m.category, m.image_url,
          m.available,
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
        WHERE m.takeaway_available = true
        GROUP BY m.id
        ORDER BY m.category, m.display_order, m.name`),
    ]);
    const rawCategories = Array.isArray(categoriesResult.rows[0]?.value) ? categoriesResult.rows[0].value : [];
    const items = itemsResult.rows;
    const categories = takeawayCategoriesFromItems(items, rawCategories);
    return NextResponse.json({ categories, items });
  } catch {
    return NextResponse.json({ categories: [], items: [], unavailable: true }, { status: 503 });
  }
}
