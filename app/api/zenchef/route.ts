import { NextResponse } from "next/server";

const BASE = "https://api.zenchef.com/api/v1/restaurants/345776";

export interface ZenchefStats {
  restaurant_name: string;
  reviews_count: number;
  average_global: number;
  average_menu: number;
  average_service: number;
  average_ambiance: number;
  average_value_for_money: number;
}

export interface ZenchefReview {
  id: number;
  name: string;       // "Firstname L."
  global: number;     // 1-5
  service: number;
  menu: number;
  ambiance: number;
  body: string;
  date: string;       // ISO
  nb_guests: number;
}

/** Fetch all pages until we have enough reviews with body text, or exhaust max pages */
async function fetchRichReviews(minCount = 20, maxPages = 7): Promise<ZenchefReview[]> {
  const rich: ZenchefReview[] = [];
  let page = 1;

  while (rich.length < minCount && page <= maxPages) {
    const res = await fetch(`${BASE}/reviews?page=${page}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) break;
    const data = await res.json();
    const items: ZenchefReview[] = (data.data ?? []).map((r: Record<string, unknown>) => {
      const bk = r.booking as Record<string, string> | null;
      const fn = (bk?.firstname ?? "").trim();
      const ln = (bk?.lastname ?? "").trim();
      // Name: "Firstname L." format from Zenchef
      const name = fn || ln ? `${fn} ${ln}`.trim() : "Client Vérifié";
      return {
        id: r.id as number,
        name,
        global: Number(r.global ?? 5),
        service: Number(r.service ?? 5),
        menu: Number(r.menu ?? 5),
        ambiance: Number(r.ambiance ?? 5),
        body: ((r.body as string) ?? "").trim(),
        date: (r.created_at as string) ?? (r.source_date as string) ?? "",
        nb_guests: Number(bk?.nb_guests ?? 2),
      };
    });

    // Collect reviews with body text (non-empty comments)
    const withBody = items.filter((r) => r.body.length >= 10);
    rich.push(...withBody);
    page++;
  }

  return rich;
}

// Cache: store pre-fetched result in-module between requests (Next.js serverless warm reuse)
let cached: { ts: number; stats: ZenchefStats | null; reviews: ZenchefReview[] } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET() {
  // Serve from cache if fresh
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ stats: cached.stats, reviews: cached.reviews, cached: true });
  }

  try {
    const [paramsRes, reviews] = await Promise.all([
      fetch(`${BASE}/reviewParams`, { headers: { Accept: "application/json" } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetchRichReviews(20, 7).catch(() => []),
    ]);

    const stats: ZenchefStats | null = paramsRes
      ? {
          restaurant_name: paramsRes.restaurant_name,
          reviews_count: paramsRes.reviews_count,
          average_global: paramsRes.average_global,
          average_menu: paramsRes.average_menu,
          average_service: paramsRes.average_service,
          average_ambiance: paramsRes.average_ambiance,
          average_value_for_money: paramsRes.average_value_for_money,
        }
      : null;

    cached = { ts: Date.now(), stats, reviews };
    return NextResponse.json({ stats, reviews, cached: false });
  } catch {
    // Serve stale cache on error
    if (cached) {
      return NextResponse.json({ stats: cached.stats, reviews: cached.reviews, cached: true, stale: true });
    }
    return NextResponse.json({ error: "Service temporairement indisponible", stats: null, reviews: [] }, { status: 503 });
  }
}
