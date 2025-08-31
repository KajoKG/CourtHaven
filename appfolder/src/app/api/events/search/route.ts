// app/api/events/search/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function n(v: string | null, def: number) {
  const x = v ? Number(v) : NaN;
  return Number.isFinite(x) ? x : def;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const sport = searchParams.get("sport") || undefined;
  const from  = searchParams.get("from")  || undefined; // YYYY-MM-DD
  const to    = searchParams.get("to")    || undefined; // YYYY-MM-DD
  const city  = searchParams.get("city")  || undefined;
  const q     = searchParams.get("q")     || undefined;

  const limit  = Math.min(Math.max(n(searchParams.get("limit"), 12), 1), 50);
  const offset = Math.max(n(searchParams.get("offset"), 0), 0);

  // 1) Base upit na events (brojanje + osnovni filtri)
  let base = supabase
    .from("events")
    .select("id,title,sport,description,start_at,end_at,created_at", { count: "exact" });

  if (sport) base = base.eq("sport", sport);

  // raspon datuma (default: nadolazeći)
  if (from) base = base.gte("start_at", new Date(from).toISOString());
  if (to)   base = base.lte("start_at", new Date(to).toISOString());
  if (!from && !to) {
    const today = new Date(); today.setHours(0,0,0,0);
    base = base.gte("end_at", today.toISOString());
  }

  if (q) base = base.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

  // privremeno izvuci sve (bez paginacije) da bismo, ako treba, filtrirali po city
  const { data: baseEvents, error: baseErr, count } = await base;
  if (baseErr) return NextResponse.json({ error: baseErr.message }, { status: 500 });

  let filteredIds = (baseEvents ?? []).map(e => e.id as string);

  // 2) Ako je zadani city → pronađi event_id koji imaju barem jedan court u tom gradu
  if (city && filteredIds.length) {
    const { data: ec, error: ecErr } = await supabase
      .from("event_courts")
      .select("event_id,court_id,courts!inner(city)")
      .in("event_id", filteredIds)
      .ilike("courts.city", `%${city}%`);

    if (ecErr) return NextResponse.json({ error: ecErr.message }, { status: 500 });
    const allowed = new Set((ec ?? []).map(x => x.event_id as string));
    filteredIds = filteredIds.filter(id => allowed.has(id));
  }

  // 3) Paginacija nad filtriranim ID-evima
  const total = filteredIds.length;
  const slice = filteredIds.slice(offset, offset + limit);

  if (slice.length === 0) {
    return NextResponse.json({ events: [], total, hasMore: false });
  }

  // 4) Dohvati detalje + jedan "primary court" (grad/adresa/slika) za prikaz kartice
  //    Uzet ćemo prvi pridruženi court po ID-u.
  const { data: events, error: evErr } = await supabase
    .from("events")
    .select("id,title,sport,description,start_at,end_at")
    .in("id", slice)
    .order("start_at", { ascending: true });

  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });

  // za primary court:
  const { data: e2c, error: e2cErr } = await supabase
    .from("event_courts")
    .select("event_id,court_id,courts!inner(city,address,image_url)")
    .in("event_id", slice);

  if (e2cErr) return NextResponse.json({ error: e2cErr.message }, { status: 500 });

  // mapiraj event_id -> prvi court info
  const firstCourtByEvent = new Map<string, { city: string|null; address: string|null; image_url: string|null }>();
  (e2c ?? []).forEach(row => {
    if (!firstCourtByEvent.has(row.event_id as string)) {
      const c = (row as any).courts || {};
      firstCourtByEvent.set(row.event_id as string, {
        city: c.city ?? null,
        address: c.address ?? null,
        image_url: c.image_url ?? null,
      });
    }
  });

  // 5) Sastavi response objekte
  const result = (events ?? []).map(ev => {
    const extra = firstCourtByEvent.get(ev.id) ?? { city: null, address: null, image_url: null };
    return {
      ...ev,
      city: extra.city,
      address: extra.address,
      image_url: extra.image_url,
    };
  });

  return NextResponse.json({
    events: result,
    total,
    hasMore: offset + result.length < total,
  });
}
