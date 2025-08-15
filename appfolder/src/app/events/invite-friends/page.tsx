import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invite Friends",
};

export default function InviteFriendsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 p-6">
      <h1 className="text-5xl font-bold text-gray-800 mb-6">Invite Friends</h1>
    </main>
  );
}
