import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
};

export default function TermsAndConditionsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 p-10">
      <h1 className="text-5xl font-bold text-gray-800 mb-6">Terms and Conditions</h1>
      <p className="text-lg text-gray-600 mt-4 text-center">
        Please review our terms and conditions for using this platform.
      </p>
    </main>
  );
}
