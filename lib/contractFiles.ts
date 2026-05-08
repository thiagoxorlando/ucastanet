const STORAGE_BUCKET = "talent-media";

export type ContractFileKind = "original" | "signed";

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function tryExtractStoragePath(fileRef: string) {
  const patterns = [
    /\/storage\/v1\/object\/public\/talent-media\/([^?#]+)/i,
    /\/storage\/v1\/object\/sign\/talent-media\/([^?#]+)/i,
    /\/storage\/v1\/object\/authenticated\/talent-media\/([^?#]+)/i,
  ];

  for (const pattern of patterns) {
    const match = fileRef.match(pattern);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return null;
}

export function getStoredContractPath(fileRef: string | null | undefined) {
  if (!fileRef) return null;
  if (!isAbsoluteUrl(fileRef)) return fileRef;
  return tryExtractStoragePath(fileRef);
}

export async function resolveContractFileUrl(
  supabase: {
    storage: {
      from: (bucket: string) => {
        createSignedUrl: (path: string, expiresIn: number) => Promise<{ data: { signedUrl?: string | null } | null; error: { message: string } | null }>;
      };
    };
  },
  fileRef: string | null | undefined,
  expiresInSeconds = 60 * 15,
) {
  if (!fileRef) return null;

  const storagePath = getStoredContractPath(fileRef);
  if (!storagePath) return isAbsoluteUrl(fileRef) ? fileRef : null;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    console.error("[resolveContractFileUrl]", error.message);
    return isAbsoluteUrl(fileRef) ? fileRef : null;
  }

  return data?.signedUrl ?? null;
}

export function buildContractFileAccessUrl(contractId: string, kind: ContractFileKind) {
  return `/api/contracts/${contractId}/file?type=${kind}`;
}
