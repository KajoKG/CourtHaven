"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Court = { name: string; city: string | null; address: string | null; image_url: string | null };

type EventData = {
  id: string;
  title: string;
  sport: string;
  description: string | null;
  start_at: string;
  end_at: string;
};

type DetailsResp = {
  event: EventData;
  rsvpCount: number;
  isJoined: boolean;
  courts: Court[]; // može biti []
};

function fmtRange(startISO?: string, endISO?: string) {
  try {
    if (!startISO) return "—";
    const tz = "Europe/Zagreb";
    const start = new Date(startISO);
    const end = endISO ? new Date(endISO) : null;

    const dFmt = new Intl.DateTimeFormat("hr-HR", { timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric" });
    const tFmt = new Intl.DateTimeFormat("hr-HR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });

    if (end && start.toDateString() !== end.toDateString()) {
      return `${dFmt.format(start)} ${tFmt.format(start)} – ${dFmt.format(end)} ${tFmt.format(end)}`;
    }
    if (end) return `${dFmt.format(start)} ${tFmt.format(start)} – ${tFmt.format(end)}`;
    return `${dFmt.format(start)} ${tFmt.format(start)}`;
  } catch {
    return "—";
  }
}

export default function EventDetailsClient() {
  const { id } = useParams<{ id: string }>() ?? { id: "" };
  const router = useRouter();

  const [data, setData] = useState<DetailsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/events/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      // minimalna validacija oblika
      const safe: DetailsResp = {
        event: json.event,
        rsvpCount: Number(json.rsvpCount ?? 0),
        isJoined: Boolean(json.isJoined),
        courts: Array.isArray(json.courts) ? json.courts : [],
      };
      setData(safe);
    } catch (e: any) {
      setErr(e?.message ?? "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const join = async () => {
    setMutating(true);
    setErr(null);
    try {
      const res = await fetch(`/api/events/${id}/rsvp`, { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Join failed");
      await load();
    } catch (e: any) {
      if (String(e?.message).includes("Not authenticated")) {
        router.push("/login");
        return;
      }
      setErr(e?.message ?? "Error");
    } finally {
      setMutating(false);
    }
  };

  const leave = async () => {
    setMutating(true);
    setErr(null);
    try {
      const res = await fetch(`/api/events/${id}/rsvp`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Leave failed");
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setMutating(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="h-64 animate-pulse rounded-2xl bg-gray-200" />
          <div className="mt-6 h-6 w-1/3 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-gray-200" />
        </div>
      </main>
    );
  }

  if (err || !data) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="rounded-2xl border bg-white p-8 text-center text-red-600">
            {err || "Event not found"}
          </div>
        </div>
      </main>
    );
  }

  const ev = data.event;
  const courts = data.courts ?? [];
  const rsvpCount = data.rsvpCount ?? 0;
  const isJoined = !!data.isJoined;

  const heroImg = courts[0]?.image_url || "/images/events/placeholder.jpg";
  const when = fmtRange(ev.start_at, ev.end_at);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImg} alt={ev.title} className="h-72 w-full object-cover" />
          <div className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-bold">{ev.title}</h1>
              <div className="flex items-center gap-2">
                <span className="rounded-full border px-2 py-0.5 text-xs text-gray-700">{ev.sport}</span>
                <span className="rounded-full border px-2 py-0.5 text-xs text-gray-700">{rsvpCount} going</span>
              </div>
            </div>

            <div className="text-gray-700">
              <div className="text-sm">{when}</div>
            </div>

            {ev.description && <p className="text-gray-700">{ev.description}</p>}

            {courts.length > 0 && (
              <div className="rounded-xl border bg-gray-50 p-4">
                <div className="mb-2 text-sm font-semibold text-gray-700">Courts</div>
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {courts.map((c, idx) => (
                    <li key={idx} className="rounded-lg border bg-white p-3">
                      <div className="text-sm font-medium">{c?.name ?? "Court"}</div>
                      <div className="text-sm text-gray-600">
                        {[c?.city, c?.address].filter(Boolean).join(" • ") || "—"}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2">
              {isJoined ? (
                <button
                  onClick={leave}
                  disabled={mutating}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
                >
                  {mutating ? "Leaving…" : "Leave event"}
                </button>
              ) : (
                <button
                  onClick={join}
                  disabled={mutating}
                  className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                >
                  {mutating ? "Joining…" : "Join event"}
                </button>
              )}
            </div>

            {err && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
