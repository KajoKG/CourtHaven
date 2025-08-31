import type { Metadata } from "next";
import OffersPageClient from "./OffersPageClient";

export const metadata: Metadata = { title: "Offers" };

export default function OffersPage() {
  return <OffersPageClient />;
}
