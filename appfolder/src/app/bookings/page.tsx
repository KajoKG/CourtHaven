import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Bookings",
};

export default function BookingsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 p-10">
      <h1 className="text-5xl font-bold text-gray-800 mb-8">Manage Bookings</h1>
      <p className="text-lg text-gray-600 mb-10 text-center">
        Choose to view past or upcoming bookings.
      </p>
      <ul className="grid gap-6 md:grid-cols-2 text-center">
        {/* Past Bookings Link */}
        <li className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
          <Link
            href="/bookings/past-bookings"
            className="block text-xl font-semibold text-green-600 hover:text-green-700 py-4 px-6 border border-gray-300 rounded-lg transition-colors hover:bg-gray-100"
          >
            Past Bookings
          </Link>
          <p className="text-sm text-gray-500 mt-2">
            View all your previous reservations.
          </p>
        </li>
        {/* Upcoming Bookings Link */}
        <li className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
          <Link
            href="/bookings/upcoming-bookings"
            className="block text-xl font-semibold text-green-600 hover:text-green-700 py-4 px-6 border border-gray-300 rounded-lg transition-colors hover:bg-gray-100"
          >
            Upcoming Bookings
          </Link>
          <p className="text-sm text-gray-500 mt-2">
            Check your upcoming reservations.
          </p>
        </li>
      </ul>
    </main>
  );
}
