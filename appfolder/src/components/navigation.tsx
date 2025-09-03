"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

type Page = { title: string; path: `/${string}` };

const basePages: Page[] = [
  { title: "Events", path: "/events" },
  { title: "Blogs", path: "/blog" },
  { title: "Offers", path: "/offers" },
  { title: "Bookings", path: "/bookings" },
  { title: "Account", path: "/account" },
];

function NavLink({
  page,
  pathname,
  badge,
}: {
  page: Page;
  pathname: string;
  badge?: string | null;
}) {
  const isActive = pathname.startsWith(page.path);
  return (
    <li className="px-3 py-2">
      <Link
        href={page.path}
        className={`relative inline-flex items-center gap-2 text-[15px] transition-colors ${
          isActive
            ? "font-semibold text-emerald-600 dark:text-emerald-400"
            : "text-gray-800 hover:text-emerald-600 dark:text-gray-100 dark:hover:text-emerald-400"
        }`}
      >
        {page.title}
        {badge && (
          <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1 text-[11px] font-semibold text-white">
            {badge}
          </span>
        )}
      </Link>
    </li>
  );
}

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [showLogoutToast, setShowLogoutToast] = useState(false);
  const [pending, setPending] = useState<number>(0);
  const pathname = usePathname();

  // provjera sessiona + slušanje promjena
  useEffect(() => {
    let alive = true;

    const probe = async () => {
      try {
        const res = await fetch("/api/account/profile", {
          cache: "no-store",
          credentials: "include",
        });
        if (alive) setSignedIn(res.ok);
      } catch {
        if (alive) setSignedIn(false);
      }
    };

    probe();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!alive) return;
      setSignedIn(!!session);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // pending friend requests
  useEffect(() => {
    let alive = true;
    async function fetchPending() {
      try {
        const res = await fetch("/api/friends", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return;
        const json = await res.json();
        const count = Array.isArray(json?.incoming)
          ? json.incoming.length
          : 0;
        if (alive) setPending(count);
      } catch {
        /* ignore */
      }
    }
    fetchPending();
    const id = setInterval(fetchPending, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    setShowLogoutToast(true);
    setTimeout(() => setShowLogoutToast(false), 1000);
  };

  const accountBadge =
    pending > 0 ? (pending > 9 ? "9+" : String(pending)) : null;

  return (
    <>
      {showLogoutToast && (
        <div className="fixed top-4 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2 text-sm text-white shadow-md">
          You are logged out
        </div>
      )}

      <nav className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-gray-800 dark:bg-gray-900/70">
        <div className="flex items-center justify-between px-4 md:px-8">
          {/* Logo */}
          <Link href="/" aria-label="CourtHaven Home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon.png"
              alt="CourtHaven Logo"
              className="h-12 w-12 cursor-pointer rounded-full"
            />
          </Link>

          {/* Hamburger menu */}
          <button
            className="block text-gray-800 hover:text-emerald-600 dark:text-gray-100 dark:hover:text-emerald-400 md:hidden"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
          </button>

          {/* Desktop links */}
          <ul className="hidden items-center space-x-4 md:flex">
            {basePages.map((page) => (
              <NavLink
                key={page.path}
                page={page}
                pathname={pathname}
                badge={page.title === "Account" ? accountBadge : null}
              />
            ))}

{/* Auth action */}
{signedIn === null ? (
  <li className="px-2 py-2">
    {/* mali placeholder da ne bljesne 'Login' */}
    <span className="inline-block h-9 w-20 rounded-lg bg-gray-200 animate-pulse dark:bg-gray-700" />
  </li>
) : signedIn ? (
  <li className="px-2 py-2">
    <button
      onClick={handleLogout}
      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
    >
      Log out
    </button>
  </li>
) : (
  <li className="px-2 py-2">
    <Link
      href="/login"
      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
    >
      Login
    </Link>
  </li>
)}

          </ul>
        </div>

        {/* Fullscreen mobile menu */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950/95 text-white">
            <button
              className="absolute right-4 top-4 text-3xl text-white"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Close menu"
            >
              &times;
            </button>

            <ul className="space-y-6 text-center text-xl">
              {basePages.map((page) => (
                <li key={page.path}>
                  <Link
                    href={page.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`relative inline-flex items-center gap-2 transition-colors hover:text-emerald-300 ${
                      pathname.startsWith(page.path)
                        ? "font-bold text-emerald-400"
                        : ""
                    }`}
                  >
                    {page.title}
                    {page.title === "Account" && accountBadge && (
                      <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-500 px-1 text-[11px] font-semibold text-white">
                        {accountBadge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}

              {/* Auth action in mobile */}
              {signedIn ? (
                <li>
                  <button
                    onClick={handleLogout}
                    className="w-40 rounded-lg bg-red-600 px-4 py-2 text-lg font-semibold text-white hover:bg-red-700"
                  >
                    Log out
                  </button>
                </li>
              ) : (
                <li>
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="inline-block w-40 rounded-lg border border-white/60 px-4 py-2 text-lg font-semibold hover:bg-white hover:text-gray-900"
                  >
                    Login
                  </Link>
                </li>
              )}
            </ul>
          </div>
        )}
      </nav>
    </>
  );
}
