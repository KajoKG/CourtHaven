import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

/* ---------- Types ---------- */
type MyRsvpRow = { event_id: string };

type EventRow = {
  id: string;
  title: string | null;
  sport: string | null;
  description: string | null;
  start_at: string;
  end_at: string;
  team_size: number | null;
  capacity_teams: number | null;
};

type CourtInfo = {
  city: string | null;
  address: string | null;
  image_url: string | null;
};

/** Supabase join može vratiti objekt ili niz objekata, ovisno o relaciji/selektu */
type EventCourtRow = {
  event_id: string;
  court_id: string;
  courts: CourtInfo | CourtInfo[];
};

/* ---------- Helpers ---------- */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const now = new Date().toISOString();

  const myRes = await supabase
    .from("event_rsvps")
    .select("event_id")
    .eq("user_id", user.id);

  const my = (myRes.data ?? []) as MyRsvpRow[];
  const myErr = myRes.error;
  if (myErr) return NextResponse.json({ error: myErr.message }, { status: 500 });

  const ids = my.map((r) => r.event_id);
  if (ids.length === 0) return NextResponse.json({ events: [] });

  const evsRes = await supabase
    .from("events")
    .select("id,title,sport,description,start_at,end_at,team_size,capacity_teams")
    .in("id", ids)
    .gte("end_at", now)
    .order("start_at", { ascending: true });

  const evs = (evsRes.data ?? []) as EventRow[];
  const evErr = evsRes.error;
  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });

  const e2cRes = await supabase
    .from("event_courts")
    .select("event_id,court_id,courts!inner(city,address,image_url)")
    .in("event_id", evs.map((e) => e.id));

  // ⚠️ TS hint: prvo u unknown, pa u naš tip
  const e2c = ((e2cRes.data ?? []) as unknown) as EventCourtRow[];
  const e2cErr = e2cRes.error;
  if (e2cErr) return NextResponse.json({ error: e2cErr.message }, { status: 500 });

  const firstCourt = new Map<string, CourtInfo>();
  e2c.forEach((row) => {
    const evId = row.event_id;
    if (!firstCourt.has(evId)) {
      const c = one(row.courts) ?? { city: null, address: null, image_url: null };
      firstCourt.set(evId, {
        city: c.city ?? null,
        address: c.address ?? null,
        image_url: c.image_url ?? null,
      });
    }
  });

  const events = evs.map((ev) => {
    const extra = firstCourt.get(ev.id) ?? { city: null, address: null, image_url: null };
    return { ...ev, ...extra };
  });

  return NextResponse.json({ events });
}
