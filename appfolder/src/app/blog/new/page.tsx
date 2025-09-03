"use client";
import { useState } from "react";
import Link from "next/link";

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try { return JSON.stringify(e); } catch { return "Error"; }
}

export default function NewBlogPostPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setMsg(null);
    if (!title.trim() || !body.trim()) { setMsg("Please fill in title and body."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/blog/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to create post");
      setMsg(`Created ✓ (${json.status})`);
      setTitle(""); setBody("");
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Add blog post</h1>
          <Link href="/blog" className="text-sm underline">Back to blog</Link>
        </div>
        <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm text-gray-600">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border p-2.5"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full rounded-lg border p-2.5"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create"}
            </button>
            {msg && <span className="text-sm">{msg}</span>}
          </div>
        </div>
      </div>
    </main>
  );
}
