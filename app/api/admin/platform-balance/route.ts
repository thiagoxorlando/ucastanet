import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

// GET /api/admin/platform-balance
// Legacy: fetches the available balance from the Mercado Pago account.
// This check is display-only and must NOT affect Efí PIX withdrawals.
// If MP is unreachable or misconfigured, returns unavailable:true with 200
// so the admin UI degrades gracefully without noisy production errors.

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ available_balance: null, unavailable: true, provider: "mercadopago" });
  }

  try {
    const res = await fetch("https://api.mercadopago.com/v1/account/balance", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      // Warn-level only — MP balance is legacy/display-only, not critical.
      console.warn("[platform-balance] MP unavailable", { status: res.status, body: text.slice(0, 200) });
      return NextResponse.json({ available_balance: null, unavailable: true, provider: "mercadopago" });
    }

    const data = await res.json() as Record<string, unknown>;
    const available = Number(data.available_balance ?? 0);
    return NextResponse.json({ available_balance: available, provider: "mercadopago" });
  } catch (err) {
    console.warn("[platform-balance] fetch error (non-fatal)", String(err));
    return NextResponse.json({ available_balance: null, unavailable: true, provider: "mercadopago" });
  }
}
