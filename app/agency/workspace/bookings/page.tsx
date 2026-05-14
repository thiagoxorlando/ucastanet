import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import BookingList, { type Booking } from "@/features/agency/BookingList";
import { brl } from "@/lib/brl";
import { getUnifiedBookingStatus, unifiedStatusInfo } from "@/lib/bookingStatus";
import { requirePremiumWorkspacePageContext } from "@/lib/premiumWorkspaceApp.server";

export const metadata: Metadata = { title: "Reservas Premium — BrisaHub" };

export default async function WorkspaceBookingsPage() {
  const context = await requirePremiumWorkspacePageContext();
  const supabase = createServerClient({ useServiceRole: true });

  const { data: workspaceJobs } = await supabase
    .from("jobs")
    .select("id, title, created_by_user_id")
    .eq("workspace_id", context.workspace.id);

  const visibleJobs = context.isOwner
    ? (workspaceJobs ?? [])
    : (workspaceJobs ?? []).filter((job) => job.created_by_user_id === context.userId);

  const jobIds = visibleJobs.map((job) => job.id);
  if (jobIds.length === 0) {
    return (
      <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-10 text-center shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
        <p className="text-[15px] font-semibold text-zinc-900">Nenhuma reserva Premium ainda.</p>
        <p className="mt-2 text-[13px] leading-6 text-zinc-500">
          As reservas ligadas às vagas privadas do workspace aparecerão aqui.
        </p>
      </div>
    );
  }

  const { data: rows } = await supabase
    .from("bookings")
    .select(`
      id, talent_user_id, job_id, status, price, job_title, created_at,
      contracts!contracts_booking_id_fkey (
        id, status, signed_at, job_date, paid_at, contract_file_url, signed_contract_url
      )
    `)
    .in("job_id", jobIds)
    .order("created_at", { ascending: false });

  const talentIds = [...new Set((rows ?? []).map((row) => row.talent_user_id).filter((id): id is string => !!id))];
  const { data: profiles } = talentIds.length
    ? await supabase.from("talent_profiles").select("id, full_name, avatar_url").in("id", talentIds)
    : { data: [] };

  const nameMap = new Map<string, string>();
  const avatarMap = new Map<string, string | null>();
  for (const profile of profiles ?? []) {
    nameMap.set(profile.id, profile.full_name ?? "Talento");
    avatarMap.set(profile.id, (profile as { avatar_url?: string | null }).avatar_url ?? null);
  }

  const bookings: Booking[] = (rows ?? []).map((row) => {
    const contract = Array.isArray((row as { contracts?: unknown[] }).contracts) ? (row as { contracts?: Record<string, unknown>[] }).contracts?.[0] ?? null : null;
    return {
      id: String(row.id ?? ""),
      contractId: contract?.id ? String(contract.id) : null,
      talentId: String(row.talent_user_id ?? ""),
      talentName: nameMap.get(String(row.talent_user_id ?? "")) ?? "Talento",
      talentAvatarUrl: avatarMap.get(String(row.talent_user_id ?? "")) ?? null,
      status: String(row.status ?? "pending"),
      contractStatus: contract?.status ? String(contract.status) : null,
      derivedStatus: getUnifiedBookingStatus(String(row.status ?? "pending"), contract?.status ? String(contract.status) : null),
      totalValue: Number(row.price ?? 0),
      jobTitle: String(row.job_title ?? ""),
      createdAt: String(row.created_at ?? ""),
      contractSigned: contract?.signed_at ? String(contract.signed_at) : null,
      jobDate: contract?.job_date ? String(contract.job_date) : null,
      paidAt: contract?.paid_at ? String(contract.paid_at) : null,
      hasContractFile: !!contract?.contract_file_url,
      hasSignedContract: !!contract?.signed_contract_url,
    };
  });

  if (context.isOwner) {
    return <BookingList bookings={bookings} financesHref="/agency/workspace/wallet" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[1.8rem] font-bold tracking-tight text-zinc-950">Reservas Premium</h1>
        <p className="mt-1 text-[14px] text-zinc-500">
          Visualização das reservas ligadas às vagas do Espaço Premium.
        </p>
      </div>

      {bookings.map((booking) => {
        const status = unifiedStatusInfo(booking.derivedStatus);
        return (
          <div key={booking.id} className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[17px] font-semibold text-zinc-950">{booking.jobTitle}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.badge}`}>
                    {status.label}
                  </span>
                </div>
                <p className="mt-2 text-[13px] text-zinc-600">Talento: {booking.talentName}</p>
                <div className="mt-3 grid gap-3 text-[13px] text-zinc-600 sm:grid-cols-2 xl:grid-cols-4">
                  <p><span className="font-semibold text-zinc-800">Valor:</span> {brl(booking.totalValue)}</p>
                  <p><span className="font-semibold text-zinc-800">Data:</span> {booking.jobDate ? new Date(`${booking.jobDate}T00:00:00`).toLocaleDateString("pt-BR") : "A definir"}</p>
                  <p><span className="font-semibold text-zinc-800">Criada em:</span> {new Date(booking.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
