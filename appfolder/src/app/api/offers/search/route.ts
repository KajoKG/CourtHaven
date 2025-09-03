// src/app/api/offers/search/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function num(v: string | null, def: number) {
  const x = v ? Number(v) : NaN;
  return Number.isFinite(x) ? x : def;
}

/* ---------- Types ---------- */
type CourtInfo = {
  id: string;
  name: string | null;
  sport: string | null;
  address: string | null;
  city: string | null;
  image_url: string | null;
};

type OfferJoined = {
  id: string;
  title: string | null;
  description: string | null;
  discount_pct: number | null;
  original_price: number | null;
  price: number | null;
  starts_at: string;
  ends_at: string;
  featured: boolean | null;
  valid_hour_start: number | null;
  valid_hour_end: number | null;
  // Supabase join preko foreign key-a vraća jedan court objekt,
  // ali tipiziramo tolerantno ako bi se vratio niz.
  courts: CourtInfo | CourtInfo[];
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const sport = searchParams.get("sport") || undefined;
  const city  = searchParams.get("city")  || undefined;
  const q     = searchParams.get("q")     || undefined;

  const sort  = (searchParams.get("sort") || "endsSoon") as "endsSoon" | "discount" | "price";
  const limit = Math.min(Math.max(num(searchParams.get("limit"), 12), 1), 50);
  const offset = Math.max(num(searchParams.get("offset"), 0), 0);

  const nowISO = new Date().toISOString();

  let base = supabase
    .from("offers")
    .select(
      `
      id, title, description, discount_pct, original_price, price, starts_at, ends_at, featured,
      valid_hour_start, valid_hour_end,
      courts!inner ( id, name, sport, address, city, image_url )
    `,
      { count: "exact" }
    )
    .lte("starts_at", nowISO)
    .gte("ends_at", nowISO);

  if (sport) base = base.eq("courts.sport", sport);
  if (city)  base = base.ilike("courts.city", `%${city}%`);
  if (q)     base = base.or(`title.ilike.%${q}%,description.ilike.%${q}%,courts.name.ilike.%${q}%`);

  const { data, error, count } = await base;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = ((data ?? []) as unknown) as OfferJoined[];

  const items = rows.map((row) => {
    const court = Array.isArray(row.courts) ? row.courts[0] ?? null : row.courts ?? null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      discount_pct: row.discount_pct,
      original_price: row.original_price,
      price: row.price,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      featured: row.featured,
      valid_hour_start: row.valid_hour_start ?? null,
      valid_hour_end: row.valid_hour_end ?? null,
      court, // { id,name,sport,address,city,image_url } | null
    };
  });

  items.sort((a, b) => {
    if (sort === "discount") return (b.discount_pct ?? 0) - (a.discount_pct ?? 0);
    if (sort === "price")    return (a.price ?? 0) - (b.price ?? 0);
    return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime(); // endsSoon
  });

  const total = count ?? items.length;
  const page = items.slice(offset, offset + limit);
  return NextResponse.json({ offers: page, total, hasMore: offset + page.length < total });
}
