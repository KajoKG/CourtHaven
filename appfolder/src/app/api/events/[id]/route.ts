// app/api/events/[id]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  const { data: ev, error: evErr } = await supabase
    .from("events")
    .select("id,title,sport,description,start_at,end_at")
    .eq("id", params.id)
    .single();

  if (evErr || !ev) {
    return NextResponse.json({ error: evErr?.message ?? "Not found" }, { status: 404 });
  }

  // courts for this event
  const { data: ec, error: ecErr } = await supabase
    .from("event_courts")
    .select("court_id,courts!inner(name,city,address,image_url)")
    .eq("event_id", params.id);
  if (ecErr) return NextResponse.json({ error: ecErr.message }, { status: 500 });

  const courts = (ec ?? []).map(row => (row as any).courts);

  const { count: rsvpCount, error: countErr } = await supabase
    .from("event_rsvps")
    .select("*", { count: "exact", head: true })
    .eq("event_id", params.id);
  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });

  let isJoined = false;
  if (user) {
    const { data: mine } = await supabase
      .from("event_rsvps")
      .select("id")
      .eq("event_id", params.id)
      .eq("user_id", user.id)
      .limit(1);
    isJoined = !!(mine && mine.length > 0);
  }

  return NextResponse.json({
    event: ev,
    rsvpCount: rsvpCount ?? 0,
    isJoined,
    courts,
  });
}
