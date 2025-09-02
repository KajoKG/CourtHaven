// app/api/blog/[id]/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SPACE = process.env.CONTENTFUL_SPACE_ID!;
const TOKEN = process.env.CONTENTFUL_ACCESS_TOKEN!;
const ENV = process.env.CONTENTFUL_ENV || "master";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const url = `https://cdn.contentful.com/spaces/${SPACE}/environments/${ENV}/entries/${params.id}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: "no-store",
  });

  if (res.status === 404) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: text || "Contentful error" }, { status: 500 });
  }

  const it = await res.json();
  const post = {
    id: it.sys?.id,
    title: it.fields?.title ?? "Untitled",
    body: typeof it.fields?.body === "string" ? it.fields.body : "",
    createdAt: it.sys?.createdAt,
  };

  return NextResponse.json({ post });
}
