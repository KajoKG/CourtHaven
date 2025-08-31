"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Page = { title: string; path: `/${string}` };

const basePages: Page[] = [
  { title: "Events", path: "/events" },
  { title: "Blogs", path: "/blog" },
  { title: "Offers", path: "/offers" },
  { title: "Bookings", path: "/bookings" },
  { title: "Settings", path: "/settings" },
];

function NavLink({ page, pathname }: { page: Page; pathname: string }) {
  const isActive = pathname.startsWith(page.path);
  return (
    <li className="px-4 py-2">
      <Link
        href={page.path}
        className={`text-lg hover:underline ${
          isActive ? "font-bold text-green-600" : "text-gray-700"
        }`}
      >
        {page.title}
      </Link>
    </li>
  );
}

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [showLogoutToast, setShowLogoutToast] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // provjera sessiona + slušanje promjena
  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSignedIn(!!session);
    };
    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);

    // prikaži kratki toast 1s pa redirect
    setShowLogoutToast(true);
    setTimeout(() => {
      setShowLogoutToast(false);
    }, 1000);
  };

  return (
    <>
      {/* Toast */}
      {showLogoutToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] rounded-xl bg-gray-900 text-white px-4 py-2 text-sm shadow-md transition-opacity">
          You are logged out
        </div>
      )}

      <nav className="bg-gray-50 border-b border-gray-200 shadow-md">
        <div className="flex justify-between items-center px-4 md:px-8">
          {/* Logo */}
          <Link href="/">
            <img
              src="/icons/icon.png"
              alt="CourtHaven Logo"
              className="w-12 h-12 rounded-full cursor-pointer"
            />
          </Link>

          {/* Hamburger menu */}
          <button
            className="block md:hidden"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Toggle menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>

          {/* Desktop links */}
          <ul className="hidden md:flex space-x-6 items-center">
            {basePages.map((page) => (
              <NavLink key={page.path} page={page} pathname={pathname} />
            ))}

            {/* Auth action (desno) */}
            {signedIn ? (
              <li className="px-2 py-2">
                <button
                  onClick={handleLogout}
                  className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Log out
                </button>
              </li>
            ) : (
              <li className="px-2 py-2">
                <Link
                  href="/login"
                  className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-100"
                >
                  Login
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* Fullscreen mobile menu */}
        {isMenuOpen && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex flex-col items-center justify-center text-white">
            {/* Close button */}
            <button
              className="absolute top-4 right-4 text-white text-3xl"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Close menu"
            >
              &times;
            </button>

            {/* Menu links */}
            <ul className="space-y-6 text-xl text-center">
              {basePages.map((page) => (
                <li key={page.path}>
                  <Link
                    href={page.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`hover:underline ${
                      pathname.startsWith(page.path) ? "font-bold text-green-400" : ""
                    }`}
                  >
                    {page.title}
                  </Link>
                </li>
              ))}

              {/* Auth action u mobilnom meniju */}
              {signedIn ? (
                <li>
                  <button
                    onClick={handleLogout}
                    className="w-40 rounded-lg bg-red-600 text-white px-4 py-2 text-lg font-semibold hover:bg-red-700"
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
