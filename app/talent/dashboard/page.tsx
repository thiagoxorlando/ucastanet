import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import TalentDashboard from "@/features/talent/TalentDashboard";

export const metadata: Metadata = { title: "Talent Dashboard — ucastanet" };

export default async function TalentDashboardPage() {
  const supabase = createServerClient({ useServiceRole: true });

  const [
    { data: bookingsData },
    { data: submissionsData },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("submissions")
      .select("id", { count: "exact" }),
  ]);

  const bookings = (bookingsData ?? []).map((row: Record<string, unknown>) => ({
    id:          String(row.id ?? ""),
    talentName:  String(row.talent_name ?? ""),
    status:      String(row.status ?? "pending"),
    price:       Number(row.price ?? 0),
    createdAt:   String(row.created_at ?? ""),
  }));

  return (
    <TalentDashboard
      bookings={bookings}
      submissionsCount={submissionsData?.length ?? 0}
    />
  );
}
