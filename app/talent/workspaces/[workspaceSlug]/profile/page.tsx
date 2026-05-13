import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import TalentProfileEdit from "@/features/talent/TalentProfileEdit";

export const metadata: Metadata = { title: "Perfil — BrisaHub" };

type Props = { params: Promise<{ workspaceSlug: string }> };

export default async function WorkspaceProfilePage({ params }: Props) {
  const { workspaceSlug } = await params;

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) notFound();

  const supabase = createServerClient({ useServiceRole: true });

  const { data: workspace } = await supabase
    .from("premium_workspaces")
    .select("name")
    .eq("slug", workspaceSlug)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (!workspace) notFound();

  return (
    <div className="space-y-5">
      <div className="rounded-[18px] border border-amber-100 bg-amber-50 px-4 py-3">
        <p className="text-[13px] text-amber-700">
          Este perfil será usado nas suas candidaturas para <span className="font-semibold">{workspace.name}</span>.
          Mantenha-o atualizado para aumentar suas chances.
        </p>
      </div>
      <TalentProfileEdit />
    </div>
  );
}
