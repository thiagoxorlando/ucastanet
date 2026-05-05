import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";

const BLOCKED_MSG =
  "Você ainda possui saldo ou ações pendentes. Finalize suas tarefas e saque todo o saldo antes de excluir a conta.";

export async function POST(_req: NextRequest) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });

  // ── Fetch profile ─────────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, wallet_balance")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });

  // ── Wallet balance must be zero ───────────────────────────────────────────────
  const balance = Number(profile.wallet_balance ?? 0);
  if (balance > 0) {
    return NextResponse.json({ error: BLOCKED_MSG }, { status: 422 });
  }

  // ── Pending/processing withdrawals ────────────────────────────────────────────
  const { count: pendingWithdrawals } = await supabase
    .from("wallet_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("type", "withdrawal")
    .in("status", ["pending", "processing"]);

  if ((pendingWithdrawals ?? 0) > 0) {
    return NextResponse.json({ error: BLOCKED_MSG }, { status: 422 });
  }

  const role = profile.role as string;

  if (role === "agency") {
    // Open jobs
    const { count: openJobs } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", user.id)
      .eq("status", "open")
      .is("deleted_at", null);

    if ((openJobs ?? 0) > 0) {
      return NextResponse.json({ error: BLOCKED_MSG }, { status: 422 });
    }

    // Pending bookings
    const { count: pendingBookings } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", user.id)
      .in("status", ["pending", "pending_payment"])
      .is("deleted_at", null);

    if ((pendingBookings ?? 0) > 0) {
      return NextResponse.json({ error: BLOCKED_MSG }, { status: 422 });
    }

    // Pending contracts
    const { count: pendingContracts } = await supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", user.id)
      .in("status", ["sent", "signed"])
      .is("deleted_at", null);

    if ((pendingContracts ?? 0) > 0) {
      return NextResponse.json({ error: BLOCKED_MSG }, { status: 422 });
    }
  } else if (role === "talent") {
    // Pending bookings
    const { count: pendingBookings } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("talent_user_id", user.id)
      .in("status", ["pending", "pending_payment"])
      .is("deleted_at", null);

    if ((pendingBookings ?? 0) > 0) {
      return NextResponse.json({ error: BLOCKED_MSG }, { status: 422 });
    }

    // Pending contracts
    const { count: pendingContracts } = await supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("talent_id", user.id)
      .in("status", ["sent", "signed"])
      .is("deleted_at", null);

    if ((pendingContracts ?? 0) > 0) {
      return NextResponse.json({ error: BLOCKED_MSG }, { status: 422 });
    }
  }

  // ── Soft-delete ───────────────────────────────────────────────────────────────
  const now = new Date().toISOString();

  await supabase
    .from("profiles")
    .update({ is_frozen: true, deleted_at: now } as Record<string, unknown>)
    .eq("id", user.id);

  if (role === "agency") {
    await supabase
      .from("agencies")
      .update({ deleted_at: now } as Record<string, unknown>)
      .eq("id", user.id);
  } else if (role === "talent") {
    await supabase
      .from("talent_profiles")
      .update({ deleted_at: now } as Record<string, unknown>)
      .eq("id", user.id);
  }

  // Sign out via Supabase admin (invalidate sessions server-side)
  await supabase.auth.admin.signOut(user.id, "others");

  console.log("[delete-account] account soft-deleted", { userId: user.id, role });

  return NextResponse.json({ ok: true });
}
