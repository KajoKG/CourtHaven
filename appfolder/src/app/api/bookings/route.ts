import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/* ---------- Helpers & Types ---------- */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

type OfferRow = {
  id: string;
  discount_pct: number | null;
  starts_at: string;
  ends_at: string;
  valid_hour_start: number | null;
  valid_hour_end: number | null;
};

type CourtInfo = {
  name?: string | null;
  sport?: string | null;
  address?: string | null;
  city?: string | null;
  image_url?: string | null;
};
type CourtJoin = CourtInfo | CourtInfo[] | null;

type BookingBase = {
  id: string;
  start_at: string;
  end_at: string;
  price_eur: number;
  applied_offer_id: string | null;
  user_id: string;
  courts?: CourtJoin;
};

type OwnedBookingRow = BookingBase;

type InvitedRow = {
  id: string;          // invite id
  status: 'accepted' | 'pending' | 'declined' | 'left' | string;
  bookings: BookingBase | BookingBase[]; // inner join
};

type UnifiedBooking = BookingBase & {
  role: 'owner' | 'guest';
  can_cancel: boolean;
  can_leave: boolean;
  invite_id: string | null;
};

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  const body = (await req.json()) as
    | { court_id: string; start_at: string; end_at: string }
    | { court_id: string; date: string; hour: number; duration: 1 | 2 | 3 };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // --- Preferiramo start_at/end_at iz browsera; fallback na stari način ---
  let start: Date;
  let end: Date;

  if ("start_at" in body && "end_at" in body) {
    start = new Date(body.start_at);
    end   = new Date(body.end_at);
  } else {
    const [y, m, d] = body.date.split('-').map(Number);
    start = new Date(y, m - 1, d, body.hour, 0, 0, 0);
    end   = new Date(start.getTime() + body.duration * 3600 * 1000);
  }

  // overlap check (strogi overlap: start_at < end && end_at > start)
  const { data: overlaps, error: ovErr } = await supabase
    .from('bookings')
    .select('id')
    .eq('court_id', body.court_id)
    .lt('start_at', end.toISOString())
    .gt('end_at',   start.toISOString());

  if (ovErr) return NextResponse.json({ error: ovErr.message }, { status: 400 });
  if ((overlaps?.length ?? 0) > 0) {
    return NextResponse.json({ error: 'Court is already booked for the selected time.' }, { status: 409 });
  }

  // price
  const { data: courtRow, error: courtErr } = await supabase
    .from('courts')
    .select('price_per_hour')
    .eq('id', body.court_id)
    .single();

  if (courtErr || !courtRow) {
    return NextResponse.json({ error: courtErr?.message || 'Court not found' }, { status: 400 });
  }

  const basePerHour = Number(courtRow.price_per_hour ?? 0);

  // offer (optional) – aktivna u trenutku starta
  const { data: offs, error: offErr } = await supabase
    .from('offers')
    .select('id,discount_pct,starts_at,ends_at,valid_hour_start,valid_hour_end')
    .eq('court_id', body.court_id)
    .lte('starts_at', start.toISOString())
    .gt('ends_at',    start.toISOString());

  if (offErr) return NextResponse.json({ error: offErr.message }, { status: 400 });

  const offers = (offs ?? []) as OfferRow[];
  const hour = start.getHours();
  const matchedOffer: OfferRow | null =
    offers.find((o) => {
      const { valid_hour_start: hs, valid_hour_end: he } = o;
      const hourOk = hs == null || he == null ? true : (hour >= hs && hour < he);
      return hourOk;
    }) ?? null;

  let effectivePerHour = basePerHour;
  let applied_offer_id: string | null = null;
  if (matchedOffer && matchedOffer.discount_pct != null) {
    effectivePerHour = round2(basePerHour * (1 - matchedOffer.discount_pct / 100));
    applied_offer_id = matchedOffer.id;
  }

  // trajanje u satima (izračun iz datuma)
  const durationHours = Math.max(1, Math.round((end.getTime() - start.getTime()) / 3600000));
  const price_eur = round2(effectivePerHour * durationHours);

  const { data: ins, error } = await supabase
    .from('bookings')
    .insert({
      court_id: body.court_id,
      user_id: user.id,
      start_at: start.toISOString(),
      end_at:   end.toISOString(),
      price_eur,
      applied_offer_id
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, id: (ins as { id: string }).id, price_eur, applied_offer_id });
}

/** GET → owner + accepted guest bookinzi (budući) */
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const nowIso = new Date().toISOString();

  // owner
  const { data: owned, error: ownedErr } = await supabase
    .from('bookings')
    .select('id,start_at,end_at,price_eur,applied_offer_id,user_id,courts(name,sport,address,city,image_url)')
    .eq('user_id', user.id)
    .gte('end_at', nowIso)
    .order('start_at', { ascending: true });

  if (ownedErr) return NextResponse.json({ error: ownedErr.message }, { status: 400 });

  // guest (accepted invites)
  const { data: invited, error: invErr } = await supabase
    .from('booking_invites')
    .select(`
      id,status,
      bookings!inner(id,start_at,end_at,price_eur,applied_offer_id,user_id,courts(name,sport,address,city,image_url))
    `)
    .eq('invitee_id', user.id)
    .eq('status', 'accepted')
    .gte('bookings.end_at', nowIso)
    .order('start_at', { ascending: true, referencedTable: 'bookings' });

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 });

  const ownerBookings: UnifiedBooking[] = (owned as OwnedBookingRow[] | null ?? []).map((b) => ({
    ...b,
    role: 'owner' as const,
    can_cancel: true,
    can_leave: false,
    invite_id: null,
  }));

  const guestBookings: UnifiedBooking[] = (invited as InvitedRow[] | null ?? []).map((r) => {
    const b = one<BookingBase>(r.bookings)!;
    return {
      ...b,
      role: 'guest',
      can_cancel: false,
      can_leave: true,
      invite_id: r.id,
    };
  });

  const map = new Map<string, UnifiedBooking>();
  [...ownerBookings, ...guestBookings].forEach(b => map.set(b.id, b));
  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );

  return NextResponse.json({ bookings: merged });
}

/** DELETE → može otkazati samo owner */
export async function DELETE(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await req.json() as { id: string };

  const { data: b, error: bErr } = await supabase
    .from('bookings')
    .select('id,user_id')
    .eq('id', id)
    .single();
  if (bErr || !b) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (b.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
