// app/api/events/[id]/rsvp/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase.from("event_rsvps").insert({
    event_id: params.id,
    user_id: user.id,
  });

  if (error) {
    // unique violation → već je prijavljen
    const isDuplicate = error.message?.toLowerCase().includes("duplicate") || error.code === "23505";
    return NextResponse.json(
      { error: isDuplicate ? "Already joined" : error.message },
      { status: isDuplicate ? 409 : 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase
    .from("event_rsvps")
    .delete()
    .eq("event_id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
