import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "contentful-management";

export const dynamic = "force-dynamic";

/* ---------- Helpers ---------- */
function required(name: string, v: string | undefined): string {
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try { return JSON.stringify(e); } catch { return "Create failed"; }
}

/* ---------- Env ---------- */
const SPACE_ID   = required("CONTENTFUL_SPACE_ID", process.env.CONTENTFUL_SPACE_ID);
const ENV_ID     = process.env.CONTENTFUL_ENV || "master";
const MGMT_TOKEN = required("CONTENTFUL_MANAGEMENT_TOKEN", process.env.CONTENTFUL_MANAGEMENT_TOKEN);

// objavi odmah da lista (Delivery API) vidi postove
const AUTO_PUBLISH: boolean = true;

/* ---------- Types ---------- */
type NewPostRequest = {
  title: string;
  body: string;
};

export async function POST(req: Request) {
  try {
    // 1) user must be logged-in
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2) input
    const { title, body } = (await req.json()) as Partial<NewPostRequest>;
    const t = String(title || "").trim();
    const b = String(body  || "").trim();
    if (!t || !b) {
      return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    }

    // 3) create entry (samo obavezna polja koja SIGURNO imaš u Contentfulu)
    const client = createClient({ accessToken: MGMT_TOKEN });
    const space = await client.getSpace(SPACE_ID);
    const env = await space.getEnvironment(ENV_ID);

    const entry = await env.createEntry("blogPost", {
      fields: {
        title: { "en-US": t },
        body:  { "en-US": b },
      },
    });

    const finalEntry = AUTO_PUBLISH ? await entry.publish() : entry;

    return NextResponse.json({
      id: finalEntry.sys.id,
      title: t,
      body: b,
      status: finalEntry.sys.publishedVersion ? "published" : "draft",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
  }
}
