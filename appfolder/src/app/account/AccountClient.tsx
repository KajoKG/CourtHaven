"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ---------- Types ---------- */
type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

type UserLite = { id: string; full_name: string | null; email: string | null; avatar_url: string | null };
type Friend   = { friendship_id: string; since: string; user: UserLite };
type Incoming = { id: string; from: UserLite; created_at: string };
type Outgoing = { id: string; to: UserLite; created_at: string };

type InvitePayload = {
  invitee_name?: string | null;
  invitee_email?: string | null;
  court_name?: string | null;
  start_at?: string | null;
};

type Notification = {
  id: string;
  type: "invite_accepted" | "invite_left";
  payload: InvitePayload;
  created_at: string;
  read_at: string | null;
};

/** Booking/Invite strukture koje se koriste u "Booking invites" sekciji */
type Court = { id: string; name?: string | null; city?: string | null; address?: string | null };
type Booking = { id: string; start_at?: string | null; courts?: Court[] | Court | null };
type BookingInvite = { id: string; bookings?: Booking[] | Booking | null };

/* ---------- Helpers ---------- */
function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try { return JSON.stringify(e); } catch { return "Error"; }
}

async function compressImage(file: File, maxSide = 512, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(maxSide / bmp.width, maxSide / bmp.height, 1);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve((b as Blob) ?? new Blob()), "image/jpeg", quality)
  );
  return new File([blob], (file.name.replace(/\.\w+$/, "") || "avatar") + ".jpg", { type: "image/jpeg" });
}

