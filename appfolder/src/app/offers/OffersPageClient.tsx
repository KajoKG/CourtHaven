"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Court = {
  id: string;
  name: string;
  sport: string;
  address: string;
  city: string;
  image_url: string | null;
};

type Offer = {
  id: string;
  title: string | null;
  description: string | null;
  discount_pct: number | null;
  original_price: number | null;
  price: number | null;
  starts_at: string;
  ends_at: string;
  featured: boolean;
  valid_hour_start?: number | null;
  valid_hour_end?: number | null;
  court: Court;
};

type ApiResp = { offers: Offer[]; total: number; hasMore: boolean };

// helper: nađi prvi sljedeći termin koji zadovoljava offer (satni prozor + ends_at)
function suggestSlotForOffer(o: Offer): { date: string; hour: string } | null {
  const now = new Date();
  const end = new Date(o.ends_at);
  if (now >= end) return null;

  let day = new Date(now);
  day.setHours(0, 0, 0, 0);

  const hs = o.valid_hour_start ?? 7;
  const he = o.valid_hour_end ?? 24;

  for (let d = 0; d < 14; d++) {
    const base = new Date(day.getTime() + d * 24 * 3600 * 1000);
    let startHour = hs;
    if (d === 0) {
      const nextHour = now.getMinutes() > 0 ? now.getHours() + 1 : now.getHours();
      startHour = Math.max(hs, nextHour);
    }
    for (let h = startHour; h < he; h++) {
      const slot = new Date(base);
      slot.setHours(h, 0, 0, 0);
      if (slot > end) return null;
      const yyyy = slot.toISOString().split("T")[0];
      return { date: yyyy, hour: String(h) };
    }
  }
  return null;
}

export default function OffersPageClient() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const [sport, setSport] = useState("");
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"endsSoon" | "discount" | "price">("endsSoon");

  // auth state
  const [isAuthed, setIsAuthed] = useState(false);

  // booking modal
  const [bookingCourt, setBookingCourt] = useState<Court | null>(null);
  const [prefill, setPrefill] = useState<{ date: string; hour: string } | null>(null);

  const [offset, setOffset] = useState(0);
  const limit = 12;

  // provjera prijave (lightweight)
  useEffect(() => {
    const supabase = createClientComponentClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setIsAuthed(!!data.user))
      .catch(() => setIsAuthed(false));
  }, []);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (sport) p.set("sport", sport);
    if (city) p.set("city", city);
    if (q) p.set("q", q);
    p.set("sort", sort);
    p.set("limit", String(limit));
    p.set("offset", String(offset));
    return p.toString();
  }, [sport, city, q, sort, offset]);

  const load = async (reset = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/offers/search?${qs}`, { cache: "no-store" });
      const json: ApiResp = await res.json();
      if (!res.ok) throw new Error((json as any).error || "Failed to load offers");
      setTotal(json.total);
      setHasMore(json.hasMore);
      setOffers((prev) => (reset ? json.offers : [...prev, ...json.offers]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    setOffers([]);
  }, [sport, city, q, sort]);
  useEffect(() => {
    load(offset === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  const fmtEndsIn = (endsISO: string) => {
    const now = new Date();
    const end = new Date(endsISO);
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return "Ended";
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `Ends in ${mins} min`;
    const hrs = Math.round(mins / 60);
    if (hrs < 48) return `Ends in ${hrs} h`;
    const days = Math.round(hrs / 24);
    return `Ends in ${days} d`;
  };

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Offers</h1>
          <p className="text-gray-600">Discover discounted courts and special packages.</p>
        </div>

        {/* Filters */}
        <div className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border bg-white p-4 md:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Sport</label>
            <select value={sport} onChange={(e) => setSport(e.target.value)} className="w-full rounded-lg border p-2.5">
              <option value="">All</option>
              <option value="tennis">Tennis</option>
              <option value="padel">Padel</option>
              <option value="football">Football</option>
              <option value="basketball">Basketball</option>
              <option value="badminton">Badminton</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Zagreb…" className="w-full rounded-lg border p-2.5" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">Search</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Court or offer…" className="w-full rounded-lg border p-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Sort</label>
            <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="w-full rounded-lg border p-2.5">
              <option value="endsSoon">Ending soon</option>
              <option value="discount">Biggest discount</option>
              <option value="price">Lowest price</option>
            </select>
          </div>
        </div>

        {/* Count */}
        <div className="mb-4 text-sm text-gray-500">
          {total > 0 ? `${total} offer${total === 1 ? "" : "s"} found` : "No results yet"}
        </div>

        {/* Grid */}
        {offers.length === 0 && !loading ? (
          <div className="rounded-2xl border bg-white p-10 text-center text-gray-600">No active offers — try a different filter.</div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {offers.map((o) => (
              <li key={o.id} className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.court.image_url || "/images/courts/placeholder.jpg"} alt={o.court.name} className="h-44 w-full object-cover transition group-hover:scale-[1.02]" />
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="line-clamp-1 text-lg font-semibold">{o.court.name}</h3>
                    {o.discount_pct != null && (
                      <span className="rounded-full border px-2 py-0.5 text-xs text-green-700">{`-${o.discount_pct}%`}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-700">
                    {o.court.city} • {o.court.address}
                  </div>

                  {(o.price != null || o.original_price != null) && (
                    <div className="flex items-baseline gap-2">
                      {o.price != null && <div className="text-lg font-semibold">{o.price.toFixed(2)} €</div>}
                      {o.original_price != null && <div className="text-sm text-gray-500 line-through">{o.original_price.toFixed(2)} €</div>}
                    </div>
                  )}

                  <div className="text-xs text-gray-600">{fmtEndsIn(o.ends_at)}</div>
                  {o.description && <p className="line-clamp-2 text-sm text-gray-600">{o.description}</p>}

                  <div className="pt-2">
                    {isAuthed ? (
                      <button
                        onClick={() => {
                          setBookingCourt(o.court);
                          setPrefill(suggestSlotForOffer(o));
                        }}
                        className="inline-flex items-center rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
                      >
                        Book
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        className="inline-flex items-center rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                      >
                        Log in to book
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Load more */}
        <div className="mt-8 flex justify-center">
          {hasMore && (
            <button onClick={() => setOffset((o) => o + limit)} disabled={loading} className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
              {loading ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      </div>

      {/* Booking modal (lazy import) – render samo kad je user prijavljen */}
      <Suspense fallback={null}>
        {isAuthed && bookingCourt && (
          <LazyBookingModal
            court={bookingCourt}
            prefill={prefill}
            onClose={() => {
              setBookingCourt(null);
              setPrefill(null);
            }}
          />
        )}
      </Suspense>
    </main>
  );
}

function LazyBookingModal({
  court,
  prefill,
  onClose,
}: {
  court: Court;
  prefill: { date: string; hour: string } | null;
  onClose: (changed?: boolean) => void;
}) {
  const [Comp, setComp] = useState<any>(null);
  useEffect(() => {
    import("@/components/CourtBookingModal").then((m) => setComp(() => m.default));
  }, []);
  if (!Comp) return null;
  return <Comp court={court} initialDate={prefill?.date} initialHour={prefill?.hour} onClose={onClose} />;
}


