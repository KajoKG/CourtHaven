"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Post = { id: string; title: string; body: string; createdAt?: string };
type ApiList = { posts: Post[]; total: number; page: number; perPage: number; hasMore: boolean };

const PER_PAGE = 6;

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  // ✅ provjera prijave (za prikaz gumba)
  useEffect(() => {
    const supabase = createClientComponentClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setIsAuthed(!!data.user))
      .catch(() => setIsAuthed(false));
  }, []);

  async function load(p = 1) {
    setLoading(true);
    try {
      const res = await fetch(`/api/blog?page=${p}&perPage=${PER_PAGE}`, { cache: "no-store" });
      const json: ApiList = await res.json();
      if (!res.ok) throw new Error((json as any).error || "Failed");
      setPosts(json.posts);
      setTotal(json.total);
      setPage(json.page);
    } catch {
      setPosts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <main className="flex min-h-screen flex-col items-center p-10">
      <div className="mb-8 flex w-full max-w-6xl items-center justify-between">
        <div>
          <h1 className="text-5xl font-bold text-gray-800">Our Blog</h1>
          <p className="text-lg text-gray-600 mt-2">Read our latest updates and insights.</p>
        </div>

        {/* ✅ gumb Add post samo za logirane */}
        {isAuthed && (
          <Link
            href="/blog/new"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            + Add post
          </Link>
        )}
      </div>

      {loading && posts.length === 0 ? (
        <div className="text-gray-600">Loading…</div>
      ) : (
        <ul className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full">
          {posts.map((post, index) => (
            <li
              key={post.id}
              className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <a
                href={`/blog/${post.id}`}
                className="block text-2xl font-semibold text-green-600 hover:text-green-700"
              >
                {(page - 1) * PER_PAGE + index + 1}) {post.title}
              </a>
              <p className="text-base text-gray-500 mt-4">
                {post.body?.slice(0, 150) || ""}...
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between mt-10 w-full max-w-2xl">
        <button
          onClick={() => load(page - 1)}
          disabled={page <= 1 || loading}
          className={`px-4 py-2 rounded-lg border border-gray-300 transition-colors ${
            page <= 1 || loading
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white text-green-600 hover:bg-gray-100 hover:text-green-700"
          }`}
        >
          &lt; Previous
        </button>

        <span className="text-lg font-semibold text-gray-700">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => load(page + 1)}
          disabled={page >= totalPages || loading}
          className={`px-4 py-2 rounded-lg border border-gray-300 transition-colors ${
            page >= totalPages || loading
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white text-green-600 hover:bg-gray-100 hover:text-green-700"
          }`}
        >
          Next &gt;
        </button>
      </div>
    </main>
  );
}
