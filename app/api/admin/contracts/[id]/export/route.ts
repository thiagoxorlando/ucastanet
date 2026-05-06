import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";
import { brl } from "@/lib/brl";

type Params = { params: Promise<{ id: string }> };

type ContractExportRow = {
  id: string;
  job_id: string | null;
  agency_id: string | null;
  talent_id: string | null;
  status: string | null;
  payment_status: string | null;
  payment_amount: number | null;
  commission_amount?: number | null;
  net_amount?: number | null;
  created_at: string | null;
  signed_at: string | null;
  agency_signed_at: string | null;
  deposit_paid_at: string | null;
  paid_at: string | null;
  withdrawn_at?: string | null;
  confirmed_at?: string | null;
  deleted_at: string | null;
  job_date: string | null;
  job_time: string | null;
  location: string | null;
  job_description: string | null;
  payment_method: string | null;
  additional_notes: string | null;
  contract_file_url: string | null;
  signed_contract_url: string | null;
  pix_payment_id?: string | null;
  payment_provider?: string | null;
};

type JobExportRow = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  location: string | null;
  city?: string | null;
  state?: string | null;
  budget: number | null;
  created_at: string | null;
  status: string | null;
};

type AgencyExportRow = {
  id: string;
  user_id: string | null;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
};

type TalentExportRow = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  phone: string | null;
};

type ProfileExportRow = {
  id: string;
  full_name: string | null;
  cpf_cnpj?: string | null;
};

