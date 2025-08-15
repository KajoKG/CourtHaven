import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Event Booking",
};

export default function EventBookingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 p-6">
      <h1 className="text-5xl font-bold text-gray-800 mb-6">Event Booking</h1>
    </main>
  );
}
