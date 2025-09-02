import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const now = new Date().toISOString();

  const { data: my, error: myErr } = await supabase
    .from("event_rsvps")
    .select("event_id")
    .eq("user_id", user.id);
  if (myErr) return NextResponse.json({ error: myErr.message }, { status: 500 });

  const ids = (my ?? []).map((r) => r.event_id as string);
  if (ids.length === 0) return NextResponse.json({ events: [] });

  const { data: evs, error: evErr } = await supabase
    .from("events")
    .select("id,title,sport,description,start_at,end_at,team_size,capacity_teams")
    .in("id", ids)
    .gte("end_at", now)
    .order("start_at", { ascending: true });
  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });

  const { data: e2c, error: e2cErr } = await supabase
    .from("event_courts")
    .select("event_id,court_id,courts!inner(city,address,image_url)")
    .in("event_id", (evs ?? []).map((e) => e.id));
  if (e2cErr) return NextResponse.json({ error: e2cErr.message }, { status: 500 });

  const firstCourt = new Map<string, { city: string | null; address: string | null; image_url: string | null }>();
  (e2c ?? []).forEach((row) => {
    const evId = row.event_id as string;
    if (!firstCourt.has(evId)) {
      const c = (row as any).courts || {};
      firstCourt.set(evId, { city: c.city ?? null, address: c.address ?? null, image_url: c.image_url ?? null });
    }
  });

  const events = (evs ?? []).map((ev) => {
    const extra = firstCourt.get(ev.id) ?? { city: null, address: null, image_url: null };
    return { ...ev, ...extra };
  });

  return NextResponse.json({ events });
}
