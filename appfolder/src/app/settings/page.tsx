import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 p-10">
      <h1 className="text-5xl font-bold text-gray-800 mb-8">Settings</h1>
      <p className="text-lg text-gray-600 mb-10 text-center">
        Manage your preferences and explore helpful resources.
      </p>
      <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 text-center">
        {/* Help and Support */}
        <li className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
          <Link
            href="/settings/help-and-support"
            className="block text-xl font-semibold text-green-600 hover:text-green-700 py-4 px-6 border border-gray-300 rounded-lg transition-colors hover:bg-gray-100"
          >
            Help and Support
          </Link>
          <p className="text-sm text-gray-500 mt-2">
            Find answers or contact our support team.
          </p>
        </li>
        {/* Personal Settings */}
        <li className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
          <Link
            href="/settings/personal-settings"
            className="block text-xl font-semibold text-green-600 hover:text-green-700 py-4 px-6 border border-gray-300 rounded-lg transition-colors hover:bg-gray-100"
          >
            Personal Settings
          </Link>
          <p className="text-sm text-gray-500 mt-2">
            Customize your personal preferences.
          </p>
        </li>
        {/* Terms and Conditions */}
        <li className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
          <Link
            href="/settings/terms-and-conditions"
            className="block text-xl font-semibold text-green-600 hover:text-green-700 py-4 px-6 border border-gray-300 rounded-lg transition-colors hover:bg-gray-100"
          >
            Terms and Conditions
          </Link>
          <p className="text-sm text-gray-500 mt-2">
            Review our terms and policies.
          </p>
        </li>
      </ul>
    </main>
  );
}
