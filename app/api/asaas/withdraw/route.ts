import { NextRequest, NextResponse } from "next/server";
import { createPixTransfer } from "@/lib/asaas";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

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
  if (roundedAmount <= 0) {
    return NextResponse.json({ error: "Valor de saque inválido." }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, wallet_balance")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const walletBalance = Number(profile.wallet_balance ?? 0);
  if (roundedAmount > walletBalance) {
    return NextResponse.json({ error: "Saldo insuficiente." }, { status: 400 });
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

  try {
    const transfer = await createPixTransfer({
      value: roundedAmount,
      pixAddressKey: pixKey,
      pixAddressKeyType: pixKeyType,
      description: "Saque BrisaHub",
    });

    const { data: tx, error: txError } = await supabase
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        type: "withdrawal",
        amount: roundedAmount,
        description: "Saque BrisaHub",
        provider: "asaas",
        status: "processing",
        provider_status: transfer.status ?? "processing",
        provider_transfer_id: transfer.id,
        asaas_transfer_id: transfer.id,
      } as Record<string, unknown>)
      .select("id")
      .single();

    if (txError || !tx) {
      throw new Error(txError?.message ?? "Failed to create withdrawal transaction");
    }

    const { error: balanceError } = await supabase.rpc("increment_wallet_balance", {
      p_user_id: user.id,
      p_amount: -roundedAmount,
    });

    if (balanceError) {
      throw new Error(balanceError.message);
    }

    console.log("[asaas withdraw] created", {
      userId: user.id,
      transactionId: tx.id,
      transferId: transfer.id,
      amount: roundedAmount,
    });

    return NextResponse.json({
      success: true,
      transactionId: tx.id,
      transferId: transfer.id,
      status: "processing",
    });
  } catch (error) {
    console.error("[asaas withdraw] failed", {
      userId: user.id,
      amount: roundedAmount,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Falha ao criar saque Asaas." }, { status: 502 });
  }
}
