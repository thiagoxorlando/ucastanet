import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { CONTRACTS_BUCKET, sanitizeContractFileName } from "@/lib/contractFiles";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function ensureContractsBucket(
  supabase: ReturnType<typeof createServerClient>,
) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) return { error: "Não foi possível verificar o bucket de contratos." };

  const exists = (buckets ?? []).some((bucket) => bucket.name === CONTRACTS_BUCKET);
  if (exists) return { error: null as string | null };

  const { error: createError } = await supabase.storage.createBucket(CONTRACTS_BUCKET, {
    public: false,
    fileSizeLimit: `${MAX_FILE_SIZE}`,
    allowedMimeTypes: ["application/pdf"],
  });

  if (createError && !/already exists/i.test(createError.message)) {
    console.error("[contracts upload] create bucket", createError.message);
    return { error: "Bucket de contratos ausente. Configure o bucket \"contracts\" no Supabase Storage." };
  }

  return { error: null as string | null };
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const jobId = String(form.get("job_id") ?? "");

  if (!(file instanceof File) || !jobId) {
    return NextResponse.json({ error: "Arquivo e vaga são obrigatórios." }, { status: 400 });
  }

  const isPdfMime = file.type === "application/pdf";
  const isPdfName = /\.pdf$/i.test(file.name);
  if (!isPdfMime || !isPdfName) {
    return NextResponse.json({ error: "Envie um arquivo PDF válido." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "O PDF deve ter no máximo 10 MB." }, { status: 400 });
  }

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const bucketCheck = await ensureContractsBucket(supabase);
  if (bucketCheck.error) {
    return NextResponse.json({ error: bucketCheck.error }, { status: 500 });
  }

  const safeName = sanitizeContractFileName(file.name);
  const storagePath = `${user.id}/${jobId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType: "application/pdf",
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[contracts upload] upload", uploadError.message);

    if (/bucket/i.test(uploadError.message) && /not found|does not exist/i.test(uploadError.message)) {
      return NextResponse.json({ error: "Bucket de contratos ausente. Configure o bucket \"contracts\" no Supabase Storage." }, { status: 500 });
    }
    if (/permission|denied|unauthorized/i.test(uploadError.message)) {
      return NextResponse.json({ error: "Permissão negada para enviar o contrato." }, { status: 403 });
    }

    return NextResponse.json({ error: "Não foi possível enviar o PDF do contrato." }, { status: 400 });
  }

  return NextResponse.json({ bucket: CONTRACTS_BUCKET, path: storagePath });
}
