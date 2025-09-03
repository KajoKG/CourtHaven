import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

type RSVPTeamPayload = {
  partner_full_name?: string;
  member2_full_name?: string;
  member3_full_name?: string;
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Partial<{
    partner_full_name: string;
    member2_full_name: string;
    member3_full_name: string;
  }>;

  // dohvat eventa radi team_size/capacity
  const { data: ev, error: evErr } = await supabase
    .from("events")
    .select("id,sport,team_size,capacity_teams")
    .eq("id", params.id)
    .single();
  if (evErr || !ev) return NextResponse.json({ error: evErr?.message ?? "Event not found" }, { status: 404 });

  const teamSize = ev.team_size ?? (ev.sport === "padel" ? 2 : ev.sport === "basketball" ? 3 : 1);

  // validacija imena po team_size
  const payload: RSVPTeamPayload = {};
  if (teamSize === 2) {
    const partner = String(body?.partner_full_name || "").trim();
    if (!partner) return NextResponse.json({ error: "Please enter your partner’s full name." }, { status: 400 });
    payload.partner_full_name = partner;
  } else if (teamSize === 3) {
    const m2 = String(body?.member2_full_name || "").trim();
    const m3 = String(body?.member3_full_name || "").trim();
    if (!m2 || !m3) return NextResponse.json({ error: "Enter full names of both teammates." }, { status: 400 });
    payload.member2_full_name = m2;
    payload.member3_full_name = m3;
  }

  // jesam li već prijavljen
  const { data: mine } = await supabase
    .from("event_rsvps")
    .select("id")
    .eq("event_id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (mine) return NextResponse.json({ error: "Already joined" }, { status: 409 });

  // kapacitet
  if (ev.capacity_teams && ev.capacity_teams > 0) {
    const { count } = await supabase
      .from("event_rsvps")
      .select("*", { head: true, count: "exact" })
      .eq("event_id", params.id);
    if ((count ?? 0) >= ev.capacity_teams) {
      return NextResponse.json({ error: "Event is full" }, { status: 409 });
    }
  }

  const { error: insErr } = await supabase
    .from("event_rsvps")
    .insert({ event_id: params.id, user_id: user.id, payload });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase
    .from("event_rsvps")
    .delete()
    .eq("event_id", params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
