import type { Metadata } from "next";
import EventDetailsClient from "./EventDetailsClient";

export const metadata: Metadata = { title: "Event details" };

export default function EventDetailsPage() {
  return <EventDetailsClient />;
}
