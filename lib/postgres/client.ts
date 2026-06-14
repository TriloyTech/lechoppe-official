// Local PostgreSQL adapter with a small query interface that mimics Supabase client API.
// This keeps the existing React components working without Supabase package dependency.

type Filter = { column: string; op: "eq" | "gte" | "lte" | "lt" | "gt" | "in" | "is"; value: unknown };
type Order = { column: string; ascending: boolean };

type QueryResult<T = any> = Promise<{ data: T; error: null | { message: string } }>;

class PgQueryBuilder {
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private selected = "*";
  private limitCount = 0;
  private singleMode = false;
  private pendingUpdate: Record<string, unknown> | null = null;
  private deleteMode = false;
  private orExpr = "";

  constructor(private table: string) {}

  select(columns = "*", _options?: unknown) {
    this.selected = columns;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  eq(column: string, value: unknown) { this.filters.push({ column, op: "eq", value }); return this; }
  gte(column: string, value: unknown) { this.filters.push({ column, op: "gte", value }); return this; }
  lte(column: string, value: unknown) { this.filters.push({ column, op: "lte", value }); return this; }
  lt(column: string, value: unknown) { this.filters.push({ column, op: "lt", value }); return this; }
  gt(column: string, value: unknown) { this.filters.push({ column, op: "gt", value }); return this; }
  in(column: string, value: unknown[]) { this.filters.push({ column, op: "in", value }); return this; }
  is(column: string, value: unknown) { this.filters.push({ column, op: "is", value }); return this; }
  or(expr: string) { this.orExpr = expr; return this; }
  limit(count: number) { this.limitCount = count; return this; }
  single() { this.singleMode = true; return this.execute(); }
  maybeSingle() { this.singleMode = true; return this.execute(); }

  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    return fetch(`/api/db/${this.table}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }).then((r) => r.json());
  }

  upsert(values: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }) {
    const qs = new URLSearchParams({ action: "upsert" });
    if (options?.onConflict) qs.set("onConflict", options.onConflict);
    return fetch(`/api/db/${this.table}?${qs.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }).then((r) => r.json());
  }

  update(values: Record<string, unknown>) {
    this.pendingUpdate = values;
    return this;
  }

  delete() {
    this.deleteMode = true;
    return this;
  }

  then(resolve: (value: any) => void, reject?: (reason?: any) => void) {
    this.execute().then(resolve, reject);
  }

  private execute(): QueryResult {
    if (this.pendingUpdate) {
      return fetch(`/api/db/${this.table}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: this.pendingUpdate, filters: this.filters }),
      }).then((r) => r.json());
    }

    const qs = new URLSearchParams();
    qs.set("select", this.selected);
    if (this.filters.length) qs.set("filters", JSON.stringify(this.filters));
    if (this.orders.length) qs.set("orders", JSON.stringify(this.orders));
    if (this.limitCount) qs.set("limit", String(this.limitCount));
    if (this.singleMode) qs.set("single", "1");
    if (this.orExpr) qs.set("or", this.orExpr);

    if (this.deleteMode) {
      return fetch(`/api/db/${this.table}?${qs.toString()}`, { method: "DELETE" }).then((r) => r.json());
    }

    return fetch(`/api/db/${this.table}?${qs.toString()}`).then((r) => r.json());
  }
}

export function createClient() {
  return {
    from(table: string) { return new PgQueryBuilder(table); },
    auth: {
      async getSession() {
        const res = await fetch("/api/admin/session", { cache: "no-store" });
        const data = await res.json();
        return { data: { session: data.authenticated ? { user: { role: "admin" } } : null } };
      },
    },
  };
}

export function getStorageUrl(_bucket: string, path: string): string {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("/")) return path;
  return `/uploads/${path}`;
}
