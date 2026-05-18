import { createServerClient } from "@/lib/supabase";

export type ContractCreationAccess =
  | {
      kind: "workspace";
      allowed: true;
      workspaceId: string;
      agencyId: string;
      createdByUserId: string | null;
      isOwner: boolean;
      isCreator: boolean;
    }
  | {
      kind: "open";
      allowed: true;
      agencyId: string;
    }
  | {
      kind: "workspace";
      allowed: false;
      error: string;
      status: number;
    }
  | {
      kind: "open";
      allowed: false;
      error: string;
      status: number;
    };

export async function resolveContractCreationAccess(args: {
  userId: string;
  jobId: string | null | undefined;
  requestedAgencyId: string | null | undefined;
}): Promise<ContractCreationAccess> {
  const { userId, jobId, requestedAgencyId } = args;

  if (!jobId) {
    if (!requestedAgencyId || requestedAgencyId !== userId) {
      return {
        kind: "open",
        allowed: false,
        error: "Cannot create contracts for another agency",
        status: 403,
      };
    }

    return {
      kind: "open",
      allowed: true,
      agencyId: requestedAgencyId,
    };
  }

  const supabase = createServerClient({ useServiceRole: true });

  const { data: job } = await supabase
    .from("jobs")
    .select("agency_id, workspace_id, created_by_user_id")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) {
    return {
      kind: "open",
      allowed: false,
      error: "Job not found",
      status: 404,
    };
  }

  const workspaceId = (job as { workspace_id?: string | null }).workspace_id ?? null;
  const agencyId = String(job.agency_id ?? "");
  const createdByUserId = (job as { created_by_user_id?: string | null }).created_by_user_id ?? null;

  if (!workspaceId) {
    if (!requestedAgencyId || requestedAgencyId !== userId || agencyId !== requestedAgencyId) {
      return {
        kind: "open",
        allowed: false,
        error: "Cannot create contracts for another agency",
        status: 403,
      };
    }

    return {
      kind: "open",
      allowed: true,
      agencyId,
    };
  }

  const { data: member } = await supabase
    .from("premium_workspace_members")
    .select("role, status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!member || member.status !== "active") {
    return {
      kind: "workspace",
      allowed: false,
      error: "Você não tem acesso a este workspace.",
      status: 403,
    };
  }

  const isOwner = member.role === "owner";
  const isCreator = createdByUserId === userId;

  if (!isOwner && !isCreator) {
    return {
      kind: "workspace",
      allowed: false,
      error: "Você só pode contratar talentos para vagas criadas por você.",
      status: 403,
    };
  }

  return {
    kind: "workspace",
    allowed: true,
    workspaceId,
    agencyId,
    createdByUserId,
    isOwner,
    isCreator,
  };
}

export async function getExistingContractColumns() {
  const supabase = createServerClient({ useServiceRole: true });
  const { data } = await supabase
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", "contracts")
    .in("column_name", ["workspace_id", "created_by_user_id"]);

  const cols = new Set((data ?? []).map((row) => String((row as { column_name?: string }).column_name ?? "")));
  return {
    hasWorkspaceId: cols.has("workspace_id"),
    hasCreatedByUserId: cols.has("created_by_user_id"),
  };
}
