import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  const body = (await req.json()) as {
    court_id: string;
    date: string;          // YYYY-MM-DD
    hour: number;          // 7..23
    duration: 1 | 2 | 3;
  };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const start = new Date(body.date); start.setHours(body.hour, 0, 0, 0);
  const end   = new Date(start.getTime() + body.duration * 3600 * 1000);

  // PRE-CHECK: overlap s postojećim booking-ima
  const { data: overlaps, error: ovErr } = await supabase
    .from('bookings')
    .select('id')
    .eq('court_id', body.court_id)
    .lt('start_at', end.toISOString())
    .gt('end_at',   start.toISOString());

  if (ovErr) {
    return NextResponse.json({ error: ovErr.message }, { status: 400 });
  }
  if (overlaps && overlaps.length > 0) {
    return NextResponse.json(
      { error: 'Court is already booked for the selected time.' },
      { status: 409 }
    );
  }

  // CIJENA: base €/h s terena
  const { data: courtRow, error: courtErr } = await supabase
    .from('courts')
    .select('price_per_hour')
    .eq('id', body.court_id)
    .single();

  if (courtErr || !courtRow) {
    return NextResponse.json({ error: courtErr?.message || 'Court not found' }, { status: 400 });
  }

  const basePerHour = Number(courtRow.price_per_hour ?? 0);

  // OFFER: postoji li aktivna ponuda za taj slot (datum + sat)
  const { data: offs, error: offErr } = await supabase
    .from('offers')
    .select('id,discount_pct,starts_at,ends_at,valid_hour_start,valid_hour_end')
    .eq('court_id', body.court_id)
    .lte('starts_at', start.toISOString())
    .gt('ends_at',    start.toISOString());

  if (offErr) {
    return NextResponse.json({ error: offErr.message }, { status: 400 });
  }

  const hour = start.getHours();
  const matchedOffer = (offs ?? []).find(o => {
    const hs = (o as any).valid_hour_start as number | null;
    const he = (o as any).valid_hour_end as number | null;
    const hourOk = (hs == null || he == null) ? true : (hour >= hs && hour < he);
    return hourOk;
  }) || null;

  let effectivePerHour = basePerHour;
  let applied_offer_id: string | null = null;

  if (matchedOffer && matchedOffer.discount_pct != null) {
    effectivePerHour = round2(basePerHour * (1 - (matchedOffer.discount_pct as number) / 100));
    applied_offer_id = matchedOffer.id as string;
  }

  const price_eur = round2(effectivePerHour * body.duration);

  // INSERT
  const { error } = await supabase.from('bookings').insert({
    court_id: body.court_id,
    user_id: user.id,
    start_at: start.toISOString(),
    end_at:   end.toISOString(),
    price_eur,
    applied_offer_id
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, price_eur, applied_offer_id });
}

// GET /api/bookings  → moji budući bookinzi (najbliži prvi)
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('bookings')
    .select('id,start_at,end_at,price_eur,applied_offer_id,courts(name,sport,address,city,image_url)')
    .eq('user_id', user.id)
    .gte('end_at', new Date().toISOString())
    .order('start_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ bookings: data ?? [] });
}

// DELETE /api/bookings  → otkaži moj booking
export async function DELETE(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await req.json() as { id: string };

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // sigurnost: može brisati samo svoj

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
