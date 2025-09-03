// app/api/blog/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SPACE = process.env.CONTENTFUL_SPACE_ID!;
const TOKEN = process.env.CONTENTFUL_ACCESS_TOKEN!;
const ENV = process.env.CONTENTFUL_ENV || "master";
const CT = process.env.CONTENTFUL_BLOG_CT || "blogPost";

/* ---------- Helpers ---------- */
function n(v: string | null, d: number, min = 1, max = 100): number {
  const x = v ? Number(v) : NaN;
  const y = Number.isFinite(x) ? x : d;
  return Math.min(max, Math.max(min, y));
}

/* ---------- Minimal Contentful types (što nam treba za mapiranje) ---------- */
type CFEntrySys = {
  id: string;
  createdAt?: string;
};

type CFEntryFields = {
  title?: string;
  body?: unknown; // može biti string ili RichText; mi čitamo samo string
};

type CFEntry = {
  sys?: CFEntrySys;
  fields?: CFEntryFields;
};

type CFListResponse = {
  items?: CFEntry[];
  total?: number;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = n(searchParams.get("page"), 1, 1, 10_000);
  const perPage = n(searchParams.get("perPage"), 6, 1, 50);
  const q = (searchParams.get("q") || "").trim();

  const skip = (page - 1) * perPage;

  const url = new URL(
    `https://cdn.contentful.com/spaces/${SPACE}/environments/${ENV}/entries`
  );
  url.searchParams.set("content_type", CT);
  url.searchParams.set("order", "-sys.createdAt");
  url.searchParams.set("limit", String(perPage));
  url.searchParams.set("skip", String(skip));
  if (q) url.searchParams.set("query", q);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TOKEN}` },
    // CDN se već keša, ali ovo sprječava caching preko Next-a:
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: text || "Contentful error" }, { status: 500 });
  }

  const data = (await res.json()) as CFListResponse;

  // mapiramo minimalna polja
  const posts = (data.items ?? []).map((it) => ({
    id: it.sys?.id,
    title: it.fields?.title ?? "Untitled",
    body: typeof it.fields?.body === "string" ? it.fields.body : "",
    createdAt: it.sys?.createdAt,
  }));

  return NextResponse.json({
    posts,
    total: data.total ?? posts.length,
    page,
    perPage,
    hasMore: skip + posts.length < (data.total ?? 0),
  });
}
