import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getProfile(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, first_name, last_name, avatar_url, bio")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data;
}

export default async function FriendProfilePage({ params }: { params: { id: string } }) {
  const profile = await getProfile(params.id);
  if (!profile) return notFound();

  const displayName =
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Player";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-6">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.avatar_url || "/images/avatars/placeholder.png"}
                alt={displayName}
                className="h-28 w-28 object-cover"
              />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-gray-900">{displayName}</h1>
              {profile.bio ? (
                <p className="mt-2 whitespace-pre-line text-gray-700">{profile.bio}</p>
              ) : (
                <p className="mt-2 text-gray-500">No bio yet.</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="rounded-full border px-2 py-0.5">Member</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