/** Uzmi prvi element ako je array, inače vrati vrijednost; zadrži tipove */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default function AccountClient() {
  /* ---------- Profile state ---------- */
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  const [fn, setFn] = useState("");
  const [ln, setLn] = useState("");
  const [full, setFull] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ---------- Friends state ---------- */
  const [friends, setFriends]   = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [outgoing, setOutgoing] = useState<Outgoing[]>([]);
  const [friendEmail, setFriendEmail] = useState("");
  const [friendsBusy, setFriendsBusy] = useState(false);

  /* ---------- Booking invites state ---------- */
  const [pendingInvites, setPendingInvites] = useState<BookingInvite[]>([]);
  const [invBusy, setInvBusy] = useState(false);

  /* ---------- Notifications state ---------- */
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [notifBusy, setNotifBusy] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  /* ---------- Load profile on mount ---------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/account/profile", {
          cache: "no-store",
          credentials: "include",
        });

        if (res.status === 401) {
          setIsAuthed(false);
          setProfile(null);
          return;
        }

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((json as { error?: string })?.error || "Failed to load profile");
        }

        const p = json.profile as Profile;
        setIsAuthed(true);
        setProfile(p);
        setFn(p.first_name || "");
        setLn(p.last_name || "");
        setFull(p.full_name || "");
        setBio(p.bio || "");
        setAvatarUrl(p.avatar_url);
      } catch (e: unknown) {
        setIsAuthed(false);
        setErr(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- Save profile ---------- */
  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: fn || null,
          last_name: ln || null,
          full_name: full || null,
          bio: bio || null,
          avatar_url: avatarUrl || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string })?.error || "Failed to save");
      setProfile(json.profile as Profile);
    } catch (e: unknown) {
      alert(getErrorMessage(e) || "Save failed");
    } finally { setBusy(false); }
  };

  /* ---------- Avatar upload ---------- */
  const uploadAvatar = async (file: File) => {
    setAvatarBusy(true);
    try {
      const small = await compressImage(file, 512, 0.82);
      const form = new FormData(); form.append("file", small);
      const res = await fetch("/api/account/avatar", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string })?.error || "Upload failed");
      setAvatarUrl((json as { url: string }).url);
    } finally { setAvatarBusy(false); }
  };

  /* ---------- Change password ---------- */
  const changePassword = async () => {
    if (!pw || pw.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    const ok = window.confirm("Are you sure you want to change your password?");
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: pw }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string })?.error || "Failed to change password");
      setPw("");
      alert("Password updated.");
    } catch (e: unknown) {
      alert(getErrorMessage(e) || "Failed to change password");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Friends: load + actions ---------- */
  const loadFriends = async () => {
    try {
      const res = await fetch("/api/friends", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string })?.error || "Failed to load friends");
      setFriends((json as { friends?: Friend[] }).friends || []);
      setIncoming((json as { incoming?: Incoming[] }).incoming || []);
      setOutgoing((json as { outgoing?: Outgoing[] }).outgoing || []);
    } catch {
      /* silent */
    }
  };
  useEffect(() => { if (!loading) void loadFriends(); /* eslint-disable-next-line */ }, [loading]);

  const sendFriendRequest = async () => {
    if (!friendEmail) return;
    setFriendsBusy(true);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: friendEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string })?.error || "Failed to send");
      setFriendEmail("");
      setToast("Request sent"); setTimeout(() => setToast(null), 1200);
      void loadFriends();
    } catch (e: unknown) {
      setToast(getErrorMessage(e) || "Error"); setTimeout(() => setToast(null), 1800);
    } finally { setFriendsBusy(false); }
  };

  const respondToRequest = async (id: string, action: "accept" | "decline") => {
    setFriendsBusy(true);
    try {
      const res = await fetch(`/api/friends/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string })?.error || "Failed");
      void loadFriends();
    } catch (e: unknown) {
      setToast(getErrorMessage(e) || "Error"); setTimeout(() => setToast(null), 1800);
    } finally { setFriendsBusy(false); }
  };

  const removeFriendship = async (id: string) => {
    setFriendsBusy(true);
    try {
      const res = await fetch(`/api/friends/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string })?.error || "Failed to remove");
      void loadFriends();
    } catch (e: unknown) {
      setToast(getErrorMessage(e) || "Error"); setTimeout(() => setToast(null), 1800);
    } finally { setFriendsBusy(false); }
  };

  /* ---------- Booking invites: load + actions ---------- */
  const loadInvites = async () => {
    try {
      const res = await fetch("/api/bookings/invites", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setPendingInvites((json as { invites?: BookingInvite[] }).invites || []);
    } catch { /* noop */ }
  };
  useEffect(() => { if (!loading) void loadInvites(); /* eslint-disable-next-line */ }, [loading]);

  const respondInvite = async (id: string, action: "accept" | "decline") => {
    setInvBusy(true);
    try {
      const res = await fetch(`/api/bookings/invites/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string })?.error || "Failed");
      await loadInvites();
    } catch (e: unknown) {
      setToast(getErrorMessage(e) || "Error");
      setTimeout(() => setToast(null), 1500);
    } finally { setInvBusy(false); }
  };

  /* ---------- Notifications: load + actions ---------- */
  const loadNotifs = async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string })?.error || "Failed to load notifications");
      setNotifs((json as { notifications?: Notification[] }).notifications || []);
    } catch {
      /* silent */
    }
  };
  useEffect(() => { if (!loading) void loadNotifs(); /* eslint-disable-next-line */ }, [loading]);

  const markNotifRead = async (id: string) => {
    setNotifBusy(true);
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    } finally { setNotifBusy(false); }
  };

  const deleteNotif = async (id: string) => {
    setNotifBusy(true);
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifs(prev => prev.filter(n => n.id !== id));
    } finally { setNotifBusy(false); }
  };

  const markAllRead = async () => {
    setNotifBusy(true);
    try {
      await fetch(`/api/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read_all" }),
      });
      setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    } finally { setNotifBusy(false); }
  };

  /* ---------- UI ---------- */
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">Account</h1>
        {isAuthed === false && (
          <div className="rounded-2xl border bg-white p-12 text-center">
            <div className="mb-2 text-lg font-semibold text-gray-800">
              You need to be logged in to view your account.
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Please log in to manage your profile, friends, and bookings.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Log in
            </Link>
          </div>
        )}

        {loading && <p>Loading…</p>}
        {err && <p className="text-red-600">{err}</p>}

        {isAuthed && !loading && profile && (
          <div className="space-y-8">
{/* Profile */}
<section className="rounded-2xl border bg-white p-4 md:p-6 shadow-sm">
  <h2 className="mb-3 md:mb-4 text-base md:text-lg font-semibold">Profile</h2>

  {/* Na mobitelu stack, na desktopu side-by-side */}
  <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
    <div className="flex flex-col items-center md:items-start w-full md:w-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarUrl || "/images/avatar-placeholder.png"}
        alt="Avatar"
        className="h-24 w-24 rounded-full object-cover border"
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) {
            try { await uploadAvatar(f); }
            catch (e) { alert(getErrorMessage(e) || "Upload error"); }
            finally { if (fileRef.current) fileRef.current.value = ""; }
          }
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={avatarBusy}
        className="mt-3 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-60"
      >
        {avatarBusy ? "Uploading…" : "Change photo"}
      </button>
    </div>

    <div className="flex-1 w-full space-y-3 md:space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-gray-600">First name</label>
          <input
            value={fn}
            onChange={(e) => setFn(e.target.value)}
            className="w-full rounded-lg border p-2 md:p-2.5 text-sm md:text-base"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">Last name</label>
          <input
            value={ln}
            onChange={(e) => setLn(e.target.value)}
            className="w-full rounded-lg border p-2 md:p-2.5 text-sm md:text-base"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-600">Display name</label>
        <input
          value={full}
          onChange={(e) => setFull(e.target.value)}
          className="w-full rounded-lg border p-2 md:p-2.5 text-sm md:text-base"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-600">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="w-full rounded-lg border p-2 md:p-2.5 text-sm md:text-base min-h-[84px] md:min-h-[96px]"
        />
      </div>

      {/* Na mobitelu u koloni + full-width gumb, na desktopu u jednom redu */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-xs md:text-sm text-gray-500 break-words">
          Email: <span className="font-medium">{profile.email ?? "—"}</span>
        </div>
        <button
          onClick={save}
          disabled={busy}
          className="w-full md:w-auto rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  </div>
</section>


            {/* Security */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Security</h2>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  type="password"
                  placeholder="New password (min 6)"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="rounded-lg border p-2.5"
                />
                <button
                  onClick={changePassword}
                  disabled={busy}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                >
                  {busy ? "Updating…" : "Change password"}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                You’ll stay signed in after the change.
              </p>
            </section>

            {/* Notifications */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Notifications</h2>
                <button
                  onClick={markAllRead}
                  disabled={notifBusy || notifs.every(n => n.read_at)}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-60"
                >
                  Mark all as read
                </button>
              </div>

              {notifs.length === 0 ? (
                <p className="text-sm text-gray-600">No notifications.</p>
              ) : (
                <ul className="divide-y">
                  {notifs.map((n) => {
                    const when = new Date(n.created_at).toLocaleString();
                    const p = n.payload || {};
                    const text = n.type === "invite_accepted"
                      ? `${p.invitee_name || p.invitee_email || "Someone"} accepted your invite${p.court_name ? ` for ${p.court_name}` : ""}${p.start_at ? ` (${new Date(p.start_at).toLocaleString()})` : ""}.`
                      : `${p.invitee_name || p.invitee_email || "Someone"} left your booking${p.court_name ? ` at ${p.court_name}` : ""}${p.start_at ? ` (${new Date(p.start_at).toLocaleString()})` : ""}.`;

                    return (
                      <li key={n.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <div className={`text-sm ${n.read_at ? "text-gray-700" : "font-medium text-gray-900"}`}>
                            {text}
                          </div>
                          <div className="text-xs text-gray-500">{when}</div>
                        </div>
                        <div className="shrink-0 flex gap-2">
                          {!n.read_at && (
                            <button
                              onClick={() => markNotifRead(n.id)}
                              disabled={notifBusy}
                              className="rounded-lg border px-2.5 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotif(n.id)}
                            disabled={notifBusy}
                            className="rounded-lg border px-2.5 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
                          >
                            Dismiss
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Friends */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Friends</h2>

              {/* Add friend by email */}
              <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="rounded-lg border p-2.5"
                />
                <button
                  onClick={sendFriendRequest}
                  disabled={friendsBusy}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {friendsBusy ? "Sending…" : "Send request"}
                </button>
              </div>

              {/* Incoming requests */}
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-medium text-gray-700">Incoming requests</h3>
                {incoming.length === 0 ? (
                  <p className="text-sm text-gray-600">No incoming requests.</p>
                ) : (
                  <ul className="space-y-3">
                    {incoming.map((r) => (
                      <li key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                        <Link href={`/u/${r.from.id}`} className="flex items-center gap-3 min-w-0 hover:underline">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.from.avatar_url || "/images/avatar-placeholder.png"} alt="" className="h-8 w-8 rounded-full object-cover border" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {r.from.full_name || r.from.email || r.from.id}
                            </div>
                            <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                          </div>
                        </Link>
                        <div className="flex gap-2">
                          <button onClick={() => respondToRequest(r.id, "accept")} disabled={friendsBusy} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white">Accept</button>
                          <button onClick={() => respondToRequest(r.id, "decline")} disabled={friendsBusy} className="rounded-lg border px-3 py-1.5 text-sm">Decline</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Outgoing requests */}
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-medium text-gray-700">Outgoing requests</h3>
                {outgoing.length === 0 ? (
                  <p className="text-sm text-gray-600">No outgoing requests.</p>
                ) : (
                  <ul className="space-y-3">
                    {outgoing.map((r) => (
                      <li key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                        <Link href={`/u/${r.to.id}`} className="flex items-center gap-3 min-w-0 hover:underline">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.to.avatar_url || "/images/avatar-placeholder.png"} alt="" className="h-8 w-8 rounded-full object-cover border" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {r.to.full_name || r.to.email || r.to.id}
                            </div>
                            <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                          </div>
                        </Link>
                        <button onClick={() => removeFriendship(r.id)} disabled={friendsBusy} className="rounded-lg border px-3 py-1.5 text-sm">Cancel</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Friends list */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-700">Friends</h3>
                {friends.length === 0 ? (
                  <p className="text-sm text-gray-600">No friends yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {friends.map((f) => (
                      <li key={f.friendship_id} className="flex items-center justify-between rounded-lg border p-3">
                        <Link href={`/u/${f.user.id}`} className="flex items-center gap-3 min-w-0 hover:underline">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={f.user.avatar_url || "/images/avatar-placeholder.png"} alt="" className="h-8 w-8 rounded-full object-cover border" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {f.user.full_name || f.user.email || f.user.id}
                            </div>
                            <div className="text-xs text-gray-500">
                              Friends since {new Date(f.since).toLocaleDateString()}
                            </div>
                          </div>
                        </Link>
                        <button onClick={() => removeFriendship(f.friendship_id)} disabled={friendsBusy} className="rounded-lg border px-3 py-1.5 text-sm">Unfriend</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Booking invites */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Booking invites</h2>
              {pendingInvites.length === 0 ? (
                <p className="text-sm text-gray-600">No pending invites.</p>
              ) : (
                <ul className="space-y-3">
                  {pendingInvites.map((it) => {
                    const booking = one<Booking>(it.bookings);
                    const court = one<Court>(booking?.courts ?? null);
                    const courtName = court?.name || "Court";
                    const when = booking?.start_at ? new Date(booking.start_at).toLocaleString() : "";
                    const whereBits = [court?.city, court?.address].filter(Boolean).join(" • ");
                    return (
                      <li key={it.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {courtName}{when ? ` • ${when}` : ""}
                          </div>
                          {whereBits && (
                            <div className="text-xs text-gray-600 truncate">{whereBits}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => respondInvite(it.id, "accept")}
                            disabled={invBusy}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white disabled:opacity-60"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => respondInvite(it.id, "decline")}
                            disabled={invBusy}
                            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-60"
                          >
                            Decline
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl border bg-white px-4 py-2 text-sm shadow">
            {toast}
          </div>
        )}
      </div>
    </main>
  );
}