type WalletTransactionExportRow = {
  id: string;
  user_id?: string | null;
  type?: string | null;
  amount?: number | null;
  description?: string | null;
  status?: string | null;
  payment_id?: string | null;
  reference_id?: string | null;
  created_at?: string | null;
  processed_at?: string | null;
  provider?: string | null;
  provider_status?: string | null;
  provider_transfer_id?: string | null;
  asaas_payment_id?: string | null;
  fee_amount?: number | null;
  net_amount?: number | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Não consta";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não consta";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatJobDateTime(dateValue: string | null | undefined, timeValue: string | null | undefined) {
  if (!dateValue && !timeValue) return "Não consta";
  if (!dateValue) return timeValue || "Não consta";

  const date = new Date(`${dateValue}T${timeValue || "00:00:00"}`);
  if (Number.isNaN(date.getTime())) {
    return [dateValue, timeValue].filter(Boolean).join(" ") || "Não consta";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function textValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "Não consta";
  return String(value);
}

function paymentStatusLabel(value: string | null | undefined) {
  switch (String(value ?? "").toLowerCase()) {
    case "pending":
      return "Pendente";
    case "processing":
      return "Processando";
    case "paid":
      return "Pago";
    case "failed":
      return "Falhou";
    case "cancelled":
    case "canceled":
      return "Cancelado";
    default:
      return textValue(value);
  }
}

function contractStatusLabel(value: string | null | undefined) {
  switch (String(value ?? "").toLowerCase()) {
    case "sent":
      return "Aguardando talento";
    case "signed":
      return "Depósito pendente";
    case "confirmed":
      return "Vaga confirmada";
    case "paid":
      return "Pago";
    case "rejected":
      return "Rejeitado";
    case "cancelled":
    case "canceled":
      return "Cancelado";
    default:
      return textValue(value);
  }
}

function buildReadableText(payload: ReturnType<typeof buildPayload>) {
  const walletIds = payload.payment_audit.wallet_transaction_ids.length > 0
    ? payload.payment_audit.wallet_transaction_ids.join(", ")
    : "Não consta";

  const contractOriginal = payload.contract.contract_file_url ? "Disponível" : "Não disponível";
  const signedContract = payload.contract.signed_contract_url ? "Disponível" : "Não disponível";
  const paymentReference = [
    payload.payment_audit.contract_payment_reference.payment_provider,
    payload.payment_audit.contract_payment_reference.pix_payment_id,
  ].filter(Boolean).join(" / ");

  return [
    "COMPROVANTE / BACKUP DO CONTRATO",
    "",
    "Dados do contrato:",
    `- ID: ${textValue(payload.contract.id)}`,
    `- status: ${contractStatusLabel(payload.contract.status)}`,
    `- status do pagamento: ${paymentStatusLabel(payload.contract.payment_status)}`,
    `- valor bruto: ${brl(payload.contract.amount)}`,
    `- comissão da plataforma: ${payload.contract.commission_amount == null ? "Não consta" : brl(payload.contract.commission_amount)}`,
    `- valor líquido do talento: ${payload.contract.net_amount == null ? "Não consta" : brl(payload.contract.net_amount)}`,
    `- criado em: ${formatDateTime(payload.contract.created_at)}`,
    `- assinado em: ${formatDateTime(payload.contract.signed_at)}`,
    `- confirmado em: ${formatDateTime(payload.contract.confirmed_at)}`,
    `- pago em: ${formatDateTime(payload.contract.paid_at)}`,
    `- data/hora do trabalho: ${formatJobDateTime(payload.contract.job_date, payload.contract.job_time)}`,
    `- local: ${textValue(payload.contract.location)}`,
    `- descrição: ${textValue(payload.contract.job_description)}`,
    `- método de pagamento: ${textValue(payload.contract.payment_method)}`,
    "",
    "Dados da vaga:",
    `- ID: ${textValue(payload.job.id)}`,
    `- título: ${textValue(payload.job.title)}`,
    `- descrição: ${textValue(payload.job.description)}`,
    `- categoria: ${textValue(payload.job.category)}`,
    `- cidade/estado/local: ${[payload.job.city, payload.job.state, payload.job.location].filter(Boolean).join(" / ") || "Não consta"}`,
    `- valor: ${brl(payload.job.amount)}`,
    `- status: ${textValue(payload.job.status)}`,
    "",
    "Dados da agência:",
    `- ID do perfil: ${textValue(payload.agency.profile_id)}`,
    `- nome da agência: ${textValue(payload.agency.agency_name)}`,
    `- responsável: ${textValue(payload.agency.responsible_name)}`,
    `- e-mail: ${textValue(payload.agency.email)}`,
    `- telefone: ${textValue(payload.agency.phone)}`,
    `- CPF/CNPJ: ${textValue(payload.agency.cpf_cnpj)}`,
    "",
    "Dados do talento:",
    `- ID do perfil: ${textValue(payload.talent.profile_id)}`,
    `- nome: ${textValue(payload.talent.full_name)}`,
    `- e-mail: ${textValue(payload.talent.email)}`,
    `- telefone: ${textValue(payload.talent.phone)}`,
    `- CPF: ${textValue(payload.talent.cpf)}`,
    "",
    "Auditoria de pagamento:",
    `- valor bruto: ${brl(payload.payment_audit.gross_amount)}`,
    `- comissão: ${payload.payment_audit.platform_commission == null ? "Não consta" : brl(payload.payment_audit.platform_commission)}`,
    `- valor líquido: ${payload.payment_audit.talent_net_amount == null ? "Não consta" : brl(payload.payment_audit.talent_net_amount)}`,
    `- referência Asaas/PIX se existir: ${paymentReference || "Não consta"}`,
    `- IDs de transações da carteira se existirem: ${walletIds}`,
    "",
    "Arquivos:",
    `- contrato original: ${contractOriginal}`,
    `- contrato assinado: ${signedContract}`,
    "",
  ].join("\n");
}

function buildPayload(contract: ContractExportRow, jobRow: JobExportRow | null, agencyRow: AgencyExportRow | null, agencyProfileRow: ProfileExportRow | null, talentRow: TalentExportRow | null, talentProfileRow: ProfileExportRow | null, authEmailMap: Map<string, string | null>, walletTransactionRows: WalletTransactionExportRow[]) {
  return {
    exported_at: new Date().toISOString(),
    contract: {
      id: contract.id,
      status: contract.status ?? null,
      payment_status: contract.payment_status ?? null,
      amount: Number(contract.payment_amount ?? 0),
      commission_amount: typeof contract.commission_amount === "number" ? contract.commission_amount : null,
      net_amount: typeof contract.net_amount === "number" ? contract.net_amount : null,
      created_at: contract.created_at ?? null,
      signed_at: contract.signed_at ?? null,
      agency_signed_at: contract.agency_signed_at ?? null,
      confirmed_at: ("confirmed_at" in contract ? contract.confirmed_at : null) ?? null,
      deposit_paid_at: contract.deposit_paid_at ?? null,
      paid_at: contract.paid_at ?? null,
      withdrawn_at: contract.withdrawn_at ?? null,
      deleted_at: contract.deleted_at ?? null,
      job_date: contract.job_date ?? null,
      job_time: contract.job_time ?? null,
      location: contract.location ?? null,
      job_description: contract.job_description ?? null,
      payment_method: contract.payment_method ?? null,
      additional_notes: contract.additional_notes ?? null,
      contract_file_url: contract.contract_file_url ?? null,
      signed_contract_url: contract.signed_contract_url ?? null,
    },
    job: {
      id: contract.job_id ?? jobRow?.id ?? null,
      title: jobRow?.title ?? null,
      description: jobRow?.description ?? contract.job_description ?? null,
      category: jobRow?.category ?? null,
      city: jobRow?.city ?? null,
      state: jobRow?.state ?? null,
      location: jobRow?.location ?? contract.location ?? null,
      amount: typeof jobRow?.budget === "number" ? jobRow.budget : Number(contract.payment_amount ?? 0),
      created_at: jobRow?.created_at ?? null,
      status: jobRow?.status ?? null,
    },
    agency: {
      profile_id: contract.agency_id ?? null,
      agency_id: agencyRow?.id ?? contract.agency_id ?? null,
      agency_name: agencyRow?.company_name ?? null,
      responsible_name: agencyRow?.contact_name ?? agencyProfileRow?.full_name ?? null,
      email: authEmailMap.get(contract.agency_id ?? "") ?? null,
      phone: agencyRow?.phone ?? null,
      cpf_cnpj: agencyProfileRow?.cpf_cnpj ?? null,
    },
    talent: {
      profile_id: contract.talent_id ?? null,
      talent_id: talentRow?.id ?? contract.talent_id ?? null,
      full_name: talentRow?.full_name ?? talentProfileRow?.full_name ?? null,
      email: authEmailMap.get(contract.talent_id ?? "") ?? null,
      phone: talentRow?.phone ?? null,
      cpf: talentProfileRow?.cpf_cnpj ?? null,
    },
    payment_audit: {
      gross_amount: Number(contract.payment_amount ?? 0),
      platform_commission: typeof contract.commission_amount === "number" ? contract.commission_amount : null,
      talent_net_amount: typeof contract.net_amount === "number" ? contract.net_amount : null,
      contract_payment_reference: {
        pix_payment_id: ("pix_payment_id" in contract ? contract.pix_payment_id : null) ?? null,
        payment_provider: ("payment_provider" in contract ? contract.payment_provider : null) ?? null,
      },
      wallet_transaction_ids: walletTransactionRows.map((tx) => tx.id),
      wallet_transactions: walletTransactionRows.map((tx) => {
        const row = tx as Record<string, unknown>;
        return {
          id: String(row.id ?? ""),
          user_id: typeof row.user_id === "string" ? row.user_id : null,
          type: typeof row.type === "string" ? row.type : null,
          amount: Number(row.amount ?? 0),
          status: typeof row.status === "string" ? row.status : null,
          description: typeof row.description === "string" ? row.description : null,
          payment_id: typeof row.payment_id === "string" ? row.payment_id : null,
          reference_id: typeof row.reference_id === "string" ? row.reference_id : null,
          provider: typeof row.provider === "string" ? row.provider : null,
          provider_status: typeof row.provider_status === "string" ? row.provider_status : null,
          provider_transfer_id: typeof row.provider_transfer_id === "string" ? row.provider_transfer_id : null,
          asaas_payment_id: typeof row.asaas_payment_id === "string" ? row.asaas_payment_id : null,
          fee_amount: typeof row.fee_amount === "number" ? row.fee_amount : null,
          net_amount: typeof row.net_amount === "number" ? row.net_amount : null,
          created_at: typeof row.created_at === "string" ? row.created_at : null,
          processed_at: typeof row.processed_at === "string" ? row.processed_at : null,
        };
      }),
    },
  };
}

async function fetchWalletTransactions(
  supabase: ReturnType<typeof createServerClient>,
  contractId: string,
) {
  const preferredSelect = [
    "id",
    "user_id",
    "type",
    "amount",
    "description",
    "status",
    "payment_id",
    "reference_id",
    "created_at",
    "processed_at",
    "provider",
    "provider_status",
    "provider_transfer_id",
    "asaas_payment_id",
    "fee_amount",
    "net_amount",
  ].join(", ");

  const preferred = await supabase
    .from("wallet_transactions")
    .select(preferredSelect)
    .eq("reference_id", contractId)
    .order("created_at", { ascending: false });

  if (!preferred.error) {
    return preferred.data ?? [];
  }

  const fallbackSelect = [
    "id",
    "user_id",
    "type",
    "amount",
    "description",
    "status",
    "payment_id",
    "reference_id",
    "created_at",
  ].join(", ");

  const fallback = await supabase
    .from("wallet_transactions")
    .select(fallbackSelect)
    .eq("reference_id", contractId)
    .order("created_at", { ascending: false });

  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  return fallback.data ?? [];
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const supabase = createServerClient({ useServiceRole: true });

  const contractSelect = [
    "id",
    "job_id",
    "agency_id",
    "talent_id",
    "status",
    "payment_status",
    "payment_amount",
    "commission_amount",
    "net_amount",
    "created_at",
    "signed_at",
    "agency_signed_at",
    "deposit_paid_at",
    "paid_at",
    "withdrawn_at",
    "confirmed_at",
    "deleted_at",
    "job_date",
    "job_time",
    "location",
    "job_description",
    "payment_method",
    "additional_notes",
    "contract_file_url",
    "signed_contract_url",
    "pix_payment_id",
    "payment_provider",
  ].join(", ");

  const { data: contractData, error: contractError } = await supabase
    .from("contracts")
    .select(contractSelect)
    .eq("id", id)
    .single();

  if (contractError || !contractData) {
    return NextResponse.json({ error: "Contrato nao encontrado." }, { status: 404 });
  }

  const contract = contractData as unknown as ContractExportRow;

  const [{ data: job }, { data: agency }, { data: talent }, { data: agencyProfile }, { data: talentProfile }, walletTransactions] = await Promise.all([
    contract.job_id
      ? supabase
          .from("jobs")
          .select("id, title, description, category, location, city, state, budget, created_at, status")
          .eq("id", contract.job_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    contract.agency_id
      ? supabase
          .from("agencies")
          .select("id, user_id, company_name, contact_name, phone")
          .eq("id", contract.agency_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    contract.talent_id
      ? supabase
          .from("talent_profiles")
          .select("id, user_id, full_name, phone")
          .eq("id", contract.talent_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    contract.agency_id
      ? supabase
          .from("profiles")
          .select("id, full_name, cpf_cnpj")
          .eq("id", contract.agency_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    contract.talent_id
      ? supabase
          .from("profiles")
          .select("id, full_name, cpf_cnpj")
          .eq("id", contract.talent_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    fetchWalletTransactions(supabase, id),
  ]);

  const jobRow = job as unknown as JobExportRow | null;
  const agencyRow = agency as unknown as AgencyExportRow | null;
  const talentRow = talent as unknown as TalentExportRow | null;
  const agencyProfileRow = agencyProfile as unknown as ProfileExportRow | null;
  const talentProfileRow = talentProfile as unknown as ProfileExportRow | null;
  const walletTransactionRows = walletTransactions as unknown as WalletTransactionExportRow[];

  const authUserIds = [contract.agency_id, contract.talent_id].filter((value): value is string => Boolean(value));
  const authEmailMap = new Map<string, string | null>();
  if (authUserIds.length > 0) {
    const authUsers = await Promise.all(
      authUserIds.map(async (userId) => {
        const result = await supabase.auth.admin.getUserById(userId);
        return { userId, email: result.data.user?.email ?? null };
      }),
    );

    for (const user of authUsers) {
      authEmailMap.set(user.userId, user.email);
    }
  }

  const payload = buildPayload(
    contract,
    jobRow,
    agencyRow,
    agencyProfileRow,
    talentRow,
    talentProfileRow,
    authEmailMap,
    walletTransactionRows,
  );

  const format = _req.nextUrl.searchParams.get("format")?.toLowerCase() ?? "txt";

  if (format === "json") {
    const body = `${JSON.stringify(payload, null, 2)}\n`;
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="contrato-${contract.id}-backup.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const body = `${buildReadableText(payload)}\n`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="contrato-${contract.id}-backup.txt"`,
      "Cache-Control": "no-store",
    },
  });
}
