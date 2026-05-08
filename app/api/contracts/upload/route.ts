import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { CONTRACTS_BUCKET, sanitizeContractFileName } from "@/lib/contractFiles";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type UploadErrorPayload = {
  error: string;
  message?: string;
  details?: string;
};

function jsonError(payload: UploadErrorPayload, status: number) {
  return NextResponse.json(payload, { status });
}

async function ensureContractsBucket(
  supabase: ReturnType<typeof createServerClient>,
) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error("[contracts upload] list buckets", listError);
    return {
      error: "Nao foi possivel verificar o bucket de contratos.",
      details: listError.message,
    };
  }

  const exists = (buckets ?? []).some((bucket) => bucket.name === CONTRACTS_BUCKET);
  if (exists) {
    return { error: null as string | null, details: null as string | null };
  }

  const { error: createError } = await supabase.storage.createBucket(CONTRACTS_BUCKET, {
    public: false,
    fileSizeLimit: `${MAX_FILE_SIZE}`,
    allowedMimeTypes: ["application/pdf"],
  });

  if (createError && !/already exists/i.test(createError.message)) {
    console.error("[contracts upload] create bucket", createError);
    return {
      error: `Bucket ${CONTRACTS_BUCKET} nao encontrado.`,
      details: createError.message,
    };
  }

  return { error: null as string | null, details: null as string | null };
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const jobId = String(form.get("job_id") ?? "");

  if (!(file instanceof File) || !jobId) {
    return jsonError({ error: "Arquivo e vaga sao obrigatorios." }, 400);
  }

  const isPdfMime = !file.type || file.type === "application/pdf";
  const isPdfName = /\.pdf$/i.test(file.name);
  if (!isPdfMime || !isPdfName) {
    return jsonError({
      error: "Envie um arquivo PDF valido.",
      details: `Arquivo recebido: ${file.name} (${file.type || "sem MIME"})`,
    }, 400);
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return jsonError({
      error: "Arquivo muito grande.",
      details: "O PDF deve ter no maximo 10 MB.",
    }, 400);
  }

  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return jsonError({ error: "Unauthorized" }, 401);

  const supabase = createServerClient({ useServiceRole: true });
  const [{ data: caller }, { data: job, error: jobError }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("jobs").select("id, agency_id").eq("id", jobId).single(),
  ]);

  if (caller?.role !== "agency") {
    return jsonError({ error: "Apenas agencias podem enviar contratos." }, 403);
  }

  if (jobError || !job) {
    console.error("[contracts upload] job lookup", jobError);
    return jsonError({
      error: "Vaga nao encontrada.",
      details: jobError?.message,
    }, 404);
  }

  if (job.agency_id !== user.id) {
    return jsonError({ error: "Voce nao tem permissao para enviar contrato desta vaga." }, 403);
  }

  const bucketCheck = await ensureContractsBucket(supabase);
  if (bucketCheck.error) {
    return jsonError({
      error: bucketCheck.error,
      details: bucketCheck.details ?? undefined,
    }, 500);
  }

  const safeName = sanitizeContractFileName(file.name);
  const storagePath = `contracts/${user.id}/${jobId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType: "application/pdf",
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[contracts upload] upload", uploadError);

    if (/bucket/i.test(uploadError.message) && /not found|does not exist/i.test(uploadError.message)) {
      return jsonError({
        error: `Bucket ${CONTRACTS_BUCKET} nao encontrado.`,
        details: uploadError.message,
      }, 500);
    }
    if (/permission|denied|unauthorized/i.test(uploadError.message)) {
      return jsonError({
        error: "Permissao negada ao enviar contrato.",
        details: uploadError.message,
      }, 403);
    }

    return jsonError({
      error: "Falha ao enviar PDF do contrato.",
      details: uploadError.message,
    }, 400);
  }

  return NextResponse.json({
    bucket: CONTRACTS_BUCKET,
    path: storagePath,
  });
}
