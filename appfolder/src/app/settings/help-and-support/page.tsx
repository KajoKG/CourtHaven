import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help and Support",
};

export default function HelpAndSupportPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 p-10">
      <h1 className="text-5xl font-bold text-gray-800 mb-6">Help and Support</h1>
      <p className="text-lg text-gray-600 mt-4 text-center">
        Find answers to common questions or reach out for assistance.
      </p>
    </main>
  );
}
