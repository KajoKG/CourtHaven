// app/api/courts/[id]/day/route.ts
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type Offer = {
  id: string;
  title: string | null;
  discount_pct: number | null;
  starts_at: string;
  ends_at: string;
  valid_hour_start: number | null;
  valid_hour_end: number | null;
  price: number | null;
  original_price: number | null;
};

function toDayBoundsISO(date: string) {
  const d1 = new Date(date + "T00:00:00");
  const d2 = new Date(date + "T23:59:59.999");
  return { from: d1.toISOString(), to: d2.toISOString() };
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const { searchParams } = new URL(req.url);
  const date = (searchParams.get("date") || "").trim(); // YYYY-MM-DD

  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  const courtId = params.id;
  const hours = Array.from({ length: 17 }, (_, i) => i + 7); // 7..23
  const { from: dayFromISO, to: dayToISO } = toDayBoundsISO(date);

  // 1) Court price
  const { data: court, error: courtErr } = await supabase
    .from("courts")
    .select("id, price_per_hour")
    .eq("id", courtId)
    .single();
  if (courtErr || !court) {
    return NextResponse.json(
      { error: courtErr?.message || "Court not found" },
      { status: 404 }
    );
  }

  // 2) Bookings that day for this court
  const { data: bookings, error: bErr } = await supabase
    .from("bookings")
    .select("start_at,end_at")
    .eq("court_id", courtId)
    .gte("end_at", dayFromISO)
    .lte("start_at", dayToISO);
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

  // 3) Event usage for this court (by event_courts)
  const { data: ec, error: ecErr } = await supabase
    .from("event_courts")
    .select("event_id")
    .eq("court_id", courtId);
  if (ecErr) return NextResponse.json({ error: ecErr.message }, { status: 500 });

  const eventIds = Array.from(new Set((ec ?? []).map((x) => x.event_id as string)));
  let eventRanges: Array<{ start_at: string; end_at: string }> = [];

  if (eventIds.length) {
    // Prefer granular windows if they exist for that day
    const { data: win } = await supabase
      .from("event_windows")
      .select("start_at,end_at,event_id")
      .in("event_id", eventIds)
      .gte("end_at", dayFromISO)
      .lte("start_at", dayToISO);

    if (win && win.length) {
      eventRanges.push(...win.map((w) => ({ start_at: w.start_at, end_at: w.end_at })));
    }

    // Also take whole-event ranges (covers case bez windowsa)
    const { data: evs } = await supabase
      .from("events")
      .select("start_at,end_at,id")
      .in("id", eventIds)
      .gte("end_at", dayFromISO) // event still ongoing that day
      .lte("start_at", dayToISO);

    if (evs && evs.length) {
      eventRanges.push(...evs.map((e) => ({ start_at: e.start_at, end_at: e.end_at })));
    }
  }

  // 4) Active offers that day for this court (for price panel)
  const { data: offers } = await supabase
    .from("offers")
    .select(
      "id,title,discount_pct,starts_at,ends_at,valid_hour_start,valid_hour_end,price,original_price"
    )
    .eq("court_id", courtId)
    .lte("starts_at", dayToISO)
    .gte("ends_at", dayFromISO);

  const slots = hours.map((h) => {
    const s = new Date(`${date}T${String(h).padStart(2, "0")}:00:00`);
    const e = new Date(s);
    e.setHours(e.getHours() + 1);

    const booked = (bookings ?? []).some((b) =>
      rangesOverlap(s, e, new Date(b.start_at), new Date(b.end_at))
    );
    const eventBlocked = eventRanges.some((r) =>
      rangesOverlap(s, e, new Date(r.start_at), new Date(r.end_at))
    );

    // offer affecting this hour?
    const activeOffer: Offer | null =
      (offers ?? []).find((o) => {
        const inDateRange =
          new Date(o.starts_at) <= s && e <= new Date(o.ends_at);
        const hourOK =
          o.valid_hour_start == null ||
          o.valid_hour_end == null ||
          (h >= o.valid_hour_start && h < o.valid_hour_end);
        return inDateRange && hourOK;
      }) || null;

    const price_per_hour = Number(court.price_per_hour || 0);
    const effective_price_per_hour =
      activeOffer?.price ??
      (activeOffer?.discount_pct
        ? Number((price_per_hour * (100 - activeOffer.discount_pct)) / 100)
        : price_per_hour);

    return {
      hour: h,
      available: !(booked || eventBlocked),
      price_per_hour,
      effective_price_per_hour,
      active_offer: activeOffer,
    };
  });

  return NextResponse.json({ slots });
}
