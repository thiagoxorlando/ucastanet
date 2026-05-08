import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { resolveContractFileUrl, getContractBucket, getStoredContractPath, CONTRACTS_BUCKET } from "@/lib/contractFiles";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const fileType = req.nextUrl.searchParams.get("type") === "signed" ? "signed" : "original";

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const supabase = createServerClient({ useServiceRole: true });

  const [{ data: contract, error: contractError }, { data: caller }] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, agency_id, talent_id, contract_file_url, signed_contract_url")
      .eq("id", id)
      .single(),
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single(),
  ]);

  if (contractError || !contract) {
    return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
  }

  const canRead =
    caller?.role === "admin" ||
    (caller?.role === "agency" && contract.agency_id === user.id) ||
    (caller?.role === "talent" && contract.talent_id === user.id);

  if (!canRead) {
    return NextResponse.json({ error: "Você não tem permissão para acessar este contrato." }, { status: 403 });
  }

  const fileRef = fileType === "signed" ? contract.signed_contract_url : contract.contract_file_url;
  if (!fileRef) {
    return NextResponse.json({ error: "Arquivo do contrato não encontrado." }, { status: 404 });
  }

  const storagePath = getStoredContractPath(fileRef);
  const bucket      = getContractBucket(fileType, fileRef);

  console.error("[contracts/file] resolving", {
    contractId: id,
    field: fileType === "signed" ? "signed_contract_url" : "contract_file_url",
    fileRef,
    storagePath,
    bucket,
  });

  const fileUrl = await resolveContractFileUrl(supabase, fileType, fileRef);
  if (!fileUrl) {
    console.error("[contracts/file] failed to resolve URL", {
      contractId: id,
      fileType,
      fileRef,
      storagePath,
      bucket,
    });
    return NextResponse.json({ error: "Arquivo do contrato não encontrado." }, { status: 404 });
  }

  return NextResponse.redirect(fileUrl);
}
