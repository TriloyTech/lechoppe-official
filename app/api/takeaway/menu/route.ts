import { NextResponse } from "next/server";
import { logServerError } from "@/lib/server/logError";
import { takeawayCategoriesFromItems } from "@/lib/takeaway/categoryPresentation";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const [categoriesResult, itemsResult, linksResult, groupsResult, choicesResult] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", "categories").maybeSingle(),
      supabase.from("menu_items").select("*").eq("takeaway_available", true).order("category").order("display_order").order("name"),
      supabase.from("menu_item_option_groups").select("*").order("display_order"),
      supabase.from("takeaway_option_groups").select("*").eq("is_active", true).order("display_order"),
      supabase.from("takeaway_option_choices").select("*").order("display_order"),
    ]);

    const rawCategories = Array.isArray(categoriesResult.data?.value) ? categoriesResult.data.value : [];
    const links = linksResult.data || [];
    const groups = groupsResult.data || [];
    const choices = choicesResult.data || [];

    const choicesByGroup = new Map<string, any[]>();
    for (const c of choices) {
      if (!choicesByGroup.has(c.group_id)) choicesByGroup.set(c.group_id, []);
      choicesByGroup.get(c.group_id)!.push(c);
    }

    const groupMap = new Map(groups.map((g) => [g.id, g]));

    const items = (itemsResult.data || []).map((item) => {
      const itemLinks = links.filter((l) => l.item_id === item.id);
      const option_groups = itemLinks
        .map((link) => {
          const g = groupMap.get(link.group_id);
          if (!g) return null;
          return {
            id: g.id,
            key: g.key,
            name: g.name,
            selection_type: g.selection_type,
            is_required: g.is_required,
            min_selections: g.min_selections,
            max_selections: g.max_selections,
            is_active: g.is_active,
            display_order: link.display_order,
            choices: choicesByGroup.get(g.id) || [],
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.display_order - b.display_order);

      return {
        ...item,
        option_groups,
      };
    });

    const categories = takeawayCategoriesFromItems(items, rawCategories);
    return NextResponse.json({ categories, items });
  } catch (error) {
    logServerError("api.takeaway.menu", error);
    return NextResponse.json({ categories: [], items: [], unavailable: true }, { status: 503 });
  }
}
