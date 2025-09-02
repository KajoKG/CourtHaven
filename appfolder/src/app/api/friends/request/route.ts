import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // nađi addressee po profiles.email
  const { data: target, error: pErr } = await supabase
    .from("profiles").select("id,email").ilike("email", email).maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.id === user.id) return NextResponse.json({ error: "You cannot add yourself" }, { status: 400 });

  // provjeri postoji li već veza
  const pairA = `${user.id}:${target.id}`;
  const pairB = `${target.id}:${user.id}`;

  const { data: existing, error: exErr } = await supabase
    .from("friendships")
    .select("id, requester, addressee, status")
    .or(`and(requester.eq.${user.id},addressee.eq.${target.id}),and(requester.eq.${target.id},addressee.eq.${user.id})`);
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 400 });
  if (existing && existing.length > 0) {
    const rel = existing[0];
    if (rel.status === "accepted") return NextResponse.json({ error: "Already friends" }, { status: 409 });
    if (rel.requester === user.id) return NextResponse.json({ error: "Request already sent" }, { status: 409 });
    if (rel.addressee === user.id) return NextResponse.json({ error: "You already have a pending request from this user" }, { status: 409 });
  }

  const { error: insErr, data } = await supabase
    .from("friendships")
    .insert({ requester: user.id, addressee: target.id, status: "pending" })
    .select("id")
    .single();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, id: data?.id });
}
