import { createServerClient } from "@/lib/supabase";

export type AuditAction =
  | "plan_settings_changed"
  | "user_deleted"
  | "user_restored"
  | "user_frozen"
  | "balance_adjusted"
  | "notification_broadcast_sent"
  | "support_status_changed"
  | "contract_deleted"
  | "contract_exported"
  | "withdrawal_cancelled"
  | "job_status_changed"
  | string;

/**
 * Write a row to admin_audit_logs.
 *
 * Call this from any admin API route that mutates important state.
 * Failures are swallowed — audit log errors must never block the main action.
 *
 * @example
 *   await logAdminAction({
 *     adminId: auth.userId,
 *     action: "plan_settings_changed",
 *     entityType: "plan_settings",
 *     entityId: planKey,
 *     before: previousRow,
 *     after: newRow,
 *   });
 */
export async function logAdminAction(params: {
  adminId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createServerClient({ useServiceRole: true });
    await supabase.from("admin_audit_logs").insert({
      admin_id:    params.adminId,
      action:      params.action,
      entity_type: params.entityType,
      entity_id:   params.entityId   ?? null,
      before:      params.before     ?? null,
      after:       params.after      ?? null,
      metadata:    params.metadata   ?? null,
    });
  } catch {
    // Intentionally silent — audit log failures must never break the main action
  }
}
