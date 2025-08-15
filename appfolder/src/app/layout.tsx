import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navigation } from "@/components/navigation";

// Definiranje fontova pomoću `next/font/local`
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

// Meta podaci za stranicu
export const metadata: Metadata = {
  title: {
    template: "%s | CourtHaven",
    default: "CourtHaven", // Default naslov
  },
  description: "Your ultimate court-booking experience.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Navigacija - uvijek prisutna na svim stranicama */}
        <Navigation />
        {/* Dinamičan sadržaj stranica */}
        <main className="min-h-screen">{children}</main>
        {/* Footer */}
        <footer className="bg-gray-900 text-white py-6">
  <div className="flex justify-between items-center px-6">
    {/* Tekst u lijevom uglu */}
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

      {/* Skraćeni tekst za mobilne uređaje */}
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

    {/* Ikone na većim ekranima, tekst na manjim */}
    <div className="md:flex space-x-4 hidden">
      <img src="/icons/insta.png" alt="Instagram" className="w-8 h-8 md:w-12 md:h-12" />
      <img src="/icons/meta.png" alt="Meta" className="w-8 h-8 md:w-12 md:h-12" />
      <img src="/icons/x.png" alt="X" className="w-8 h-8 md:w-12 md:h-12" />
    </div>

    {/* Tekst za mobilne uređaje */}
    <div className="md:hidden text-sm text-center">
      Follow us!
    </div>
  </div>
</footer>

      </body>
    </html>
  );
}
