import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

type ProfileLite = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // 1) Dohvati sve relevantne relacije po statusima
  const orPair = `requester.eq.${user.id},addressee.eq.${user.id}`;

  const [{ data: accepted, error: accErr }, { data: incoming, error: inErr }, { data: outgoing, error: outErr }] =
    await Promise.all([
      supabase.from("friendships").select("*").eq("status", "accepted").or(orPair),
      supabase.from("friendships").select("*").eq("status", "pending").eq("addressee", user.id),
      supabase.from("friendships").select("*").eq("status", "pending").eq("requester", user.id),
    ]);

  if (accErr) return NextResponse.json({ error: accErr.message }, { status: 400 });
  if (inErr) return NextResponse.json({ error: inErr.message }, { status: 400 });
  if (outErr) return NextResponse.json({ error: outErr.message }, { status: 400 });

  // 2) Skupi sve userId-eve kojima trebamo profile
  const ids = new Set<string>();
  (accepted ?? []).forEach((r) => {
    ids.add(r.requester as string);
    ids.add(r.addressee as string);
  });
  (incoming ?? []).forEach((r) => ids.add(r.requester as string));
  (outgoing ?? []).forEach((r) => ids.add(r.addressee as string));

  // 3) Jednim upitom dohvati profile i napravi mapu
  const profileMap = new Map<string, ProfileLite>();
  if (ids.size > 0) {
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", Array.from(ids));

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
    (profs ?? []).forEach((p) => profileMap.set(p.id as string, p as ProfileLite));
  }

  // 4) Složi response strukture
  const friends =
    (accepted ?? []).map((r) => {
      const otherId = r.requester === user.id ? (r.addressee as string) : (r.requester as string);
      return {
        friendship_id: r.id as string,
        since: (r.responded_at ?? r.created_at) as string,
        user: profileMap.get(otherId) ?? { id: otherId, full_name: null, email: null, avatar_url: null },
      };
    }) ?? [];

  const incomingOut =
    (incoming ?? []).map((r) => ({
      id: r.id as string,
      from: profileMap.get(r.requester as string) ?? {
        id: r.requester as string,
        full_name: null,
        email: null,
        avatar_url: null,
      },
      created_at: r.created_at as string,
    })) ?? [];

  const outgoingOut =
    (outgoing ?? []).map((r) => ({
      id: r.id as string,
      to: profileMap.get(r.addressee as string) ?? {
        id: r.addressee as string,
        full_name: null,
        email: null,
        avatar_url: null,
      },
      created_at: r.created_at as string,
    })) ?? [];

  return NextResponse.json({ friends, incoming: incomingOut, outgoing: outgoingOut });
}
