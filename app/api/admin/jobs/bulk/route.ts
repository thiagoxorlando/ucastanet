import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";

function parseIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

async function deleteJobById(jobId: string) {
  const supabase = createServerClient({ useServiceRole: true });
  const now = new Date().toISOString();

  const contractsResult = await supabase
    .from("contracts")
    .update({ deleted_at: now })
    .eq("job_id", jobId)
    .neq("status", "paid");
  if (contractsResult.error) throw new Error(contractsResult.error.message);

  const submissionsResult = await supabase.from("submissions").delete().eq("job_id", jobId);
  if (submissionsResult.error) throw new Error(submissionsResult.error.message);

  const jobResult = await supabase.from("jobs").update({ deleted_at: now }).eq("id", jobId);
  if (jobResult.error) throw new Error(jobResult.error.message);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({})) as { ids?: unknown; action?: unknown };
  const ids = parseIds(body.ids);

  if (ids.length === 0) {
    return NextResponse.json({ error: "Informe ao menos uma vaga." }, { status: 400 });
  }

  if (body.action !== "disable") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });
  const { error } = await supabase
    .from("jobs")
    .update({ status: "inactive" })
    .in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, count: ids.length });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({})) as { ids?: unknown };
  const ids = parseIds(body.ids);

  if (ids.length === 0) {
    return NextResponse.json({ error: "Informe ao menos uma vaga." }, { status: 400 });
  }

  for (const id of ids) {
    try {
      await deleteJobById(id);
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Falha ao excluir vaga.",
          id,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, count: ids.length });
}
