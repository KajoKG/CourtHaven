"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Booking = {
  id: string;
  start_at: string;
  end_at: string;
  courts: {
    name: string;
    sport: string;
    address: string;
    city: string;
    image_url: string | null;
  };
};

type MyEvent = {
  id: string;
  title: string;
  sport: string;
  description: string | null;
  start_at: string;
  end_at: string;
  // “primary court” info (derivirano na backendu radi kartice)
  city: string | null;
  address: string | null;
  image_url: string | null;
};

export default function BookingsPage() {
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<MyEvent[]>([]);

  const [loadingB, setLoadingB] = useState(true);
  const [loadingE, setLoadingE] = useState(true);

  const [errB, setErrB] = useState<string | null>(null);
  const [errE, setErrE] = useState<string | null>(null);

  // cancel booking modal
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // leave event (RSVP) spinner
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (t: string, ms = 1500) => {
    setToast(t);
    setTimeout(() => setToast(null), ms);
  };

  // utils
  const tz = "Europe/Zagreb";
  const fmtRange = (startISO: string, endISO: string) => {
    const s = new Date(startISO);
    const e = new Date(endISO);
    const dFmt = new Intl.DateTimeFormat("hr-HR", {
      timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric",
    });
    const tFmt = new Intl.DateTimeFormat("hr-HR", {
      timeZone: tz, hour: "2-digit", minute: "2-digit",
    });
    if (s.toDateString() !== e.toDateString()) {
      return `${dFmt.format(s)} ${tFmt.format(s)} – ${dFmt.format(e)} ${tFmt.format(e)}`;
    }
    return `${dFmt.format(s)} ${tFmt.format(s)} – ${tFmt.format(e)}`;
  };

  // loads
  const loadBookings = async () => {
    setLoadingB(true);
    setErrB(null);
    try {
      const res = await fetch("/api/bookings", { method: "GET", credentials: "include" });
      if (res.status === 401) { router.push("/login?reason=bookings"); return; }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load bookings");
      setBookings(json.bookings || []);
    } catch (e: any) {
      setErrB(e?.message ?? "Error");
    } finally {
      setLoadingB(false);
    }
  };

  const loadEvents = async () => {
    setLoadingE(true);
    setErrE(null);
    try {
      const res = await fetch("/api/events/my", { method: "GET", credentials: "include" });
      if (res.status === 401) { router.push("/login?reason=bookings"); return; }
      // ako endpoint ne postoji, nemoj rušiti stranicu
      if (res.status === 404) { setEvents([]); return; }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load events");
      setEvents(json.events || []);
    } catch (e: any) {
      setErrE(e?.message ?? "Error");
    } finally {
      setLoadingE(false);
    }
  };

  useEffect(() => {
    loadBookings();
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // actions
  const doCancelBooking = async (id: string) => {
    setCancelLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to cancel");
      setBookings(prev => prev.filter(b => b.id !== id));
      showToast("Booking canceled.");
    } catch (e: any) {
      showToast(e?.message ?? "Failed to cancel", 1800);
    } finally {
      setCancelLoading(false);
      setCancelId(null);
    }
  };

  const leaveEvent = async (eventId: string) => {
    setLeavingId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to leave");
      setEvents(prev => prev.filter(ev => ev.id !== eventId));
      showToast("Left event.");
    } catch (e: any) {
      showToast(e?.message ?? "Failed to leave", 1800);
    } finally {
      setLeavingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600">Your upcoming court bookings and events.</p>
        </div>

        {/* COURT BOOKINGS */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Upcoming court bookings</h2>
            <Link href="/" className="text-sm text-gray-600 underline hover:text-gray-800">Find a court</Link>
          </div>

          {errB && (
            <div className="rounded-2xl border bg-white p-6 text-red-600">{errB}</div>
          )}

          {loadingB && !errB && (
            <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="overflow-hidden rounded-2xl border bg-white">
                  <div className="h-40 animate-pulse bg-gray-200" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!loadingB && !errB && bookings.length === 0 && (
            <div className="rounded-2xl border bg-white p-12 text-center">
              <div className="mb-1 text-lg font-semibold text-gray-800">No upcoming bookings</div>
              <p className="text-sm text-gray-600">Find a court and make your first reservation.</p>
            </div>
          )}

          {!loadingB && !errB && bookings.length > 0 && (
            <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {bookings.map((b) => (
                <li key={b.id} className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.courts.image_url || "/images/courts/placeholder.jpg"}
                    alt={b.courts.name}
                    className="h-40 w-full object-cover transition group-hover:scale-[1.02]"
                  />
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="line-clamp-1 text-lg font-semibold">{b.courts.name}</h3>
                        <div className="text-sm text-gray-700">{fmtRange(b.start_at, b.end_at)}</div>
                        <div className="text-sm text-gray-600">
                          {b.courts.city} • {b.courts.address}
                        </div>
                      </div>
                      <span className="rounded-full border px-2 py-0.5 text-xs text-gray-700">{b.courts.sport}</span>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => setCancelId(b.id)}
                        className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* UPCOMING EVENTS */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Upcoming events</h2>
            <Link href="/events" className="text-sm text-gray-600 underline hover:text-gray-800">Browse events</Link>
          </div>

          {errE && (
            <div className="rounded-2xl border bg-white p-6 text-red-600">{errE}</div>
          )}

          {loadingE && !errE && (
            <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="overflow-hidden rounded-2xl border bg-white">
                  <div className="h-40 animate-pulse bg-gray-200" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!loadingE && !errE && events.length === 0 && (
            <div className="rounded-2xl border bg-white p-12 text-center">
              <div className="mb-1 text-lg font-semibold text-gray-800">No upcoming events</div>
              <p className="text-sm text-gray-600">Join an event to see it here.</p>
            </div>
          )}

          {!loadingE && !errE && events.length > 0 && (
            <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((ev) => (
                <li key={ev.id} className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ev.image_url || "/images/events/placeholder.jpg"}
                    alt={ev.title}
                    className="h-40 w-full object-cover transition group-hover:scale-[1.02]"
                  />
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="line-clamp-1 text-lg font-semibold">{ev.title}</h3>
                      <span className="rounded-full border px-2 py-0.5 text-xs text-gray-700">{ev.sport}</span>
                    </div>
                    <div className="text-sm text-gray-700">{fmtRange(ev.start_at, ev.end_at)}</div>
                    {(ev.city || ev.address) && (
                      <div className="text-sm text-gray-600">
                        {ev.city || ""}{ev.city && ev.address ? " • " : ""}{ev.address || ""}
                      </div>
                    )}
                    {ev.description && <p className="line-clamp-2 text-sm text-gray-600">{ev.description}</p>}
                    <div className="flex items-center justify-between pt-2">
                      <Link
                        href={`/events/${ev.id}`}
                        className="inline-flex items-center rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
                      >
                        View details
                      </Link>
                      <button
                        onClick={() => leaveEvent(ev.id)}
                        disabled={leavingId === ev.id}
                        className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
                      >
                        {leavingId === ev.id ? "Leaving…" : "Leave"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm shadow">
          {toast}
        </div>
      )}

      {/* Cancel Modal */}
      {cancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[92vw] max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-semibold">Cancel booking?</h2>
            <p className="mb-6 text-sm text-gray-600">
              Are you sure you want to cancel this booking?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCancelId(null)}
                className="rounded-lg px-4 py-2 text-sm border hover:bg-gray-100"
                disabled={cancelLoading}
              >
                No
              </button>
              <button
                onClick={() => doCancelBooking(cancelId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
                disabled={cancelLoading}
              >
                {cancelLoading ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
