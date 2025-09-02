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

/** TZ-safe dnevne granice: konstrukcija po komponentama pa u ISO (UTC) */
function toDayBoundsISO(date: string) {
  // date je "YYYY-MM-DD"
  const [y, m, d] = date.split("-").map(Number);
  const startLocal = new Date(y, m - 1, d, 0, 0, 0, 0);
  const endLocal   = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { from: startLocal.toISOString(), to: endLocal.toISOString() };
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  // strogi overlap: [aStart, aEnd) ∩ [bStart, bEnd) ≠ ∅
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

  // 2) Bookings that overlap that day for this court
  // Overlap uvjet: start_at < dayEnd AND end_at > dayStart
  const { data: bookings, error: bErr } = await supabase
    .from("bookings")
    .select("start_at,end_at")
    .eq("court_id", courtId)
    .lt("start_at", dayToISO)
    .gt("end_at", dayFromISO);
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

  // 3) Event usage for this court (preko event_courts)
  const { data: ec, error: ecErr } = await supabase
    .from("event_courts")
    .select("event_id")
    .eq("court_id", courtId);
  if (ecErr) return NextResponse.json({ error: ecErr.message }, { status: 500 });

  const eventIds = Array.from(new Set((ec ?? []).map((x) => x.event_id as string)));
  let eventRanges: Array<{ start_at: string; end_at: string }> = [];

  if (eventIds.length) {
    // Granular windows koji overlapaju taj dan
    const { data: win, error: winErr } = await supabase
      .from("event_windows")
      .select("start_at,end_at,event_id")
      .in("event_id", eventIds)
      .lt("start_at", dayToISO)
      .gt("end_at", dayFromISO);
    if (!winErr && win && win.length) {
      eventRanges.push(...win.map((w) => ({ start_at: w.start_at, end_at: w.end_at })));
    }

    // Whole-event ranges (ako nema windows-a za taj dan)
    const { data: evs, error: evErr } = await supabase
      .from("events")
      .select("start_at,end_at,id")
      .in("id", eventIds)
      .lt("start_at", dayToISO)
      .gt("end_at", dayFromISO);
    if (!evErr && evs && evs.length) {
      eventRanges.push(...evs.map((e) => ({ start_at: e.start_at, end_at: e.end_at })));
    }
  }

  // 4) Active offers that day for this court (za price panel)
  // "Aktivno taj dan" → starts_at < dayEnd AND ends_at > dayStart
  const { data: offers } = await supabase
    .from("offers")
    .select(
      "id,title,discount_pct,starts_at,ends_at,valid_hour_start,valid_hour_end,price,original_price"
    )
    .eq("court_id", courtId)
    .lt("starts_at", dayToISO)
    .gt("ends_at", dayFromISO);

  // Konstruiraj slotove TZ-sigurno (po komponentama)
  const [yy, mm, dd] = date.split("-").map(Number);

  const slots = hours.map((h) => {
    const s = new Date(yy, mm - 1, dd, h, 0, 0, 0); // lokalno vrijeme
    const e = new Date(s);
    e.setHours(e.getHours() + 1);

    const booked = (bookings ?? []).some((b) =>
      rangesOverlap(s, e, new Date(b.start_at), new Date(b.end_at))
    );
    const eventBlocked = eventRanges.some((r) =>
      rangesOverlap(s, e, new Date(r.start_at), new Date(r.end_at))
    );

    // offer koji vrijedi baš za ovaj sat (u rasponu datuma + satni prozor)
    const activeOffer: Offer | null =
      (offers ?? []).find((o) => {
        const inDateRange = new Date(o.starts_at) <= s && e <= new Date(o.ends_at);
        const hourOK =
          o.valid_hour_start == null ||
          o.valid_hour_end == null ||
          (h >= o.valid_hour_start && h < o.valid_hour_end);
        return inDateRange && hourOK;
      }) || null;

    const price_per_hour = Number(court.price_per_hour || 0);
    const effective_price_per_hour =
      activeOffer?.price ??
      (activeOffer?.discount_pct != null
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
