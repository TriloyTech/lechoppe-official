import { NextRequest, NextResponse } from "next/server";
import { pool, assertAllowedTable } from "@/lib/postgres/db";
import { isAdminRequest } from "@/lib/admin/auth";

const PUBLIC_READ_TABLES = new Set(["menu_items", "offers", "site_settings"]);
const GENERIC_DB_BLOCKED_TABLES = new Set(["takeaway_orders", "takeaway_order_events"]);
const PUBLIC_SITE_SETTING_KEYS = new Set(["categories", "site_content"]);

type Ctx = { params: Promise<{ table: string }> };

type Filter = { column: string; op: "eq" | "gte" | "lte" | "lt" | "gt" | "in" | "is"; value: unknown };
type Order = { column: string; ascending: boolean };

const COLUMNS: Record<string, Set<string>> = {
  menu_items: new Set(["id","created_at","updated_at","name","description","price","category","available","chef_suggestion","takeaway_available","vat_rate","max_quantity_per_order","display_order","image_url","has_allergens","allergens_text"]),
  reservations: new Set(["id","created_at","name","email","phone","party_size","date","time","status","notes"]),
  offers: new Set(["id","code","discount","description","valid_until","active","takeaway_eligible","created_at"]),
  site_settings: new Set(["key","value","updated_at"]),
  takeaway_option_groups: new Set(["id","key","name","selection_type","is_required","min_selections","max_selections","is_active","display_order","created_at","updated_at"]),
  takeaway_option_choices: new Set(["id","group_id","name","price_modifier","vat_rate_override","is_available","is_default","display_order","created_at","updated_at"]),
  menu_item_option_groups: new Set(["item_id","group_id","display_order"]),
};

function isGenericDbBlocked(table: string) {
  return GENERIC_DB_BLOCKED_TABLES.has(table);
}

function hasPublicSiteSettingsFilter(filters: Filter[]) {
  return filters.some((filter) => {
    if (filter.column !== "key") return false;
    if (filter.op === "eq") {
      return typeof filter.value === "string" && PUBLIC_SITE_SETTING_KEYS.has(filter.value);
    }
    if (filter.op === "in" && Array.isArray(filter.value) && filter.value.length > 0) {
      return filter.value.every(
        (value) => typeof value === "string" && PUBLIC_SITE_SETTING_KEYS.has(value),
      );
    }
    return false;
  });
}

function isAuthed(req: NextRequest) {
  return isAdminRequest(req);
}

function checkColumn(table: string, column: string) {
  if (!COLUMNS[table]?.has(column)) throw new Error(`Column not allowed: ${column}`);
}

