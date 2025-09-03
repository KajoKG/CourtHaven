// app/api/courts/search/route.ts
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  // strogi overlap: [aStart, aEnd) ∩ [bStart, bEnd) ≠ ∅
  return aStart < bEnd && bStart < aEnd;
}

/* ---------- Types ---------- */
type CourtRow = {
  id: string;
  name: string | null;
  sport: string | null;
  address: string | null;
  city: string | null;
  description: string | null;
  image_url: string | null;
  price_per_hour: number | null;
};

type BookingRow = {
  court_id: string;
  start_at: string;
  end_at: string;
};

type EventCourtRow = {
  event_id: string;
  court_id: string;
};

type WindowRange = {
  event_id: string;
  start_at: string;
  end_at: string;
};

type OutputRow = CourtRow & {
  effective_price_per_hour: number | null;
  active_offer: null; // ako kasnije dodaješ ponudu, promijeni u odgovarajući tip
};

export async function GET(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { searchParams } = new URL(req.url);

  const sport = (searchParams.get("sport") || "").trim();
  const date = (searchParams.get("date") || "").trim(); // YYYY-MM-DD
  const hour = Number(searchParams.get("hour") || "0");
  const duration = Math.max(1, Math.min(3, Number(searchParams.get("duration") || "1")));

  if (!sport || !date || !Number.isFinite(hour)) {
    return NextResponse.json({ error: "Missing sport/date/hour" }, { status: 400 });
  }

  // TZ-safe: konstruiraj lokalno po komponentama
  const [y, m, d] = date.split("-").map(Number);
  const start = new Date(y, m - 1, d, hour, 0, 0, 0);
  const end = new Date(start.getTime() + duration * 3600 * 1000);

  // 1) All courts for that sport
  const { data: courts, error: cErr } = await supabase
    .from("courts")
    .select("id,name,sport,address,city,description,image_url,price_per_hour")
    .eq("sport", sport);
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const courtList = (courts ?? []) as CourtRow[];
  const courtIds = courtList.map((c) => c.id);
  if (!courtIds.length) return NextResponse.json({ available: [], conflicting: [] });

  // 2) Bookings overlapping the requested slot
  // Overlap uvjet: start_at < end AND end_at > start
  const { data: bookings } = await supabase
    .from("bookings")
    .select("court_id,start_at,end_at")
    .in("court_id", courtIds)
    .lt("start_at", end.toISOString())
    .gt("end_at", start.toISOString());

  // 3) Event usage for those courts
  const { data: ec } = await supabase
    .from("event_courts")
    .select("event_id,court_id")
    .in("court_id", courtIds);

  const eventIds = Array.from(
    new Set(((ec ?? []) as EventCourtRow[]).map((x) => x.event_id))
  );

  let windows: WindowRange[] = [];
  if (eventIds.length) {
    // windows koji overlapaju slot
    const { data: win } = await supabase
      .from("event_windows")
      .select("event_id,start_at,end_at")
      .in("event_id", eventIds)
      .lt("start_at", end.toISOString())
      .gt("end_at", start.toISOString());
    if (win) windows = win as WindowRange[];

    // whole-event rasponi (ako nema windows-a)
    const { data: evs } = await supabase
      .from("events")
      .select("id,start_at,end_at")
      .in("id", eventIds)
      .lt("start_at", end.toISOString())
      .gt("end_at", start.toISOString());

    if (evs && evs.length) {
      windows.push(
        ...evs.map((e) => ({ event_id: e.id as string, start_at: e.start_at as string, end_at: e.end_at as string }))
      );
    }
  }

  // 4) Build conflict maps
  const bookingsByCourt = new Map<string, { start_at: string; end_at: string }[]>();
  ((bookings ?? []) as BookingRow[]).forEach((b) => {
    const arr = bookingsByCourt.get(b.court_id) || [];
    arr.push({ start_at: b.start_at, end_at: b.end_at });
    bookingsByCourt.set(b.court_id, arr);
  });

  const eventIdsByCourt = new Map<string, string[]>();
  ((ec ?? []) as EventCourtRow[]).forEach((row) => {
    const arr = eventIdsByCourt.get(row.court_id) || [];
    arr.push(row.event_id);
    eventIdsByCourt.set(row.court_id, arr);
  });

  const windowsByEvent = new Map<string, { start_at: string; end_at: string }[]>();
  (windows as WindowRange[]).forEach((w) => {
    const arr = windowsByEvent.get(w.event_id) || [];
    arr.push({ start_at: w.start_at, end_at: w.end_at });
    windowsByEvent.set(w.event_id, arr);
  });

  const available: OutputRow[] = [];
  const conflicting: OutputRow[] = [];

  for (const c of courtList) {
    let conflict = false;

    // booking overlap
    const bArr = bookingsByCourt.get(c.id) || [];
    if (
      bArr.some((b) => rangesOverlap(start, end, new Date(b.start_at), new Date(b.end_at)))
    ) {
      conflict = true;
    }

    // event overlap
    if (!conflict) {
      const evIds = eventIdsByCourt.get(c.id) || [];
      if (evIds.length) {
        conflict = evIds.some((eid) => {
          const wr = windowsByEvent.get(eid) || [];
          return wr.some((r) =>
            rangesOverlap(start, end, new Date(r.start_at), new Date(r.end_at))
          );
        });
      }
    }

    const row: OutputRow = {
      ...c,
      effective_price_per_hour: c.price_per_hour,
      active_offer: null,
    };

    (conflict ? conflicting : available).push(row);
  }

  return NextResponse.json({ available, conflicting });
}
