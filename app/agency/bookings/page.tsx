import type { Metadata } from "next";
import BookingList from "@/features/agency/BookingList";
import { createServerClient } from "@/lib/supabase";

export const metadata: Metadata = { title: "Bookings — ucastanet" };

export default async function BookingsPage() {
  const supabase = createServerClient({ useServiceRole: true });

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[BookingsPage] Failed to fetch bookings:", error.message);
  } else {
    console.log("[BookingsPage] Raw rows:", data);
  }

  const bookings = (data ?? []).map((row: Record<string, unknown>) => ({
    id:         String(row.id ?? ""),
    talentName: String(row.talent_name ?? ""),
    status:     String(row.status ?? "pending"),
    totalValue: Number(row.price ?? row.total_value ?? 0),
    createdAt:  String(row.created_at ?? ""),
  }));

  return <BookingList bookings={bookings} />;
}
