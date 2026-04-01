import type { Metadata } from "next";
import TalentBookings from "@/features/talent/TalentBookings";

export const metadata: Metadata = { title: "My Bookings — ucastanet" };

export default function TalentBookingsPage() {
  return <TalentBookings />;
}
