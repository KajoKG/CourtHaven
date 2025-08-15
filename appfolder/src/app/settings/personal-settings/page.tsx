import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personal Settings",
};

export default function PersonalSettingsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 p-10">
      <h1 className="text-5xl font-bold text-gray-800 mb-6">Personal Settings</h1>
      <p className="text-lg text-gray-600 mt-4 text-center">
        Manage your account details, preferences, and privacy settings.
      </p>
    </main>
  );
}
