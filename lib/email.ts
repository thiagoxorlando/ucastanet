function maskEmailAddress(value: string) {
  const [localPart = "", domain = ""] = value.split("@");
  if (!domain) return value.slice(0, 2) + "...";

  const visibleLocal =
    localPart.length <= 2
      ? localPart[0] ?? "*"
      : `${localPart.slice(0, 2)}***${localPart.slice(-1)}`;

  return `${visibleLocal}@${domain}`;
}

export type SendEmailResult = {
  attempted: boolean;
  ok: boolean;
  status: number | "missing_key" | "network_error";
  body?: string;
  error?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    (process.env.NODE_ENV === "production"
      ? "Brisa Digital <noreply@brisadigital.com>"
      : "onboarding@resend.dev");

  console.log("[email] sendEmail called", {
    to: maskEmailAddress(to),
    subject,
    hasKey: Boolean(key),
  });

  if (!key) {
    console.error("[email] RESEND_API_KEY not set - email not sent");
    return {
      attempted: false,
      ok: false,
      status: "missing_key",
      error: "RESEND_API_KEY is not configured",
    } satisfies SendEmailResult;
  }

  const payload = {
    from,
    to: [to],
    subject,
    html,
  };

  console.log("[email] Sending request to Resend", {
    endpoint: "https://api.resend.com/emails",
    from: payload.from,
    to: payload.to.map(maskEmailAddress),
  });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await res.text();

    console.log("[email] Resend response", {
      status: res.status,
      ok: res.ok,
      body,
    });

    if (!res.ok) {
      console.error("[email] Resend error:", res.status, body);
    }

    return {
      attempted: true,
      ok: res.ok,
      status: res.status,
      body,
      ...(res.ok ? {} : { error: body || `Resend returned ${res.status}` }),
    } satisfies SendEmailResult;
  } catch (error) {
    console.error("[email] Request to Resend failed", error);
    return {
      attempted: true,
      ok: false,
      status: "network_error",
      error: error instanceof Error ? error.message : "Request to Resend failed",
    } satisfies SendEmailResult;
  }
}
