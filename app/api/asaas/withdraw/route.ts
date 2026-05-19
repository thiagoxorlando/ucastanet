import { NextRequest, NextResponse } from "next/server";
import { createPixTransfer } from "@/lib/asaas";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { notifyAdmins } from "@/lib/notify";
import { getOwnerTotalActiveAllocations } from "@/lib/premiumWorkspace.server";

export const runtime = "nodejs";

type AsaasPixKeyType = "CPF" | "EMAIL" | "PHONE" | "EVP";

function normalizePixKeyType(value: string | null | undefined): AsaasPixKeyType | null {
  switch ((value ?? "").trim().toLowerCase()) {
    case "cpf":
    case "cnpj":
      return "CPF";
    case "email":
      return "EMAIL";
    case "phone":
      return "PHONE";
    case "random":
      return "EVP";
    default:
      return null;
  }
}

function normalizePixKeyValue(value: string | null | undefined, type: string | null | undefined): string {
  const raw = (value ?? "").trim();
  switch ((type ?? "").trim().toLowerCase()) {
    case "cpf":
    case "cnpj":
      return raw.replace(/\D/g, "");
    case "email":
      return raw.toLowerCase();
    case "phone": {
      const digits = raw.replace(/\D/g, "");
      return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
    }
    default:
      return raw;
  }
}

async function restoreFailedWithdrawal(
  supabase: ReturnType<typeof createServerClient>,
  params: {
    transactionId: string;
    userId: string;
    amount: number;
    providerStatus: string;
    adminNote: string;
  },
) {
  await supabase.rpc("increment_wallet_balance", {
    p_user_id: params.userId,
    p_amount: params.amount,
  });

  await supabase
    .from("wallet_transactions")
    .update({
      status: "failed",
      provider_status: params.providerStatus,
      processed_at: new Date().toISOString(),
      admin_note: params.adminNote,
    } as Record<string, unknown>)
    .eq("id", params.transactionId);
}

export async function POST(req: NextRequest) {
  const session = await createSessionClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { amount?: unknown };
  const amount = Number(body.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Valor de saque inválido." }, { status: 400 });
  }

  const roundedAmount = Number(amount.toFixed(2));
  if (roundedAmount <= 0 || roundedAmount !== amount) {
    return NextResponse.json({ error: "Valor de saque inválido." }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, wallet_balance, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  let pixKeyTypeRaw: string | null = null;
  let pixKeyRaw: string | null = null;

  if (profile.role === "agency") {
    const { data: agency } = await supabase
      .from("agencies")
      .select("pix_key_type, pix_key_value")
      .eq("id", user.id)
      .maybeSingle();
    pixKeyTypeRaw = agency?.pix_key_type ?? null;
    pixKeyRaw = agency?.pix_key_value ?? null;
  } else if (profile.role === "talent") {
    const { data: talent } = await supabase
      .from("talent_profiles")
      .select("pix_key_type, pix_key_value")
      .eq("id", user.id)
      .maybeSingle();
    pixKeyTypeRaw = talent?.pix_key_type ?? null;
    pixKeyRaw = talent?.pix_key_value ?? null;
  }

  const pixKeyType = normalizePixKeyType(pixKeyTypeRaw);
  const pixKey = normalizePixKeyValue(pixKeyRaw, pixKeyTypeRaw);

  if (!pixKeyType || !pixKey) {
    return NextResponse.json({ error: "Configure sua chave PIX para sacar" }, { status: 400 });
  }

  const walletBalance = Number(profile.wallet_balance ?? 0);
  // Subtract money already locked in agent virtual wallets — owner cannot withdraw those funds.
  const activelyAllocated = await getOwnerTotalActiveAllocations(user.id);
  const effectiveBalance = Math.max(0, walletBalance - activelyAllocated);
  if (roundedAmount > effectiveBalance) {
    return NextResponse.json({ error: "Saldo insuficiente." }, { status: 400 });
  }

  const { data: tx, error: txError } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: user.id,
      type: "withdrawal",
      provider: "asaas",
      amount: roundedAmount,
      net_amount: roundedAmount,
      fee_amount: 0,
      status: "processing",
      provider_status: "processing",
      description: "Saque BrisaHub",
    } as Record<string, unknown>)
    .select("id")
    .single();

  if (txError || !tx) {
    return NextResponse.json({ error: "Falha ao registrar saque." }, { status: 500 });
  }

  const { data: debitedProfile, error: debitError } = await supabase
    .from("profiles")
    .update({ wallet_balance: Number((walletBalance - roundedAmount).toFixed(2)) } as Record<string, unknown>)
    .eq("id", user.id)
    .gte("wallet_balance", roundedAmount)
    .select("id")
    .maybeSingle();

  if (debitError || !debitedProfile) {
    await supabase
      .from("wallet_transactions")
      .update({
        status: "cancelled",
        provider_status: "cancelled",
        processed_at: new Date().toISOString(),
        admin_note: "Saldo insuficiente no momento do débito.",
      } as Record<string, unknown>)
      .eq("id", tx.id);

    return NextResponse.json({ error: "Saldo insuficiente." }, { status: 400 });
  }

  try {
    const transfer = await createPixTransfer({
      value: roundedAmount,
      pixAddressKey: pixKey,
      pixAddressKeyType: pixKeyType,
      description: "Saque BrisaHub",
    });

    const providerStatus = transfer.status ?? "processing";

    const { error: updateError } = await supabase
      .from("wallet_transactions")
      .update({
        asaas_transfer_id: transfer.id,
        provider_transfer_id: transfer.id,
        provider_status: providerStatus,
      } as Record<string, unknown>)
      .eq("id", tx.id);

    if (updateError) {
      throw new Error(`withdrawal_update_failed:${updateError.message}`);
    }

    console.log("[asaas withdraw] created", {
      userId: user.id,
      transactionId: tx.id,
      transferId: transfer.id,
      amount: roundedAmount,
    });

    const fullName = (profile as Record<string, unknown>).full_name as string | null | undefined;
    const displayName = fullName?.trim() || "Talent";
    const amountStr = roundedAmount.toFixed(2).replace(".", ",");

    notifyAdmins(
      "payment",
      `${displayName} solicitou saque de R$ ${amountStr} via PIX.`,
      "/admin/finances?tab=saques",
      `admin_withdraw_req_${tx.id}`,
    ).catch((error) => console.error("[asaas withdraw] notifyAdmins failed (non-fatal)", String(error)));

    return NextResponse.json({
      success: true,
      transactionId: tx.id,
      transferId: transfer.id,
      status: "processing",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    try {
      await restoreFailedWithdrawal(supabase, {
        transactionId: tx.id,
        userId: user.id,
        amount: roundedAmount,
        providerStatus: "failed",
        adminNote: `Asaas transfer failed after debit: ${message}`,
      });
    } catch (restoreError) {
      console.error("[asaas withdraw] failed to restore wallet after transfer error", {
        userId: user.id,
        transactionId: tx.id,
        restoreError: restoreError instanceof Error ? restoreError.message : String(restoreError),
      });
      return NextResponse.json({ error: "Falha crítica ao criar saque. Contate o suporte." }, { status: 500 });
    }

    console.error("[asaas withdraw] failed", {
      userId: user.id,
      transactionId: tx.id,
      amount: roundedAmount,
      error: message,
    });
    return NextResponse.json({ error: "Falha ao criar saque Asaas." }, { status: 502 });
  }
}
