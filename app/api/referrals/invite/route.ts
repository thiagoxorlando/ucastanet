/**
 * POST /api/referrals/invite
 *
 * Called when a talent fills out the referral form on a job page.
 * Creates a submission + referral_invite row, then emails the referred person.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { sendEmail, validateEmailConfig } from "@/lib/resend";
import { notify } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { job_id, referrer_id, referred_email, referred_name, bio, video_url } = body;

  if (!job_id || !referrer_id || !referred_email) {
    return NextResponse.json(
      { error: "job_id, referrer_id e referred_email são obrigatórios" },
      { status: 400 }
    );
  }

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });
  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (caller?.role !== "talent" || referrer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const emailConfig = validateEmailConfig();
  if (!emailConfig.ok) {
    return NextResponse.json({ error: emailConfig.error }, { status: 500 });
  }

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("title, agency_id, visibility")
    .eq("id", job_id)
    .single();

  if (jobErr || !job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (job.visibility === "private") {
    const { data: invite } = await supabase
      .from("job_invites")
      .select("id")
      .eq("job_id", job_id)
      .eq("talent_id", user.id)
      .maybeSingle();

    if (!invite) {
      return NextResponse.json({ error: "Esta vaga privada aceita indicaÃ§Ãµes apenas de talentos convidados." }, { status: 403 });
    }
  }

  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .insert({
      job_id,
      talent_user_id: null,
      talent_name: referred_name ?? null,
      email: referred_email,
      bio: bio ?? null,
      video_url: video_url ?? null,
      referrer_id: user.id,
      status: "pending",
      mode: "other",
    })
    .select("id")
    .single();

  if (subErr) {
    console.error("[POST /api/referrals/invite] submission error:", subErr);
    return NextResponse.json({ error: subErr.message }, { status: 400 });
  }

  const { data: invite, error: inviteErr } = await supabase
    .from("referral_invites")
    .insert({
      job_id,
      referrer_id: user.id,
      referred_email,
      referred_name: referred_name ?? null,
      submission_id: submission.id,
      status: "pending",
    })
    .select("id, token")
    .single();

  if (inviteErr) {
    console.error("[POST /api/referrals/invite] invite error:", inviteErr);
    return NextResponse.json({ error: inviteErr.message }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const signupLink = `${appUrl}/signup?role=talent&ref=${invite.token}`;
  const jobTitle = job?.title ?? "uma vaga";

  let emailSent = false;
  let emailStatus: number | string | null = null;
  let emailError: string | null = null;

  try {
    const emailResult = await sendEmail({
      to: referred_email,
      subject: `Você foi indicado para "${jobTitle}" na Brisa Digital`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
          <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Você recebeu uma indicação!</h2>
          <p style="font-size:15px;color:#555;line-height:1.6;margin-bottom:24px">
            Alguém acredita que você é o talento certo para
            <strong>${jobTitle}</strong>.
            Crie sua conta gratuita na Brisa Digital e candidate-se com um clique.
          </p>
          <a href="${signupLink}"
             style="display:inline-block;background:#18181b;color:#fff;font-size:14px;font-weight:600;
                    padding:12px 28px;border-radius:12px;text-decoration:none">
            Criar conta e candidatar-se
          </a>
          <p style="font-size:12px;color:#aaa;margin-top:32px">
            Se você não esperava este e-mail, pode ignorá-lo com segurança.
          </p>
        </div>
      `,
    });

    emailSent = emailResult.ok;
    emailStatus = emailResult.status;
    emailError = emailResult.error ?? null;
  } catch (error) {
    console.error("[POST /api/referrals/invite] email error:", error);
    emailStatus = "unexpected_error";
    emailError = error instanceof Error ? error.message : "Unexpected email error";
  }

  if (job?.agency_id) {
    await notify(
      job.agency_id,
      "referral",
      `Nova indicação: ${referred_name ?? referred_email} para "${jobTitle}"`,
      "/agency/submissions"
    );
  }

  return NextResponse.json(
    {
      ok: true,
      invite_id: invite.id,
      emailSent,
      emailStatus,
      ...(emailError ? { emailError } : {}),
    },
    { status: 201 }
  );
}