function jsonParam<T>(req: NextRequest, key: string, fallback: T): T {
  const raw = req.nextUrl.searchParams.get(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function buildWhere(table: string, filters: Filter[], startIndex = 1) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  let i = startIndex;

  for (const f of filters) {
    checkColumn(table, f.column);
    if (f.op === "eq") { clauses.push(`"${f.column}" = $${i++}`); values.push(f.value); }
    else if (f.op === "gte") { clauses.push(`"${f.column}" >= $${i++}`); values.push(f.value); }
    else if (f.op === "lte") { clauses.push(`"${f.column}" <= $${i++}`); values.push(f.value); }
    else if (f.op === "lt") { clauses.push(`"${f.column}" < $${i++}`); values.push(f.value); }
    else if (f.op === "gt") { clauses.push(`"${f.column}" > $${i++}`); values.push(f.value); }
    else if (f.op === "in") {
      const arr = Array.isArray(f.value) ? f.value : [];
      if (arr.length === 0) clauses.push("false");
      else {
        clauses.push(`"${f.column}" = ANY($${i++})`);
        values.push(arr);
      }
    } else if (f.op === "is") {
      if (f.value === null) clauses.push(`"${f.column}" IS NULL`);
      else { clauses.push(`"${f.column}" IS NOT NULL`); }
    }
  }

  return { sql: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "", values, nextIndex: i };
}

function parseSelect(table: string, select: string | null) {
  if (!select || select === "*") return "*";
  const cols = select.split(",").map((c) => c.trim()).filter(Boolean);
  for (const c of cols) checkColumn(table, c);
  return cols.map((c) => `"${c}"`).join(", ");
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { table } = await ctx.params;
    assertAllowedTable(table);
    if (isGenericDbBlocked(table)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const filters = jsonParam<Filter[]>(req, "filters", []);
    const authed = isAuthed(req);

    if (table === "reservations" && !authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!PUBLIC_READ_TABLES.has(table) && !authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (table === "site_settings" && !authed && !hasPublicSiteSettingsFilter(filters)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const orders = jsonParam<Order[]>(req, "orders", []);
    const select = parseSelect(table, req.nextUrl.searchParams.get("select"));
    const limit = Number(req.nextUrl.searchParams.get("limit") || "0");
    const single = req.nextUrl.searchParams.get("single") === "1";

    for (const o of orders) checkColumn(table, o.column);
    const where = buildWhere(table, filters);
    const orderSql = orders.length ? ` ORDER BY ${orders.map((o) => `"${o.column}" ${o.ascending ? "ASC" : "DESC"}`).join(", ")}` : "";
    const limitSql = limit > 0 ? ` LIMIT ${Math.max(1, Math.min(limit, 100))}` : "";

    let sql = `SELECT ${select} FROM "${table}"${where.sql}${orderSql}${limitSql}`;

    // Supabase-style `.or('valid_until.is.null,valid_until.gte.YYYY-MM-DD')` support used by offers popup.
    const or = req.nextUrl.searchParams.get("or");
    if (table === "offers" && or?.startsWith("valid_until.is.null,valid_until.gte.")) {
      const today = or.replace("valid_until.is.null,valid_until.gte.", "");
      sql = `SELECT ${select} FROM "${table}"${where.sql}${where.sql ? " AND" : " WHERE"} ("valid_until" IS NULL OR "valid_until" >= $${where.nextIndex})${orderSql}${limitSql}`;
      where.values.push(today);
    }

    const result = await pool.query(sql, where.values);
    return NextResponse.json({ data: single ? (result.rows[0] ?? null) : result.rows, error: null });
  } catch (err) {
    return NextResponse.json({ data: null, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { table } = await ctx.params;
    assertAllowedTable(table);
    if (isGenericDbBlocked(table)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await req.json();
    const rows = Array.isArray(body) ? body : [body];
    const action = req.nextUrl.searchParams.get("action");
    const onConflict = req.nextUrl.searchParams.get("onConflict");

    if (!["reservations"].includes(table) && !isAuthed(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inserted = [];
    for (const row of rows) {
      const keys = Object.keys(row).filter((k) => COLUMNS[table].has(k));
      if (!keys.length) continue;
      const values = keys.map((k) => {
        const val = row[k];
        if (typeof val === "object" && val !== null) {
          return JSON.stringify(val);
        }
        return val;
      });
      const cols = keys.map((k) => `"${k}"`).join(", ");
      const vals = keys.map((_, i) => `$${i + 1}`).join(", ");
      let conflict = "";
      if (action === "upsert" && onConflict) {
        checkColumn(table, onConflict);
        const updates = keys.filter((k) => k !== onConflict).map((k) => `"${k}" = EXCLUDED."${k}"`).join(", ");
        conflict = ` ON CONFLICT ("${onConflict}") DO UPDATE SET ${updates || `"${onConflict}" = EXCLUDED."${onConflict}"`}`;
      }
      const result = await pool.query(`INSERT INTO "${table}" (${cols}) VALUES (${vals})${conflict} RETURNING *`, values);
      inserted.push(result.rows[0]);
    }
    return NextResponse.json({ data: Array.isArray(body) ? inserted : inserted[0], error: null });
  } catch (err) {
    return NextResponse.json({ data: null, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { table } = await ctx.params;
    assertAllowedTable(table);
    if (isGenericDbBlocked(table)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { values: patchValues, filters = [] } = await req.json();
    const keys = Object.keys(patchValues || {}).filter((k) => COLUMNS[table].has(k));
    if (!keys.length) return NextResponse.json({ data: [], error: null });
    const setSql = keys.map((k, idx) => `"${k}" = $${idx + 1}`).join(", ");
    const values = keys.map((k) => {
      const val = patchValues[k];
      if (typeof val === "object" && val !== null) {
        return JSON.stringify(val);
      }
      return val;
    });
    const where = buildWhere(table, filters, values.length + 1);
    const result = await pool.query(`UPDATE "${table}" SET ${setSql}${where.sql} RETURNING *`, [...values, ...where.values]);
    return NextResponse.json({ data: result.rows, error: null });
  } catch (err) {
    return NextResponse.json({ data: null, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { table } = await ctx.params;
    assertAllowedTable(table);
    if (isGenericDbBlocked(table)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const filters = jsonParam<Filter[]>(req, "filters", []);
    const where = buildWhere(table, filters);
    if (!where.sql) return NextResponse.json({ error: "Refusing to delete without filters" }, { status: 400 });
    const result = await pool.query(`DELETE FROM "${table}"${where.sql} RETURNING *`, where.values);
    return NextResponse.json({ data: result.rows, error: null });
  } catch (err) {
    return NextResponse.json({ data: null, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
