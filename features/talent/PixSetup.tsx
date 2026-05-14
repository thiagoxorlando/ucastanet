"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

export type PixProfileRow = {
  pix_key_type: PixKeyType | null;
  pix_key_value: string | null;
  pix_holder_name: string | null;
};

export const PIX_LABELS: Record<PixKeyType, string> = {
  cpf:    "CPF",
  cnpj:   "CNPJ",
  email:  "E-mail",
  phone:  "Telefone",
  random: "Chave Aleatória",
};

const PIX_PLACEHOLDERS: Record<PixKeyType, string> = {
  cpf:    "000.000.000-00",
  cnpj:   "00.000.000/0001-00",
  email:  "voce@exemplo.com",
  phone:  "+55 11 91234-5678",
  random: "Chave aleatória gerada pelo banco",
};

export function maskPixKey(type: string | null, value: string | null): string {
  if (!value) return "—";
  if (type === "cpf" && value.length >= 4) return `***.***.${value.slice(-4, -2)}-${value.slice(-2)}`;
  if (type === "cnpj" && value.length >= 4) return `**/****-${value.slice(-2)}`;
  if (type === "email") {
    const [user, domain] = value.split("@");
    return `${user.slice(0, 2)}***@${domain ?? ""}`;
  }
  if (type === "phone" && value.length >= 4) return `+55 ** *****-${value.slice(-4)}`;
  if (value.length > 8) return `${value.slice(0, 4)}…${value.slice(-4)}`;
  return value;
}

export default function PixSetup({ onSaved }: { onSaved: (type: PixKeyType, value: string, holderName: string) => void }) {
  const [keyType,  setKeyType]  = useState<PixKeyType>("cpf");
  const [keyValue, setKeyValue] = useState("");
  const [holderName, setHolderName] = useState("");
  const [savedType,  setSavedType]  = useState<PixKeyType | null>(null);
  const [savedValue, setSavedValue] = useState<string | null>(null);
  const [savedHolderName, setSavedHolderName] = useState<string | null>(null);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [loadDone, setLoadDone] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoadDone(true); return; }
      const { data } = await supabase
        .from("talent_profiles")
        .select("pix_key_type, pix_key_value, pix_holder_name")
        .eq("id", user.id)
        .single();
      const profile = data as PixProfileRow | null;
      if (profile?.pix_key_value) {
        const t = profile.pix_key_type ?? "cpf";
        const v = profile.pix_key_value;
        const h = profile.pix_holder_name ?? "";
        setSavedType(t);
        setSavedValue(v);
        setSavedHolderName(h);
        setKeyType(t);
        setKeyValue(v);
        setHolderName(h);
        onSaved(t, v, h);
      }
      setLoadDone(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!keyValue.trim() || !holderName.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("talent_profiles").update({
        pix_key_type:  keyType,
        pix_key_value: keyValue.trim(),
        pix_holder_name: holderName.trim(),
      }).eq("id", user.id);
    }
    setSaving(false);
    setSavedType(keyType);
    setSavedValue(keyValue.trim());
    setSavedHolderName(holderName.trim());
    setEditing(false);
    onSaved(keyType, keyValue.trim(), holderName.trim());
  }

  if (!loadDone) return null;

  const isRegistered = !!savedValue && !editing;

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-50">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isRegistered ? "bg-emerald-50 border border-emerald-100" : "bg-zinc-50 border border-zinc-100"}`}>
            <svg className={`w-4 h-4 ${isRegistered ? "text-emerald-600" : "text-zinc-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-0.5">Recebimentos</p>
            <p className="text-[15px] font-semibold text-zinc-900">Chave PIX</p>
          </div>
        </div>
        {isRegistered && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[12px] font-medium text-zinc-500 hover:text-zinc-800 border border-zinc-200 hover:border-zinc-300 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            Editar
          </button>
        )}
      </div>

      <div className="px-6 py-5">
        {isRegistered ? (
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 px-2.5 py-0.5 rounded-full">
                  {PIX_LABELS[savedType!]}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Cadastrada
                </span>
              </div>
              <p className="text-[14px] font-semibold text-zinc-900 truncate">{savedValue}</p>
              {savedHolderName && (
                <p className="text-[12px] text-zinc-500 mt-1">Titular: {savedHolderName}</p>
              )}
              <p className="text-[12px] text-zinc-400 mt-0.5">Usada para receber seus saques via PIX.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {!savedValue && (
              <p className="text-[12px] text-zinc-400 leading-relaxed">
                Cadastre sua chave PIX para sacar.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1.5">Tipo de Chave</label>
                <select
                  value={keyType}
                  onChange={(e) => { setKeyType(e.target.value as PixKeyType); setKeyValue(""); }}
                  className="w-full px-3 py-2.5 text-[13px] rounded-xl border border-zinc-200 hover:border-zinc-300 focus:border-zinc-900 focus:outline-none bg-white transition-colors"
                >
                  {(Object.keys(PIX_LABELS) as PixKeyType[]).map((k) => (
                    <option key={k} value={k}>{PIX_LABELS[k]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1.5">Chave PIX</label>
                <input
                  type="text"
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  placeholder={PIX_PLACEHOLDERS[keyType]}
                  className="w-full px-3 py-2.5 text-[13px] rounded-xl border border-zinc-200 hover:border-zinc-300 focus:border-zinc-900 focus:outline-none bg-white transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1.5">Titular</label>
              <input
                type="text"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="Nome completo"
                className="w-full px-3 py-2.5 text-[13px] rounded-xl border border-zinc-200 hover:border-zinc-300 focus:border-zinc-900 focus:outline-none bg-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || !keyValue.trim() || !holderName.trim()}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-100 disabled:text-zinc-400 text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? "Salvando…" : "Salvar Chave PIX"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => { setEditing(false); setKeyType(savedType!); setKeyValue(savedValue!); setHolderName(savedHolderName ?? ""); }}
                  className="text-[13px] font-medium text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
