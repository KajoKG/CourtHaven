"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

type Court = { name: string; city: string | null; address: string | null; image_url: string | null };

type EventData = {
  id: string;
  title: string;
  sport: "tennis" | "padel" | "basketball" | "football" | "badminton" | string;
  description: string | null;
  start_at: string;
  end_at: string;
  team_size: number | null;
  capacity_teams: number | null;
};

type DetailsResp = {
  event: EventData;
  rsvpCount?: number;
  teamsCount?: number;
  capacity_teams?: number | null;
  team_size?: number | null;
  isJoined: boolean;
  courts: Court[];
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
    if (end) return `${dFmt.format(start)} ${tFmt.format(start)} – ${dFmt.format(end)}`;
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

  // team fields
  const [partner, setPartner] = useState(""); // padel
  const [member2, setMember2] = useState(""); // basket
  const [member3, setMember3] = useState(""); // basket

  // ui validation helpers
  const [triedSubmit, setTriedSubmit] = useState(false);
  const partnerRef = useRef<HTMLInputElement>(null);
  const member2Ref = useRef<HTMLInputElement>(null);
  const member3Ref = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (t: string, ms = 1500) => {
    setToast(t);
    window.setTimeout(() => setToast(null), ms);
  };

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/events/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");

      const safe: DetailsResp = {
        event: json.event,
        rsvpCount: Number(json.rsvpCount ?? 0),
        teamsCount: Number(json.teamsCount ?? json.rsvpCount ?? 0),
        capacity_teams: json.capacity_teams ?? json.event?.capacity_teams ?? null,
        team_size: json.team_size ?? json.event?.team_size ?? null,
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

  useEffect(() => { if (id) load(); /* eslint-disable-next-line */ }, [id]);

  const teamSize = useMemo(
    () =>
      data?.team_size ??
      data?.event?.team_size ??
      (data?.event?.sport === "padel" ? 2 : data?.event?.sport === "basketball" ? 3 : 1),
    [data]
  );
  const capacity = data?.capacity_teams ?? data?.event?.capacity_teams ?? null;
  const teams = data?.teamsCount ?? data?.rsvpCount ?? 0;
  const full = capacity != null && capacity > 0 && teams >= capacity;

  const partnerNeeded = teamSize === 2;
  const basketNeeded = teamSize === 3;
  const partnerInvalid = partnerNeeded && partner.trim().length === 0;
  const member2Invalid = basketNeeded && member2.trim().length === 0;
  const member3Invalid = basketNeeded && member3.trim().length === 0;

  const canJoin =
    !mutating &&
    !full &&
    (teamSize === 1 ||
      (teamSize === 2 && !partnerInvalid) ||
      (teamSize === 3 && !member2Invalid && !member3Invalid));

  const join = async () => {
    setTriedSubmit(true);
    setErr(null);

    if (!canJoin) {
      if (partnerInvalid && partnerRef.current) partnerRef.current.focus();
      if (member2Invalid && member2Ref.current) member2Ref.current.focus();
      else if (member3Invalid && member3Ref.current) member3Ref.current.focus();
      showToast(
        teamSize === 2
          ? "Enter partners full name"
          : teamSize === 3
          ? "Enter the names of both teammates"
          : "Check Fields"
      );
      return;
    }

    setMutating(true);
    try {
      const body: any = {};
      if (teamSize === 2) body.partner_full_name = partner.trim();
      if (teamSize === 3) {
        body.member2_full_name = member2.trim();
        body.member3_full_name = member3.trim();
      }

      const res = await fetch(`/api/events/${id}/rsvp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        if (String(json?.error).includes("Not authenticated")) {
          router.push("/login");
          return;
        }
        showToast(String(json?.error || "Join failed"));
        setErr(String(json?.error || "Join failed"));
        return;
      }
      await load();
      showToast("Joined ✓");
      setTriedSubmit(false);
      setPartner("");
      setMember2("");
      setMember3("");
    } catch (e: any) {
      const msg = e?.message ?? "Error";
      setErr(msg);
      showToast(msg);
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
      if (!res.ok) {
        showToast(String(json?.error || "Leave failed"));
        setErr(String(json?.error || "Leave failed"));
        return;
      }
      await load();
      showToast("Left event");
    } catch (e: any) {
      const msg = e?.message ?? "Error";
      setErr(msg);
      showToast(msg);
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

  if (err && !data) {
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

  const ev = data!.event;
  const courts = data!.courts ?? [];
  const heroImg = courts[0]?.image_url || "/images/events/placeholder.jpg";
  const when = fmtRange(ev.start_at, ev.end_at);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {/* HERO: next/image (sharp & responsive) */}
          <div className="relative h-72 w-full">
            <Image
              src={heroImg}
              alt={ev.title}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          </div>

          <div className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-bold">{ev.title}</h1>
              <div className="flex items-center gap-2">
                <span className="rounded-full border px-2 py-0.5 text-xs text-gray-700">{ev.sport}</span>
                <span className="rounded-full border px-2 py-0.5 text-xs text-gray-700">
                  {(data!.teamsCount ?? data!.rsvpCount ?? 0)}
                  {capacity ? `/${capacity}` : ""} teams
                </span>
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

            {/* Join/Leave + dinamična forma po team_size */}
            <section className="pt-2">
              {!data!.isJoined ? (
                <div className="space-y-3">
                  {teamSize === 1 && (
                    <p className="text-sm text-gray-600">Singles format — you join as an individual.</p>
                  )}

                  {teamSize === 2 && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Partner full name
                      </label>
                      <input
                        ref={partnerRef}
                        value={partner}
                        onChange={(e) => setPartner(e.target.value)}
                        placeholder="Partners full name"
                        className={`w-full rounded-lg border p-2.5 ${
                          triedSubmit && partner.trim().length === 0 ? "border-red-400 focus:ring-red-300" : ""
                        }`}
                        aria-invalid={triedSubmit && partner.trim().length === 0 ? "true" : "false"}
                      />
                      {triedSubmit && partner.trim().length === 0 && (
                        <p className="mt-1 text-xs text-red-600">Enter your partners full name.</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500"></p>
                    </div>
                  )}

                  {teamSize === 3 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Teammate #1 — full name
                        </label>
                        <input
                          ref={member2Ref}
                          value={member2}
                          onChange={(e) => setMember2(e.target.value)}
                          placeholder="Full name"
                          className={`w-full rounded-lg border p-2.5 ${
                            triedSubmit && member2.trim().length === 0 ? "border-red-400 focus:ring-red-300" : ""
                          }`}
                          aria-invalid={triedSubmit && member2.trim().length === 0 ? "true" : "false"}
                        />
                        {triedSubmit && member2.trim().length === 0 && (
                          <p className="mt-1 text-xs text-red-600">First teammate full name</p>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Teammate #2 — full name
                        </label>
                        <input
                          ref={member3Ref}
                          value={member3}
                          onChange={(e) => setMember3(e.target.value)}
                          placeholder="Full name"
                          className={`w-full rounded-lg border p-2.5 ${
                            triedSubmit && member3.trim().length === 0 ? "border-red-400 focus:ring-red-300" : ""
                          }`}
                          aria-invalid={triedSubmit && member3.trim().length === 0 ? "true" : "false"}
                        />
                        {triedSubmit && member3.trim().length === 0 && (
                          <p className="mt-1 text-xs text-red-600">Second Teammate full name</p>
                        )}
                      </div>
                      <p className="sm:col-span-2 text-xs text-gray-500">
                        Basketball 3×3 — 3 players.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={join}
                    disabled={!canJoin}
                    className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                  >
                    {full ? "Event full" : mutating ? "Joining…" : "Join event"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={leave}
                  disabled={mutating}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
                >
                  {mutating ? "Leaving…" : "Leave event"}
                </button>
              )}
            </section>

            {err && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* tiny toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm shadow"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}
    </main>
  );
}
