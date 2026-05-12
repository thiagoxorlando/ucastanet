import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createServerClient } from "@/lib/supabase";
import { logAdminAction } from "@/lib/auditLog";
import { getWorkspaceSeatUsage } from "@/lib/premiumWorkspace.server";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { workspaceId } = await context.params;
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace inválido." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as
    | { extraAgentSeats?: number; reason?: string }
    | null;

  const extraAgentSeats = Number(body?.extraAgentSeats);
  const reason = String(body?.reason ?? "").trim();

  if (!Number.isInteger(extraAgentSeats) || extraAgentSeats < 0) {
    return NextResponse.json({ error: "Informe um número válido de assentos extras." }, { status: 400 });
  }

  if (!reason) {
    return NextResponse.json({ error: "Informe o motivo da alteração." }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });
  const { data: currentWorkspace, error: fetchError } = await supabase
    .from("premium_workspaces")
    .select("id, included_agent_seats, extra_agent_seats, status, deleted_at")
    .eq("id", workspaceId)
    .maybeSingle();

  if (fetchError || !currentWorkspace) {
    return NextResponse.json({ error: "Não foi possível atualizar os assentos extras." }, { status: 404 });
  }

  const before = {
    included_agent_seats: Number(currentWorkspace.included_agent_seats ?? 2),
    extra_agent_seats: Number(currentWorkspace.extra_agent_seats ?? 0),
    total_seats:
      Number(currentWorkspace.included_agent_seats ?? 2) + Number(currentWorkspace.extra_agent_seats ?? 0),
    status: String(currentWorkspace.status ?? "active"),
  };

  const { data: updatedWorkspace, error: updateError } = await supabase
    .from("premium_workspaces")
    .update({
      extra_agent_seats: extraAgentSeats,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspaceId)
    .select("id, included_agent_seats, extra_agent_seats, status")
    .single();

  if (updateError || !updatedWorkspace) {
    console.error("[admin-premium-seats] update failed:", updateError);
    return NextResponse.json({ error: "Não foi possível atualizar os assentos extras." }, { status: 500 });
  }

  const after = {
    included_agent_seats: Number(updatedWorkspace.included_agent_seats ?? 2),
    extra_agent_seats: Number(updatedWorkspace.extra_agent_seats ?? 0),
    total_seats:
      Number(updatedWorkspace.included_agent_seats ?? 2) + Number(updatedWorkspace.extra_agent_seats ?? 0),
    status: String(updatedWorkspace.status ?? "active"),
  };

  await logAdminAction({
    adminId: auth.userId,
    action: "premium_extra_seats_updated",
    entityType: "premium_workspace",
    entityId: workspaceId,
    before,
    after,
    metadata: { reason },
  });

  const usage = await getWorkspaceSeatUsage(workspaceId);

  return NextResponse.json({
    ok: true,
    message: "Assentos extras atualizados com sucesso.",
    usage,
    reason,
  });
}
