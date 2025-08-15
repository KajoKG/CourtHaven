import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upcoming Bookings",
};

export default function UpcomingBookingsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 p-10">
      <h1 className="text-5xl font-bold text-gray-800 mb-6">Upcoming Bookings</h1>
    </main>
  );
}
