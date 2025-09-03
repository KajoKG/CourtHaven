"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type UserLite = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type Friend = { friendship_id: string; since: string; user: UserLite };
type Incoming = { id: string; from: UserLite; created_at: string };
type Outgoing = { id: string; to: UserLite; created_at: string };

/* ---------- Helpers ---------- */
function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try { return JSON.stringify(e); } catch { return "Error"; }
}

export default function FriendsClient() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [outgoing, setOutgoing] = useState<Outgoing[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/friends", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string })?.error || "Failed to load");
      setFriends((json as { friends?: Friend[] }).friends || []);
      setIncoming((json as { incoming?: Incoming[] }).incoming || []);
      setOutgoing((json as { outgoing?: Outgoing[] }).outgoing || []);
    } catch (e: unknown) {
      setErr(getErrorMessage(e) ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const sendRequest = async () => {
    if (!email) return;
    setBusy(true);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string })?.error || "Failed to send");
      setEmail("");
      setToast("Request sent");
      setTimeout(() => setToast(null), 1200);
      void load();
    } catch (e: unknown) {
      setToast(getErrorMessage(e) ?? "Error");
      setTimeout(() => setToast(null), 1800);
    } finally {
      setBusy(false);
    }
  };

  const act = async (id: string, action: "accept" | "decline") => {
    setBusy(true);
    try {
      const res = await fetch(`/api/friends/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string })?.error || "Failed");
      void load();
    } catch (e: unknown) {
      setToast(getErrorMessage(e) ?? "Error");
      setTimeout(() => setToast(null), 1800);
    } finally {
      setBusy(false);
    }
  };

  const removeRel = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/friends/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string })?.error || "Failed to remove");
      void load();
    } catch (e: unknown) {
      setToast(getErrorMessage(e) ?? "Error");
      setTimeout(() => setToast(null), 1800);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">Friends</h1>

        {/* Add friend */}
        <section className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Add friend by email</h2>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="rounded-lg border p-2.5"
            />
            <button
              onClick={sendRequest}
              disabled={busy}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send request"}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            User must exist and have email in profile (automatski sinkano).
          </p>
        </section>

        {loading && <p>Loading…</p>}
        {err && <p className="text-red-600">{err}</p>}

        {!loading && (
          <div className="space-y-8">
            {/* Incoming */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Incoming requests</h2>
              {incoming.length === 0 ? (
                <p className="text-sm text-gray-600">No incoming requests.</p>
              ) : (
                <ul className="space-y-3">
                  {incoming.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.from.avatar_url || "/images/avatar-placeholder.png"}
                          alt=""
                          className="h-8 w-8 rounded-full border object-cover"
                        />
                        <div>
                          <Link
                            href={`/u/${r.from.id}`}
                            className="font-medium hover:underline"
                          >
                            {r.from.full_name || r.from.email || r.from.id}
                          </Link>
                          <div className="text-xs text-gray-500">
                            {new Date(r.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => act(r.id, "accept")}
                          disabled={busy}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => act(r.id, "decline")}
                          disabled={busy}
                          className="rounded-lg border px-3 py-1.5 text-sm"
                        >
                          Decline
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Outgoing */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Outgoing requests</h2>
              {outgoing.length === 0 ? (
                <p className="text-sm text-gray-600">No outgoing requests.</p>
              ) : (
                <ul className="space-y-3">
                  {outgoing.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.to.avatar_url || "/images/avatar-placeholder.png"}
                          alt=""
                          className="h-8 w-8 rounded-full border object-cover"
                        />
                        <div>
                          <Link
                            href={`/u/${r.to.id}`}
                            className="font-medium hover:underline"
                          >
                            {r.to.full_name || r.to.email || r.to.id}
                          </Link>
                          <div className="text-xs text-gray-500">
                            {new Date(r.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeRel(r.id)}
                        disabled={busy}
                        className="rounded-lg border px-3 py-1.5 text-sm"
                      >
                        Cancel
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Friends */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Friends</h2>
              {friends.length === 0 ? (
                <p className="text-sm text-gray-600">No friends yet.</p>
              ) : (
                <ul className="space-y-3">
                  {friends.map((f) => (
                    <li
                      key={f.friendship_id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={f.user.avatar_url || "/images/avatar-placeholder.png"}
                          alt=""
                          className="h-8 w-8 rounded-full border object-cover"
                        />
                        <div>
                          <Link
                            href={`/u/${f.user.id}`}
                            className="font-medium hover:underline"
                          >
                            {f.user.full_name || f.user.email || f.user.id}
                          </Link>
                          <div className="text-xs text-gray-500">
                            Friends since {new Date(f.since).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeRel(f.friendship_id)}
                        disabled={busy}
                        className="rounded-lg border px-3 py-1.5 text-sm"
                      >
                        Unfriend
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl border bg-white px-4 py-2 text-sm shadow">
            {toast}
          </div>
        )}
      </div>
    </main>
  );
}
