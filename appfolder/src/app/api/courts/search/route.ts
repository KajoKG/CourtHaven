import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function toISO(date: string, hour?: number, duration?: number) {
  if (!date || hour == null || !duration) return null
  const start = new Date(date)
  start.setHours(hour, 0, 0, 0)
  const end = new Date(start.getTime() + duration * 3600 * 1000)
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sport = searchParams.get('sport') || undefined
  const date  = searchParams.get('date')  || undefined       // 'YYYY-MM-DD'
  const hour  = searchParams.get('hour')  ? Number(searchParams.get('hour')) : undefined
  const duration = searchParams.get('duration') ? Number(searchParams.get('duration')) : undefined

  // 1) Dohvati sve terene (po sportu ako zadano) + cijenu
  //    (select '*' će povući i price_per_hour koji smo dodali u courts)
  let q = supabase.from('courts').select('*')
  if (sport) q = q.eq('sport', sport)
  const { data: courts, error: courtsErr } = await q
  if (courtsErr) return NextResponse.json({ error: courtsErr.message }, { status: 500 })

  // Helper za obogaćivanje rezultata cijenom/offerom
  const enrich = (court: any, slotStart?: Date) => {
    const base = Number(court.price_per_hour ?? 0)
    return {
      ...court,
      price_per_hour: base,
      effective_price_per_hour: base,
      active_offer: null as null | {
        id: string
        title: string | null
        discount_pct: number | null
        starts_at: string
        ends_at: string
        valid_hour_start: number | null
        valid_hour_end: number | null
        price: number | null
        original_price: number | null
      }
    }
  }

  // ako nema datuma/sata -> vrati sve po sportu (bez provjere zauzeća), ali s base cijenom
  if (!date || hour == null || !duration) {
    const enriched = (courts ?? []).map((c) => enrich(c))
    return NextResponse.json({ available: enriched, conflicting: [] })
  }

  const iso = toISO(date, hour, duration)!
  const slotStart = new Date(iso.start)
  const slotEnd   = new Date(iso.end)

  // 2) Bookinzi tog dana i tih terena
  const ids = courts.map(c => c.id as string)
  const dayStart = new Date(date); dayStart.setHours(0,0,0,0)
  const dayEnd   = new Date(dayStart.getTime() + 24*3600*1000)

  const { data: bookings, error: bErr } = await supabase
    .from('bookings')
    .select('id,court_id,start_at,end_at')
    .in('court_id', ids)
    .gte('start_at', dayStart.toISOString())
    .lt('start_at',  dayEnd.toISOString())

  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })

  // 2b) Event windows za te terene (isti dan)
  // V1: shema gdje event_windows ima court_id
  const { data: win1 } = await supabase
    .from('event_windows')
    .select('court_id,start_at,end_at')
    .in('court_id', ids)
    .gte('start_at', dayStart.toISOString())
    .lt('start_at',  dayEnd.toISOString())

  // V2: starija shema bez court_id, ide preko event_courts (inner join)
  const { data: win2 } = await supabase
    .from('event_windows')
    .select('start_at,end_at,event_courts!inner(court_id)')
    .in('event_courts.court_id', ids)
    .gte('start_at', dayStart.toISOString())
    .lt('start_at',  dayEnd.toISOString())

  const windows: any[] = [...(win1 ?? []), ...(win2 ?? [])]

  // 3) Izračun preklapanja
  const overlaps = new Set<string>()

  // a) s postojećim booking-ima
  bookings?.forEach(b => {
    const aStart = new Date(b.start_at as string).getTime()
    const aEnd   = new Date(b.end_at   as string).getTime()
    const bStart = slotStart.getTime()
    const bEnd   = slotEnd.getTime()
    if (aStart < bEnd && bStart < aEnd) overlaps.add(b.court_id as string)
  })

  // b) s event window-ima
  ;(windows ?? []).forEach((w: any) => {
    const eStart = new Date(w.start_at as string).getTime()
    const eEnd   = new Date(w.end_at   as string).getTime()
    const bStart = slotStart.getTime()
    const bEnd   = slotEnd.getTime()
    const clash = eStart < bEnd && bStart < eEnd

    const cid: string | undefined =
      (w.court_id as string | undefined) ??
      (w.event_courts && (w.event_courts as any).court_id)

    if (clash && cid) overlaps.add(cid)
  })

  // 4) Podjela na available / conflicting (još bez cijena/ponuda)
  const availableRaw   = courts.filter(c => !overlaps.has(c.id as string))
  const conflictingRaw = courts.filter(c =>  overlaps.has(c.id as string))

  // 5) Nađi aktivne ponude za zadani slot start (jednim upitom za sve court-ove)
  const { data: slotOffers } = await supabase
    .from('offers')
    .select('id,court_id,title,discount_pct,starts_at,ends_at,valid_hour_start,valid_hour_end,price,original_price')
    .in('court_id', ids)
    .lte('starts_at', slotStart.toISOString())
    .gt('ends_at', slotStart.toISOString())

  const offersByCourt = new Map<string, any[]>()
  ;(slotOffers ?? []).forEach((o: any) => {
    const arr = offersByCourt.get(o.court_id) ?? []
    arr.push(o)
    offersByCourt.set(o.court_id, arr)
  })

  // helper: izaberi offer koji pokriva zadani hour (ako satni prozor postoji)
  const chooseOfferForHour = (courtId: string, hourNum: number) => {
    const list = offersByCourt.get(courtId) ?? []
    return list.find((o: any) => {
      const hs = o.valid_hour_start
      const he = o.valid_hour_end
      if (hs == null || he == null) return true // nema ograničenja po satu → cijeli dan
      return hourNum >= hs && hourNum < he
    }) || null
  }

  const slotHour = slotStart.getHours()

  // 6) Obogati rezultat cijenom i offerom
  const decorate = (c: any) => {
    const base = Number(c.price_per_hour ?? 0)
    const o = chooseOfferForHour(c.id as string, slotHour)
    if (o && o.discount_pct != null) {
      const eff = Math.round(100 * (base * (1 - o.discount_pct / 100))) / 100
      return {
        ...c,
        price_per_hour: base,
        effective_price_per_hour: eff,
        active_offer: {
          id: o.id,
          title: o.title ?? null,
          discount_pct: o.discount_pct ?? null,
          starts_at: o.starts_at,
          ends_at: o.ends_at,
          valid_hour_start: o.valid_hour_start ?? null,
          valid_hour_end: o.valid_hour_end ?? null,
          price: o.price ?? null,
          original_price: o.original_price ?? null,
        }
      }
    }
    return {
      ...c,
      price_per_hour: base,
      effective_price_per_hour: base,
      active_offer: null
    }
  }

  const available   = availableRaw.map(decorate)
  const conflicting = conflictingRaw.map(decorate)

  return NextResponse.json({ available, conflicting })
}
