"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border bg-white p-8 text-center">
          <h2 className="mb-2 text-xl font-semibold text-red-600">Something went wrong</h2>
          <p className="mb-4 text-sm text-gray-700">{error?.message ?? "Unknown error"}</p>
          <button
            onClick={() => reset()}
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
