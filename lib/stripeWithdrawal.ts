import { createServerClient } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";

type Supabase = ReturnType<typeof createServerClient>;

type StripeWithdrawalParams = {
  supabase: Supabase;
  userId: string;
  role: "agency" | "talent";
  amount: number;
  stripeAccountId: string;
};

type StripeWithdrawalResult = {
  txId: string;
  provider: "stripe";
  providerStatus: string;
  status: "processing" | "paid";
  payoutId: string;
  transferId: string;
};

export class StripeWithdrawalError extends Error {
  txId: string | null;
  restorable: boolean;

  constructor(message: string, options?: { txId?: string | null; restorable?: boolean }) {
    super(message);
    this.name = "StripeWithdrawalError";
    this.txId = options?.txId ?? null;
    this.restorable = options?.restorable ?? false;
  }
}

function amountToCents(amount: number) {
  return Math.round(amount * 100);
}

export async function createAutomaticStripeWithdrawal({
  supabase,
  userId,
  role,
  amount,
  stripeAccountId,
}: StripeWithdrawalParams): Promise<StripeWithdrawalResult> {
  const { data: txId, error: rpcError } = await supabase.rpc("request_wallet_withdrawal", {
    p_user_id: userId,
    p_amount: amount,
    p_kind: role,
  });

  if (rpcError || !txId) {
    throw new StripeWithdrawalError(rpcError?.message ?? "request_wallet_withdrawal_failed");
  }

  const stripe = getStripe();
  const amountInCents = amountToCents(amount);

  await supabase
    .from("wallet_transactions")
    .update({
      provider: "stripe",
      status: "processing",
      provider_status: "creating_transfer",
      admin_note: null,
    })
    .eq("id", txId);

  let transferId: string | null = null;

  try {
    const transfer = await stripe.transfers.create(
      {
        amount: amountInCents,
        currency: "brl",
        destination: stripeAccountId,
        metadata: {
          withdrawal_transaction_id: txId,
          user_id: userId,
          user_role: role,
        },
      },
      {
        idempotencyKey: `wallet_withdrawal_transfer:${txId}`,
      },
    );

    transferId = transfer.id;

    await supabase
      .from("wallet_transactions")
      .update({
        provider: "stripe",
        status: "processing",
        provider_status: "transfer_created",
        reference_id: transfer.id,
      })
      .eq("id", txId);

    const payout = await stripe.payouts.create(
      {
        amount: amountInCents,
        currency: "brl",
        metadata: {
          withdrawal_transaction_id: txId,
          transfer_id: transfer.id,
          user_id: userId,
          user_role: role,
        },
      },
      {
        stripeAccount: stripeAccountId,
        idempotencyKey: `wallet_withdrawal_payout:${txId}`,
      },
    );

    const payoutStatus = payout.status ?? "pending";

    await supabase
      .from("wallet_transactions")
      .update({
        provider: "stripe",
        provider_transfer_id: payout.id,
        provider_status: payoutStatus,
        reference_id: transfer.id,
        status: payoutStatus === "paid" ? "paid" : "processing",
        processed_at: payoutStatus === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", txId);

    if (payoutStatus === "paid") {
      await supabase.rpc("mark_wallet_withdrawal_paid", {
        p_transaction_id: txId,
        p_provider: "stripe",
        p_admin_note: "Stripe payout confirmado imediatamente.",
      });
    }

    return {
      txId,
      provider: "stripe",
      providerStatus: payoutStatus,
      status: payoutStatus === "paid" ? "paid" : "processing",
      payoutId: payout.id,
      transferId: transfer.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    let restorable = false;

    if (!transferId) {
      const { data: failResult } = await supabase.rpc("fail_wallet_withdrawal", {
        p_transaction_id: txId,
        p_reason: `Stripe automatic withdrawal failed before transfer: ${message}`,
        p_provider_status: "failed",
      });
      restorable = Boolean(failResult);
    } else {
      try {
        await stripe.transfers.createReversal(
          transferId,
          {
            metadata: {
              withdrawal_transaction_id: txId,
              reason: "payout_creation_failed",
            },
          },
          {
            idempotencyKey: `wallet_withdrawal_transfer_reversal:${txId}`,
          },
        );

        await supabase.rpc("fail_wallet_withdrawal", {
          p_transaction_id: txId,
          p_reason: `Stripe automatic withdrawal failed and transfer was reversed: ${message}`,
          p_provider_status: "failed",
        });

        await supabase
          .from("wallet_transactions")
          .update({
            provider: "stripe",
            reference_id: transferId,
          })
          .eq("id", txId);

        restorable = true;
      } catch (reversalError) {
        const reversalMessage = reversalError instanceof Error ? reversalError.message : String(reversalError);
        await supabase
          .from("wallet_transactions")
          .update({
            provider: "stripe",
            status: "processing",
            provider_status: "requires_manual_review",
            reference_id: transferId,
            admin_note: `Stripe payout failed but transfer reversal also failed: ${message}. Reversal error: ${reversalMessage}`,
          })
          .eq("id", txId);
      }
    }

    throw new StripeWithdrawalError(message, { txId, restorable });
  }
}
