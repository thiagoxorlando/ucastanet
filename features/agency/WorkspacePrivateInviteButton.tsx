"use client";

import { useState } from "react";

export default function WorkspacePrivateInviteButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    setLoading(true);
    const response = await fetch(`/api/agency/jobs/${jobId}/invite-link`, { method: "POST" });
    setLoading(false);
    if (!response.ok) return;

    const data = (await response.json()) as { inviteUrl?: string };
    if (!data.inviteUrl) return;

    await navigator.clipboard.writeText(data.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={loading}
      className="inline-flex items-center rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[12px] font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "..." : copied ? "Copiado!" : "Copiar convite privado"}
    </button>
  );
}
