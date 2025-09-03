// ./src/app/api/account/profile/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

// ✨ Dodaj tip za payload umjesto `any`
type ProfileUpdatePayload = {
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, full_name, email, avatar_url, bio, created_at")
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}

export async function PUT(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // 👇 Tipiziramo body bez `any`
  const body = (await req.json()) as Partial<Record<keyof ProfileUpdatePayload, string | null>>;

  const payload: ProfileUpdatePayload = {
    first_name: body.first_name ?? null,
    last_name: body.last_name ?? null,
    full_name: body.full_name ?? null,
    bio: body.bio ?? null,
    avatar_url: body.avatar_url ?? null,
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select("id, first_name, last_name, full_name, email, avatar_url, bio, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}
