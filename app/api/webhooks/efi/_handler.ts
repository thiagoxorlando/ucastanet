import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { notifyAdmins } from "@/lib/notify";

// Shared handler for:
//   POST /api/webhooks/efi
//   POST /api/webhooks/efi/pix   ← Efí appends /pix on some configurations

type LogLevel = "info" | "warn" | "error";
function log(level: LogLevel, msg: string, ctx?: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), level, source: "webhook/efi", msg, ...ctx };
  console[level === "info" ? "log" : level](JSON.stringify(entry));
}

interface EfiPixEntry {
  txid:         string;
  valor:        string;
  horario:      string;
  endToEndId?:  string;
  infoPagador?: string;
}

interface EfiWebhookBody {
  evento?: string;
  pix?:    EfiPixEntry[];
}

const OK = () => new Response("OK", { status: 200 });

export async function handleEfiWebhook(req: NextRequest): Promise<Response> {
  // ── Parse body ────────────────────────────────────────────────────────────────
  let body: EfiWebhookBody;
  try {
    body = await req.json();
  } catch {
    log("info", "Empty or malformed body — treating as validation probe");
    return OK();
  }

  console.log("[EFI WEBHOOK RECEIVED]", {
    headers: Object.fromEntries(req.headers.entries()),
    body,
  });

  // ── No pix entries → validation probe ────────────────────────────────────────
  const pixEntries = body.pix ?? [];

  if (pixEntries.length === 0) {
    log("info", "No pix entries in payload — treating as validation probe");
    return OK();
  }

  // ── Token check — NEVER blocks, always continues ─────────────────────────────
  const receivedToken = req.headers.get("pix-token");

  console.log("[EFI WEBHOOK TOKEN RECEIVED RAW]", receivedToken);
  console.log("[EFI WEBHOOK TOKEN EXPECTED RAW]", process.env.EFI_WEBHOOK_TOKEN);

  if (receivedToken !== process.env.EFI_WEBHOOK_TOKEN) {
    console.warn("[EFI WEBHOOK TOKEN MISMATCH - NOT BLOCKING]");
  }

  console.log("[EFI WEBHOOK CONTINUING AFTER TOKEN CHECK]");

  const supabase = createServerClient({ useServiceRole: true });

  for (const entry of pixEntries) {
    const { txid, valor, endToEndId } = entry;
    const eventId = endToEndId ?? txid;

    console.log("[EFI WEBHOOK TXID]", txid);
    console.log("[EFI WEBHOOK LOOKUP]", { column: "payment_id", txid });

    // ── Deduplication gate ──────────────────────────────────────────────────────
    const { error: weErr } = await supabase
      .from("webhook_events")
      .insert({
        provider:          "efi",
        event_id:          eventId,
        provider_event_id: eventId,
        topic:             "pix.recebido",
        raw_payload:       entry as unknown as Record<string, unknown>,
        processed:         false,
      })
      .select("id")
      .single();

    if (weErr) {
      if (weErr.code === "23505") {
        log("info", "Duplicate pix entry — skipping", { txid, eventId });
        continue;
      }
      log("warn", "webhook_events insert failed (non-fatal)", { txid, err: weErr.message });
    }

    // ── Find wallet_transaction by txid ─────────────────────────────────────────
    const { data: tx, error: txErr } = await supabase
      .from("wallet_transactions")
      .select("id, user_id, amount, description, status, payment_id, provider")
      .eq("payment_id", txid)
      .eq("provider", "efi")
      .maybeSingle();

    console.log("[EFI WEBHOOK MATCHED DEPOSIT]", { txid, tx, txErr: txErr?.message ?? null });

    if (!tx) {
      log("warn", "No wallet_transaction matched — returning 200 anyway", { txid });
      continue;
    }

    const creditAmount = Number(tx.amount);

    // ── Credit wallet (atomic + idempotent via RPC) ─────────────────────────────
    const { data: creditResult, error: rpcErr } = await supabase.rpc("credit_wallet_deposit", {
      p_user_id:    tx.user_id,
      p_payment_id: txid,
      p_amount:     creditAmount,
    });

    console.log("[EFI WEBHOOK CREDIT RESULT]", { txid, creditResult, rpcErr: rpcErr?.message ?? null });

    if (rpcErr) {
      log("error", "credit_wallet_deposit failed", {
        userId: tx.user_id,
        txid,
        err:    rpcErr.message,
      });
      continue;
    }

    if (creditResult) {
      log("info", "Wallet deposit credited via Efí PIX", {
        userId: tx.user_id,
        amount: creditAmount,
        txid,
      });
      const brl = new Intl.NumberFormat("pt-BR", {
        style:                 "currency",
        currency:              "BRL",
        maximumFractionDigits: 0,
      }).format(creditAmount);
      await notifyAdmins(
        "payment",
        `Depósito de carteira confirmado (Efí PIX): ${brl}`,
        "/admin/finances",
        `admin-wallet-deposit-efi:${txid}`,
      );
    } else {
      log("info", "Wallet deposit already credited — skipping", { txid, userId: tx.user_id });
    }
  }

  return OK();
}
