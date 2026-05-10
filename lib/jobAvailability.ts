type JobAvailabilityInput = {
  status: string | null | undefined;
  deletedAt?: string | null | undefined;
  currentHires: number | null | undefined;
  talentsNeeded: number | null | undefined;
  maxHiresPerJob: number | null | undefined;
};

export const JOB_UNAVAILABLE_MESSAGE = "Vaga não disponível para novas candidaturas.";
export const JOB_FULL_MESSAGE = "Esta vaga já atingiu o número de talentos necessários.";

export function getEffectiveJobCapacity(
  talentsNeeded: number | null | undefined,
  maxHiresPerJob: number | null | undefined,
) {
  const normalizedTalentsNeeded = Math.max(1, Number(talentsNeeded ?? 1) || 1);

  if (maxHiresPerJob === null || maxHiresPerJob === undefined) {
    return normalizedTalentsNeeded;
  }

  return Math.min(normalizedTalentsNeeded, Math.max(1, Number(maxHiresPerJob) || 1));
}

export function isJobFull({
  currentHires,
  talentsNeeded,
  maxHiresPerJob,
}: Pick<JobAvailabilityInput, "currentHires" | "talentsNeeded" | "maxHiresPerJob">) {
  return Number(currentHires ?? 0) >= getEffectiveJobCapacity(talentsNeeded, maxHiresPerJob);
}

export function isJobOpenForApplications(input: JobAvailabilityInput) {
  if (input.deletedAt) return false;
  if (input.status !== "open") return false;

  return !isJobFull(input);
}
