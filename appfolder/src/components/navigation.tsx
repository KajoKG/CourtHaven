"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Page = {
  title: string;
  path: `/${string}`;
};

const pages: Page[] = [
  { title: "Events", path: "/events" },
  { title: "Blogs", path: "/blog" },
  { title: "Offers", path: "/offers" },
  { title: "Bookings", path: "/bookings" },
  { title: "Settings", path: "/settings" },
  { title: "Login", path: "/login" },
];

function processPage(page: Page, index: number, pathname: string) {
  const isActive = pathname.startsWith(page.path);
  return (
    <li key={index} className="px-4 py-2">
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
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Kontrola menija
  const pathname = usePathname();

  return (
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
          onClick={() => setIsMenuOpen(true)} // Otvori meni
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16m-7 6h7"
            />
          </svg>
        </button>

        {/* Desktop links */}
        <ul className="hidden md:flex space-x-6">
          {pages.map((page, index) => processPage(page, index, pathname))}
        </ul>
      </div>

      {/* Fullscreen mobile menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex flex-col items-center justify-center text-white">
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white text-3xl"
            onClick={() => setIsMenuOpen(false)} // Zatvori meni
            aria-label="Close menu"
          >
            &times;
          </button>

          {/* Menu links */}
          <ul className="space-y-6 text-xl">
            {pages.map((page, index) => (
              <li key={index}>
                <Link
                  href={page.path}
                  onClick={() => setIsMenuOpen(false)} // Zatvori nakon klika
                  className="hover:underline"
                >
                  {page.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
