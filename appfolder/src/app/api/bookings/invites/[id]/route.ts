// app/api/bookings/invites/[id]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

/* ---------- Minimal joined types ---------- */
type Court = { name?: string | null; city?: string | null };
type Booking = {
  id?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  courts?: Court[] | Court | null;
};
type InviteeProfile = {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};
type InviteStatus = "pending" | "accepted" | "declined" | "left" | string;
type InviteJoined = {
  id: string;
  inviter_id?: string | null;
  invitee_id?: string | null;
  booking_id?: string | null;
  status: InviteStatus;
  bookings?: Booking[] | Booking | null;
  invitee?: InviteeProfile[] | InviteeProfile | null;
};

/* ---------- Helpers ---------- */
// Uzmi prvi element ako je array, inače vrati vrijednost
function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// Izvuci booking + court info iz potencijalnih array-eva
function extractBookingCourt(inv: InviteJoined) {
  const booking = one<Booking>(inv.bookings ?? null);
  const court = one<Court>(booking?.courts ?? null);

  return {
    booking_id: booking?.id ?? inv.booking_id ?? null,
    start_at: booking?.start_at ?? null,
    end_at: booking?.end_at ?? null,
    court_name: court?.name ?? null,
    city: court?.city ?? null,
  };
}

// Izvuci invitee profil (možda dođe kao array)
function extractInvitee(inv: InviteJoined, fallbackUserId?: string) {
  const invitee = one<InviteeProfile>(inv.invitee ?? null);
  return {
    invitee_id: invitee?.id ?? inv.invitee_id ?? fallbackUserId ?? null,
    invitee_name: invitee?.full_name ?? null,
    invitee_email: invitee?.email ?? null,
    invitee_avatar_url: invitee?.avatar_url ?? null,
  };
}

/**
 * PATCH /api/bookings/invites/:id
 * Body: { action: "accept" | "decline" }
 * Dozvoljeno: invitee (korisnik koji je pozvan), i to samo dok je status "pending".
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = (body as { action?: "accept" | "decline" }).action;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Učitaj invite + joinane podatke radi notifikacije (mogu biti array-i)
  const invRes = await supabase
    .from("booking_invites")
    .select(`
      id, inviter_id, invitee_id, booking_id, status,
      bookings(id,start_at,end_at,courts(name,city)),
      invitee:profiles!booking_invites_invitee_id_fkey(id,full_name,email,avatar_url)
    `)
    .eq("id", params.id)
    .single();

  const inv = invRes.data as InviteJoined | null;
  const invErr = invRes.error;

  if (invErr || !inv) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (inv.invitee_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (inv.status !== "pending") {
    return NextResponse.json({ error: "Invite is not pending" }, { status: 409 });
  }

  const newStatus: "accepted" | "declined" = action === "accept" ? "accepted" : "declined";

  const { error: updErr } = await supabase
    .from("booking_invites")
    .update({ status: newStatus })
    .eq("id", params.id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  // Ako je ACCEPT → notifikacija vlasniku (inviteru)
  if (newStatus === "accepted" && inv.inviter_id) {
    const { booking_id, start_at, court_name, city } = extractBookingCourt(inv);
    const { invitee_id, invitee_name, invitee_email } = extractInvitee(inv, user.id);

    // best-effort, ignoriramo error
    await supabase.from("notifications").insert({
      user_id: inv.inviter_id,
      type: "invite_accepted",
      payload: {
        booking_id,
        court_name,
        city,
        start_at,
        invitee_id,
        invitee_name,
        invitee_email,
      },
    });
  }

  return NextResponse.json({ ok: true, status: newStatus });
}

/**
 * DELETE /api/bookings/invites/:id
 * "Leave" pozvani termin nakon što je već prihvaćen.
 * Dozvoljeno: invitee; status mora biti "accepted".
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const invRes = await supabase
    .from("booking_invites")
    .select(`
      id, inviter_id, invitee_id, booking_id, status,
      bookings(id,start_at,end_at,courts(name,city)),
      invitee:profiles!booking_invites_invitee_id_fkey(id,full_name,email,avatar_url)
    `)
    .eq("id", params.id)
    .single();

  const inv = invRes.data as InviteJoined | null;
  const invErr = invRes.error;

  if (invErr || !inv) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (inv.invitee_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (inv.status !== "accepted") {
    return NextResponse.json({ error: "Only accepted invites can be left" }, { status: 409 });
  }

  // Promijeni status u "left"
  const { error: updErr } = await supabase
    .from("booking_invites")
    .update({ status: "left" })
    .eq("id", params.id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  // Notifikacija vlasniku (inviteru)
  if (inv.inviter_id) {
    const { booking_id, start_at, court_name, city } = extractBookingCourt(inv);
    const { invitee_id, invitee_name, invitee_email } = extractInvitee(inv, user.id);

    await supabase.from("notifications").insert({
      user_id: inv.inviter_id,
      type: "invite_left",
      payload: {
        booking_id,
        court_name,
        city,
        start_at,
        invitee_id,
        invitee_name,
        invitee_email,
      },
    });
  }

  return NextResponse.json({ ok: true, status: "left" });
}
