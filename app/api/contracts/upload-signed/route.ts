import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { CONTRACTS_BUCKET, sanitizeContractFileName } from "@/lib/contractFiles";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

// POST /api/contracts/upload-signed
//
// Accepts JSON { contract_id, filename, filesize } — no file body.
// Validates that the caller is the talent who owns the contract, then returns
// a signed upload URL so the browser can PUT the PDF directly to Supabase
// Storage without going through Vercel (avoids 413 payload errors).
export async function POST(req: NextRequest) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const contractId = typeof body.contract_id === "string" ? body.contract_id.trim() : "";
  const filename   = typeof body.filename    === "string" ? body.filename.trim()    : "";
  const filesize   = typeof body.filesize    === "number" ? body.filesize            : 0;

  if (!contractId || !filename) {
    return NextResponse.json({ error: "contract_id e filename são obrigatórios." }, { status: 400 });
  }

  if (!/\.pdf$/i.test(filename)) {
    return NextResponse.json({ error: "Envie um arquivo PDF válido de até 20MB." }, { status: 400 });
  }

  if (filesize <= 0 || filesize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande. Envie um PDF de até 20MB." }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  // Verify the caller is the talent listed on the contract
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("id, talent_id")
    .eq("id", contractId)
    .single();

  if (contractError || !contract) {
    return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
  }

  if (contract.talent_id !== user.id) {
    return NextResponse.json({ error: "Você não tem permissão para enviar o contrato assinado." }, { status: 403 });
  }

  const safeName    = sanitizeContractFileName(filename);
  const storagePath = `contracts/signed/${user.id}/${contractId}/${Date.now()}-${safeName}`;

  const { data, error: signError } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (signError || !data?.signedUrl) {
    console.error("[contracts/upload-signed] createSignedUploadUrl", signError);
    return NextResponse.json(
      { error: "Falha ao gerar URL de upload. Tente novamente." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token:     data.token,
    path:      storagePath,
  });
}
