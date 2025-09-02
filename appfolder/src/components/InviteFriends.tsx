"use client";

import { useEffect, useMemo, useState } from "react";

type Friend = {
  friendship_id: string;
  user: { id: string; full_name: string | null; email: string | null; avatar_url: string | null };
};

export default function InviteFriends({
  bookingId,
  triggerClassName = "rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50",
  onSent,
}: {
  bookingId: string;
  triggerClassName?: string;
  onSent?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/friends", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load friends");
      setFriends(json.friends || []);
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) load(); }, [open]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(f => {
      const name = (f.user.full_name || "").toLowerCase();
      const email = (f.user.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [friends, query]);

  const send = async () => {
    const invitee_ids = Object.entries(picked)
      .filter(([, v]) => v)
      .map(([id]) => id);
    if (invitee_ids.length === 0) {
      setMsg("Select at least one friend.");
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/bookings/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, invitee_ids }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send invites");
      setMsg(`Invites sent ✓ (${json.invites?.length ?? invitee_ids.length})`);
      setTimeout(() => {
        setOpen(false);
        setPicked({});
        if (onSent) onSent();
      }, 800);
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className={triggerClassName} onClick={() => setOpen(true)}>
        Invite friends
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h3 className="text-lg font-semibold">Invite friends</h3>
              <button className="rounded px-2 py-1 text-sm hover:bg-gray-100" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="p-5 space-y-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search friends…"
                className="w-full rounded-lg border p-2.5"
              />

              <div className="max-h-64 overflow-auto rounded-lg border">
                {loading ? (
                  <div className="p-4 text-sm text-gray-600">Loading…</div>
                ) : list.length === 0 ? (
                  <div className="p-4 text-sm text-gray-600">No friends to show.</div>
                ) : (
                  <ul className="divide-y">
                    {list.map((f) => {
                      const u = f.user;
                      const id = u.id;
                      const checked = !!picked[id];
                      return (
                        <li key={id} className="flex items-center justify-between px-3 py-2">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={u.avatar_url || "/images/avatar-placeholder.png"}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover border"
                            />
                            <div className="min-w-0">
                              <div className="truncate">{u.full_name || u.email || id}</div>
                              <div className="text-xs text-gray-500 truncate">{u.email}</div>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={() =>
                              setPicked((p) => ({ ...p, [id]: !p[id] }))
                            }
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {msg && (
                <div className={`rounded border px-3 py-2 text-sm ${msg.includes("✓")
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"}`}>
                  {msg}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
              <button className="rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100" onClick={() => setOpen(false)}>Close</button>
              <button
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                onClick={send}
                disabled={loading}
              >
                {loading ? "Sending…" : "Send invites"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
