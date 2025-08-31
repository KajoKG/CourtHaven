// app/events/EventsPageClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type EventItem = {
  id: string;
  title: string;
  sport: string;
  description: string | null;
  start_at: string; // ISO
  end_at: string;   // ISO
  city: string | null;       // derived via first court
  address: string | null;    // derived via first court
  image_url: string | null;  // derived via first court
};

type ApiResp = { events: EventItem[]; total: number; hasMore: boolean };

function fmtRange(startISO: string, endISO?: string | null) {
  const tz = "Europe/Zagreb";
  const start = new Date(startISO);
  const end = endISO ? new Date(endISO) : null;

  const dFmt = new Intl.DateTimeFormat("hr-HR", {
    timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric",
  });
  const tFmt = new Intl.DateTimeFormat("hr-HR", {
    timeZone: tz, hour: "2-digit", minute: "2-digit",
  });

  if (end && start.toDateString() !== end.toDateString()) {
    return `${dFmt.format(start)} ${tFmt.format(start)} – ${dFmt.format(end)} ${tFmt.format(end)}`;
  }
  if (end) return `${dFmt.format(start)} ${tFmt.format(start)} – ${tFmt.format(end)}`;
  return `${dFmt.format(start)} ${tFmt.format(start)}`;
}

function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

export default function EventsPageClient() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const [sport, setSport] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");

  const [offset, setOffset] = useState(0);
  const limit = 12;

  const dq = useDebounced(q, 400);
  const dcity = useDebounced(city, 400);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (sport) p.set("sport", sport);
    if (from)  p.set("from", from);
    if (to)    p.set("to", to);
    if (dcity) p.set("city", dcity);
    if (dq)    p.set("q", dq);
    p.set("limit", String(limit));
    p.set("offset", String(offset));
    return p.toString();
  }, [sport, from, to, dcity, dq, offset]);

  const fetchEvents = async (reset = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/search?${qs}`, { cache: "no-store" });
      const json: ApiResp = await res.json();
      if (!res.ok) throw new Error((json as any).error || "Failed to load events");
      setTotal(json.total);
      setHasMore(json.hasMore);
      setEvents((prev) => (reset ? json.events : [...prev, ...json.events]));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    setEvents([]);
  }, [sport, from, to, dcity, dq]);

  useEffect(() => {
    fetchEvents(offset === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-4xl font-bold text-gray-900">Explore Our Events</h1>
          <p className="text-gray-600">Discover exciting events and activities. Join the fun!</p>
        </div>

        {/* Filters */}
        <div className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border bg-white p-4 md:grid-cols-6">
          <div className="md:col-span-1">
            <label className="mb-1 block text-xs font-medium text-gray-700">Sport</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full rounded-lg border p-2.5"
            >
              <option value="">All</option>
              <option value="tennis">Tennis</option>
              <option value="padel">Padel</option>
              <option value="football">Football</option>
              <option value="basketball">Basketball</option>
              <option value="badminton">Badminton</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border p-2.5" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border p-2.5" />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">City</label>
            <input type="text" placeholder="Zagreb…" value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-lg border p-2.5" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Search</label>
            <input type="text" placeholder="Title or description…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded-lg border p-2.5" />
          </div>
        </div>

        {/* Count */}
        <div className="mb-4 text-sm text-gray-500">
          {total > 0 ? `${total} event${total === 1 ? "" : "s"} found` : "No results yet"}
        </div>

        {/* Grid */}
        {events.length === 0 && !loading ? (
          <div className="rounded-2xl border bg-white p-10 text-center text-gray-600">
            No events — try a different filter.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => (
              <li key={ev.id} className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ev.image_url || "/images/events/placeholder.jpg"}
                  alt={ev.title}
                  className="h-44 w-full object-cover transition group-hover:scale-[1.02]"
                />
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="line-clamp-1 text-lg font-semibold">{ev.title}</h3>
                    <span className="rounded-full border px-2 py-0.5 text-xs text-gray-700">
                      {ev.sport}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700">{fmtRange(ev.start_at, ev.end_at)}</div>
                  {(ev.city || ev.address) && (
                    <div className="text-sm text-gray-600">
                      {ev.city || ""}{ev.city && ev.address ? " • " : ""}{ev.address || ""}
                    </div>
                  )}
                  {ev.description && <p className="line-clamp-2 text-sm text-gray-600">{ev.description}</p>}
                  <div className="pt-2">
                    <Link href={`/events/${ev.id}`} className="inline-flex items-center rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black">
                      View details
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Load more */}
        <div className="mt-8 flex justify-center">
          {hasMore && (
            <button
              onClick={() => setOffset((o) => o + limit)}
              disabled={loading}
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
