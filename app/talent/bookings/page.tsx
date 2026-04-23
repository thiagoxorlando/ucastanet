import type { Metadata } from "next";
import TalentBookings from "@/features/talent/TalentBookings";

export const metadata: Metadata = { title: "Minhas reservas — BrisaHub" };

export default function TalentBookingsPage() {
  return <TalentBookings />;
}
