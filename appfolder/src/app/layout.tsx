import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navigation } from "@/components/navigation";

// Fonts
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Metadata
export const metadata: Metadata = {
  title: {
    template: "%s | CourtHaven",
    default: "CourtHaven",
  },
  description: "Your ultimate court-booking experience.",
};

// Viewport theme color (umjesto metadata.themeColor)
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Pre-hydration theme boot: čita localStorage i/ili OS postavku */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    var ls = localStorage.getItem('theme');
    var m = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (ls === 'dark' || (!ls && m)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (_) {}
})();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/* Navigacija */}
        <Navigation />

        {/* Sadržaj */}
        <main className="min-h-screen">{children}</main>

{/* Footer – koristi surface varijable (app-surface) i border iz globals.css */}
<footer className="app-surface py-3">
  <div className="flex justify-between items-center px-6">
    {/* Lijevi linkovi */}
    <div className="text-sm">
      <a href="#" className="hover:underline mr-4 hidden md:inline">
        Terms & Conditions
      </a>
      <a href="#" className="hover:underline mr-4 hidden md:inline">
        Help & Support
      </a>
      <a href="#" className="hover:underline hidden md:inline">
        Contact Us
      </a>

      {/* Skraćeno na mobitelu */}
      <a href="#" className="hover:underline mr-4 md:hidden">
        Conditions
      </a>
      <a href="#" className="hover:underline mr-4 md:hidden">
        Help
      </a>
      <a href="#" className="hover:underline md:hidden">
        Contact
      </a>
    </div>
  </div>
</footer>

      </body>
    </html>
  );
}
