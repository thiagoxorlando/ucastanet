"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  token: string;
  isLoggedIn: boolean;
  userRole: string | null;
}

export default function InviteAccept({ token, isLoggedIn, userRole }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/premium/invite/${token}/accept`, { method: "POST" });
    setLoading(false);
    if (res.ok) {
      router.push("/agency/workspace");
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Não foi possível aceitar o convite.");
    }
  }

  if (!isLoggedIn) {
    const next = encodeURIComponent(`/premium/invite/${token}`);
    return (
      <div className="space-y-3">
        <p className="text-[13px] text-zinc-500 text-center">
          Faça login ou crie uma conta de agência para aceitar este convite.
        </p>
        <a
          href={`/login?next=${next}`}
          className="block w-full text-center py-2.5 rounded-xl bg-zinc-900 text-white text-[13px] font-semibold hover:bg-zinc-800 transition-colors"
        >
          Entrar
        </a>
        <a
          href={`/signup?role=agency&next=${next}`}
          className="block w-full text-center py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-[13px] font-semibold hover:bg-zinc-50 transition-colors"
        >
          Criar conta
        </a>
      </div>
    );
  }

  if (userRole !== "agency") {
    return (
      <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
        <p className="text-[13px] text-red-600 text-center">
          Este convite precisa ser aceito com uma conta de agência.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
          <p className="text-[13px] text-red-600 text-center">{error}</p>
        </div>
      )}
      <button
        type="button"
        onClick={handleAccept}
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? "Aceitando…" : "Aceitar convite"}
      </button>
    </div>
  );
}
