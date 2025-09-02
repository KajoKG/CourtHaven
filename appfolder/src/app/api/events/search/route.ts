import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

// helper za parsiranje brojčanih query parametara
function n(v: string | null, def: number, { min = -Infinity, max = Infinity } = {}) {
  const x = v ? Number(v) : NaN;
  const y = Number.isFinite(x) ? x : def;
  return Math.min(max, Math.max(min, y));
}

export async function GET(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { searchParams } = new URL(req.url);

  const sport = (searchParams.get("sport") || "").trim().toLowerCase() || undefined;
  const from  = (searchParams.get("from")  || "").trim() || undefined; // YYYY-MM-DD
  const to    = (searchParams.get("to")    || "").trim() || undefined; // YYYY-MM-DD
  const city  = (searchParams.get("city")  || "").trim() || undefined;
  const q     = (searchParams.get("q")     || "").trim() || undefined;

  const limit  = n(searchParams.get("limit"), 12, { min: 1, max: 50 });
  const offset = n(searchParams.get("offset"), 0,  { min: 0 });

  // 1) City → skup event_id-a
  let eventIdsByCity: string[] | null = null;
  if (city) {
    const { data: e2c, error: cityErr } = await supabase
      .from("event_courts")
      .select("event_id,courts!inner(city)")
      .ilike("courts.city", `%${city}%`);
    if (cityErr) return NextResponse.json({ error: cityErr.message }, { status: 500 });
    eventIdsByCity = Array.from(new Set((e2c ?? []).map(r => r.event_id as string)));
    if (eventIdsByCity.length === 0) {
      return NextResponse.json({ events: [], total: 0, hasMore: false });
    }
  }

  const fromISO = from ? new Date(from + "T00:00:00").toISOString() : undefined;
  let toISO: string | undefined;
  if (to) {
    const t = new Date(to);
    t.setHours(23, 59, 59, 999);
    toISO = t.toISOString();
  }
  const defaultMinEnd = (!from && !to) ? (() => {
    const d = new Date(); d.setHours(0,0,0,0);
    return d.toISOString();
  })() : undefined;

  // 2) COUNT
  let countQ = supabase.from("events").select("id", { count: "exact" });
  if (sport) countQ = countQ.eq("sport", sport);
  if (fromISO) countQ = countQ.gte("start_at", fromISO);
  if (toISO)   countQ = countQ.lte("start_at", toISO);
  if (defaultMinEnd) countQ = countQ.gte("end_at", defaultMinEnd);
  if (q) countQ = countQ.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  if (eventIdsByCity) countQ = countQ.in("id", eventIdsByCity);

  const { count: total, error: countErr } = await countQ;
  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });
  if (!total) return NextResponse.json({ events: [], total: 0, hasMore: false });

  // 3) PAGE
  let pageQ = supabase
    .from("events")
    .select("id,title,sport,description,start_at,end_at,team_size,capacity_teams")
    .order("start_at", { ascending: true });

  if (sport) pageQ = pageQ.eq("sport", sport);
  if (fromISO) pageQ = pageQ.gte("start_at", fromISO);
  if (toISO)   pageQ = pageQ.lte("start_at", toISO);
  if (defaultMinEnd) pageQ = pageQ.gte("end_at", defaultMinEnd);
  if (q) pageQ = pageQ.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  if (eventIdsByCity) pageQ = pageQ.in("id", eventIdsByCity);

  const { data: evs, error: evErr } = await pageQ.range(offset, offset + limit - 1);
  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });
  if (!evs || evs.length === 0) return NextResponse.json({ events: [], total, hasMore: false });

  const eventIds = evs.map(e => e.id);

  // 4) first-court meta
  const { data: e2c, error: e2cErr } = await supabase
    .from("event_courts")
    .select("event_id,court_id,courts!inner(city,address,image_url)")
    .in("event_id", eventIds);
  if (e2cErr) return NextResponse.json({ error: e2cErr.message }, { status: 500 });

  const firstCourt = new Map<string, { city: string|null; address: string|null; image_url: string|null }>();
  (e2c ?? []).forEach(row => {
    const evId = row.event_id as string;
    if (!firstCourt.has(evId)) {
      const c = (row as any).courts || {};
      firstCourt.set(evId, { city: c.city ?? null, address: c.address ?? null, image_url: c.image_url ?? null });
    }
  });

  // 5) broj timova po eventu — bez .group(), prebrojimo u JS-u
  const { data: rsvps, error: rsvpErr } = await supabase
    .from("event_rsvps")
    .select("event_id")
    .in("event_id", eventIds);

  if (rsvpErr) {
    return NextResponse.json({ error: rsvpErr.message }, { status: 500 });
  }

  const teamsByEvent = new Map<string, number>();
  for (const r of rsvps ?? []) {
    const id = (r as any).event_id as string;
    teamsByEvent.set(id, (teamsByEvent.get(id) ?? 0) + 1);
  }


  // 6) rezultat
  const events = evs.map(ev => {
    const extra = firstCourt.get(ev.id) ?? { city: null, address: null, image_url: null };
    return {
      ...ev,
      city: extra.city,
      address: extra.address,
      image_url: extra.image_url,
      teamsCount: teamsByEvent.get(ev.id) ?? 0,
    };
  });

  return NextResponse.json({
    events,
    total: total ?? 0,
    hasMore: offset + events.length < (total ?? 0),
  });
}
