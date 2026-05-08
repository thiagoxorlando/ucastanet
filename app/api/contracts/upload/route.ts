import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { CONTRACTS_BUCKET, sanitizeContractFileName } from "@/lib/contractFiles";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

// POST /api/contracts/upload
//
// Accepts JSON { job_id, filename, filesize } — no file body.
// Validates the caller and returns a signed upload URL so the browser can
// PUT the PDF directly to Supabase Storage, bypassing Vercel payload limits.
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

  const jobId   = typeof body.job_id   === "string" ? body.job_id.trim()   : "";
  const filename = typeof body.filename === "string" ? body.filename.trim() : "";
  const filesize = typeof body.filesize === "number" ? body.filesize : 0;

  if (!jobId || !filename) {
    return NextResponse.json({ error: "job_id e filename são obrigatórios." }, { status: 400 });
  }

  if (!/\.pdf$/i.test(filename)) {
    return NextResponse.json({ error: "Envie um arquivo PDF válido de até 20MB." }, { status: 400 });
  }

  if (filesize <= 0 || filesize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande. Envie um PDF de até 20MB." }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });

  const [{ data: caller }, { data: job, error: jobError }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("jobs").select("id, agency_id").eq("id", jobId).single(),
  ]);

  if (caller?.role !== "agency") {
    return NextResponse.json({ error: "Apenas agências podem enviar contratos." }, { status: 403 });
  }

  if (jobError || !job) {
    return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
  }

  if (job.agency_id !== user.id) {
    return NextResponse.json({ error: "Você não tem permissão para enviar contrato desta vaga." }, { status: 403 });
  }

  const safeName    = sanitizeContractFileName(filename);
  const storagePath = `contracts/${user.id}/${jobId}/${Date.now()}-${safeName}`;

  // createSignedUploadUrl lets the browser PUT the file directly to Storage
  // without going through a Vercel function, avoiding 413 errors entirely.
  const { data, error: signError } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (signError || !data?.signedUrl) {
    console.error("[contracts/upload] createSignedUploadUrl", signError);
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
