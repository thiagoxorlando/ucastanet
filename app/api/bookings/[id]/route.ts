import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { status, notify_admin } = body;

  const supabase = createServerClient({ useServiceRole: true });

  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (notify_admin && status === "cancelled") {
    const { data: booking } = await supabase
      .from("bookings")
      .select("talent_name")
      .eq("id", id)
      .single();

    const adminUsers = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (adminUsers.data?.length) {
      await supabase.from("notifications").insert(
        adminUsers.data.map((u) => ({
          user_id: u.id,
          message: `Booking for ${booking?.talent_name ?? "talent"} was cancelled and requires review.`,
        }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}
