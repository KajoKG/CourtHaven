"use client";

import Link from "next/link";
import AuthGate from "../components/AuthGate";
import BookContent from "../components/bookContent";
import { useTheme } from "@/hooks/useTheme";

export default function HomePage() {
  const { theme, toggle } = useTheme();

  return (
    <main className="relative min-h-screen flex flex-col px-4 ">
      {/* Pozadinske slike */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <img
          src="/images/BronBron.png"
          alt="Player 1"
          className="absolute top-1/4 left-[10%] w-[900px] md:w-[1200px] opacity-10 dark:opacity-10 hidden md:block"
        />
        <img
          src="/images/Picture2.png"
          alt="Player 2"
          className="absolute top-5 right-[5%] w-[300px] md:w-[450px] opacity-10 dark:opacity-10 hidden md:block"
        />
      </div>

      {/* Theme toggle – samo na Home, ispod navigacije */}
      <div className="relative mt-3 flex justify-end">
        <button
          onClick={toggle}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>

      {/* Hero Section */}
      <section className="relative text-center py-16">
        <h1 className="text-4xl md:text-9xl font-bold text-green-700 dark:text-emerald-400">
          Court<span className="text-green-500 dark:text-emerald-300">Haven</span>
        </h1>
        <p className="text-lg md:text-3xl text-gray-700 dark:text-gray-300 mt-4">
          The Court Awaits
        </p>

        <div className="mt-8">
          <AuthGate
            // guest → poruka umjesto forme
            fallback={
              <div className="max-w-xl mx-auto rounded-2xl border border-gray-200 dark:border-[color:var(--border)] bg-white/80 dark:bg-[color:var(--card)]/90 backdrop-blur p-6 text-center">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  You have to be{" "}
                  <Link href="/login" className="font-semibold underline text-green-700 dark:text-emerald-400">
                    logged in
                  </Link>{" "}
                  to search courts.
                </p>
              </div>
            }
          >
            {/* logirani → prikaz pretraživanja */}
            <BookContent />
          </AuthGate>
        </div>
      </section>

      {/* Info cards */}
      <section className="relative mx-auto mb-16 mt-6 grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-[color:var(--card)] dark:border-[color:var(--border)]">
          <h3 className="mb-2 text-lg font-semibold text-green-700 dark:text-emerald-400">
            Why Choose CourtHaven
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            CourtHaven makes it easy to find and book sports courts near you.
            Instantly reserve courts for your favorite sports, from tennis to basketball.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-[color:var(--card)] dark:border-[color:var(--border)]">
          <h3 className="mb-2 text-lg font-semibold text-green-700 dark:text-emerald-400">
            Featured Courts
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Check out the most popular courts in your area, recommended by other users.
            See ratings, photos, and availability to choose the perfect spot for your next game.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-[color:var(--card)] dark:border-[color:var(--border)]">
          <h3 className="mb-2 text-lg font-semibold text-green-700 dark:text-emerald-400">
            Explore Features
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Beyond bookings, CourtHaven offers tools to manage schedules, invite friends, and
            explore upcoming events. Discover everything you need for a seamless experience.
          </p>
        </div>
      </section>
    </main>
  );
}
