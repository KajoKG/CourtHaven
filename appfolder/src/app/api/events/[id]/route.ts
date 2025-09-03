// src/app/api/events/[id]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

/* ---------- Types ---------- */
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
  name: string | null;
  city: string | null;
  address: string | null;
  image_url: string | null;
};

type EventCourtRow = {
  court_id: string;
  courts: CourtInfo;
};

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });

  const evRes = await supabase
    .from("events")
    .select("id,title,sport,description,start_at,end_at,team_size,capacity_teams")
    .eq("id", params.id)
    .single();

  const ev = evRes.data as EventRow | null;
  const evErr = evRes.error;

  if (evErr || !ev) {
    return NextResponse.json({ error: evErr?.message ?? "Not found" }, { status: 404 });
  }

  const ecRes = await supabase
    .from("event_courts")
    .select("court_id,courts!inner(name,city,address,image_url)")
    .eq("event_id", params.id);

  const ec = ecRes.data as EventCourtRow[] | null;
  const ecErr = ecRes.error;

  if (ecErr) return NextResponse.json({ error: ecErr.message }, { status: 500 });

  const courts: CourtInfo[] = (ec ?? []).map((r) => r.courts);

  const cntRes = await supabase
    .from("event_rsvps")
    .select("*", { head: true, count: "exact" })
    .eq("event_id", params.id);

  const teamsCount = cntRes.count ?? 0;
  const cntErr = cntRes.error;
  if (cntErr) return NextResponse.json({ error: cntErr.message }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  let isJoined = false;

  if (user) {
    const mineRes = await supabase
      .from("event_rsvps")
      .select("id")
      .eq("event_id", params.id)
      .eq("user_id", user.id)
      .limit(1);

    const mine = mineRes.data as { id: string }[] | null;
    isJoined = !!(mine && mine.length > 0);
  }

  return NextResponse.json({
    event: ev,
    teamsCount,
    rsvpCount: teamsCount, // compat
    capacity_teams: ev.capacity_teams ?? null,
    team_size: ev.team_size ?? null,
    isJoined,
    courts,
  });
}
