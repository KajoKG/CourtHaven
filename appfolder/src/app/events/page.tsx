import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Events",
};

export default function EventsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 p-8">
      <h1 className="text-5xl font-bold text-gray-800 mb-6">
        Explore Our Events
      </h1>
      <p className="text-lg text-gray-600 mb-10 text-center">
        Discover exciting events and activities. Join the fun!
      </p>
      <ul className="grid gap-6 md:grid-cols-2 text-center">
        {/* Event Booking Card */}
        <li className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <Link
            href="/events/event-booking"
            className="block text-xl font-semibold text-green-600 hover:text-green-700 py-4 px-6 border border-gray-300 rounded-lg transition-colors hover:bg-gray-100"
          >
            Event Booking
          </Link>
          <p className="text-sm text-gray-500 mt-2">
            Reserve your spot for upcoming events.
          </p>
        </li>
        {/* Invite Friends Card */}
        <li className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <Link
            href="/events/invite-friends"
            className="block text-xl font-semibold text-green-600 hover:text-green-700 py-4 px-6 border border-gray-300 rounded-lg transition-colors hover:bg-gray-100"
          >
            Invite Friends
          </Link>
          <p className="text-sm text-gray-500 mt-2">
            Share events and bring your friends along.
          </p>
        </li>
      </ul>
    </main>
  );
}
