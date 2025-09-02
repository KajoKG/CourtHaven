import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

// POST: create invites { booking_id, invitee_ids: string[] }
export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { booking_id, invitee_ids } = await req.json();
  if (!booking_id || !Array.isArray(invitee_ids) || invitee_ids.length === 0) {
    return NextResponse.json({ error: "booking_id and invitee_ids[] are required" }, { status: 400 });
  }

  // owner check
  const { data: b, error: bErr } = await supabase
    .from("bookings")
    .select("id,user_id")
    .eq("id", booking_id)
    .single();
  if (bErr || !b) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (b.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = invitee_ids.map((iid: string) => ({
    booking_id,
    inviter_id: user.id,
    invitee_id: iid,
    status: "pending" as const,
  }));

  const { data, error } = await supabase
    .from("booking_invites")
    .upsert(rows, { onConflict: "booking_id,invitee_id", ignoreDuplicates: true })
    .select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ invites: data ?? [] });
}

// GET: my pending invites
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("booking_invites")
    .select(`
      id,status,created_at,
      bookings!inner(id,start_at,end_at,courts(name,sport,address,city,image_url)),
      inviter:profiles!booking_invites_inviter_id_fkey(id,full_name,email,avatar_url)
    `)
    .eq("invitee_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ invites: data ?? [] });
}
