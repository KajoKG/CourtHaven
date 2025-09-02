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

/* ---------- Helpers ---------- */
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
    canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", quality)
  );
  return new File([blob], (file.name.replace(/\.\w+$/, "") || "avatar") + ".jpg", { type: "image/jpeg" });
}

export default function AccountClient() {
  /* ---------- Profile state ---------- */
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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
  const [toast, setToast] = useState<string | null>(null);

  /* ---------- Load profile ---------- */
  const loadProfile = async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/account/profile", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load profile");
      const p = json.profile as Profile;
      setProfile(p);
      setFn(p.first_name || ""); setLn(p.last_name || "");
      setFull(p.full_name || ""); setBio(p.bio || "");
      setAvatarUrl(p.avatar_url);
    } catch (e: any) {
      setErr(e.message ?? "Error");
    } finally { setLoading(false); }
  };
  useEffect(() => { loadProfile(); }, []);

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
      if (!res.ok) throw new Error(json.error || "Failed to save");
      setProfile(json.profile);
    } catch (e: any) {
      alert(e.message ?? "Save failed");
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
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setAvatarUrl(json.url);
    } finally { setAvatarBusy(false); }
  };

  /* ---------- Change password ---------- */
  const changePassword = async () => {
    if (!pw || pw.length < 6) { alert("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: pw }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to change password");
      setPw(""); alert("Password updated.");
    } catch (e: any) { alert(e.message ?? "Failed to change password"); }
    finally { setBusy(false); }
  };

  /* ---------- Friends: load + actions ---------- */
  const loadFriends = async () => {
    try {
      const res = await fetch("/api/friends", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load friends");
      setFriends(json.friends || []);
      setIncoming(json.incoming || []);
      setOutgoing(json.outgoing || []);
    } catch {
      /* silent */
    }
  };
  useEffect(() => { if (!loading) loadFriends(); /* eslint-disable-next-line */ }, [loading]);

  const sendFriendRequest = async () => {
    if (!friendEmail) return;
    setFriendsBusy(true);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: friendEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send");
      setFriendEmail("");
      setToast("Request sent"); setTimeout(() => setToast(null), 1200);
      loadFriends();
    } catch (e: any) {
      setToast(e.message ?? "Error"); setTimeout(() => setToast(null), 1800);
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
      if (!res.ok) throw new Error(json.error || "Failed");
      loadFriends();
    } catch (e: any) {
      setToast(e.message ?? "Error"); setTimeout(() => setToast(null), 1800);
    } finally { setFriendsBusy(false); }
  };

  const removeFriendship = async (id: string) => {
    setFriendsBusy(true);
    try {
      const res = await fetch(`/api/friends/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to remove");
      loadFriends();
    } catch (e: any) {
      setToast(e.message ?? "Error"); setTimeout(() => setToast(null), 1800);
    } finally { setFriendsBusy(false); }
  };

  /* ---------- UI ---------- */
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">Account</h1>

        {loading && <p>Loading…</p>}
        {err && <p className="text-red-600">{err}</p>}

        {!loading && profile && (
          <div className="space-y-8">
            {/* Profile */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Profile</h2>
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center">
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
                        catch (e: any) { alert(e.message ?? "Upload error"); }
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

                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm text-gray-600">First name</label>
                      <input value={fn} onChange={(e) => setFn(e.target.value)} className="w-full rounded-lg border p-2.5" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-gray-600">Last name</label>
                      <input value={ln} onChange={(e) => setLn(e.target.value)} className="w-full rounded-lg border p-2.5" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Display name</label>
                    <input value={full} onChange={(e) => setFull(e.target.value)} className="w-full rounded-lg border p-2.5" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">Bio</label>
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full rounded-lg border p-2.5" rows={3} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Email: <span className="font-medium">{profile.email ?? "—"}</span>
                    </div>
                    <button
                      onClick={save}
                      disabled={busy}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
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
