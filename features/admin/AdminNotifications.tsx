"use client";

import { useState, useMemo } from "react";

export type UserOption = {
  id: string;
  role: "agency" | "talent";
  email: string;
  name: string;
};

export type BroadcastEntry = {
  id: string;
  adminId: string;
  adminEmail: string | null;
  title: string;
  message: string;
  audience: string;
  targetUserId: string | null;
  targetUserName: string | null;
  link: string | null;
  sentCount: number;
  createdAt: string;
};

type Audience = "all" | "agencies" | "talents" | "specific";

const AUDIENCE_LABELS: Record<Audience, string> = {
  all:      "Todos os usuários",
  agencies: "Apenas agências",
  talents:  "Apenas talentos",
  specific: "Usuário específico",
};

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function RoleBadge({ role }: { role: "agency" | "talent" | "admin" }) {
  if (role === "agency") return (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Agência</span>
  );
  if (role === "talent") return (
    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">Talento</span>
  );
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">Admin</span>
  );
}

function AudienceBadge({ audience }: { audience: string }) {
  const colors: Record<string, string> = {
    all:      "bg-emerald-100 text-emerald-700",
    agencies: "bg-blue-100 text-blue-700",
    talents:  "bg-violet-100 text-violet-700",
    specific: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors[audience] ?? "bg-zinc-100 text-zinc-600"}`}>
      {AUDIENCE_LABELS[audience as Audience] ?? audience}
    </span>
  );
}

export default function AdminNotifications({
  users,
  broadcasts: initialBroadcasts,
}: {
  users: UserOption[];
  broadcasts: BroadcastEntry[];
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [link, setLink] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastEntry[]>(initialBroadcasts);

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return users.slice(0, 30);
    return users.filter((u) =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [users, userSearch]);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) { setError("Título é obrigatório."); return; }
    if (!message.trim()) { setError("Mensagem é obrigatória."); return; }
    if (audience === "specific" && !selectedUserId) { setError("Selecione um usuário."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:    title.trim(),
          message:  message.trim(),
          audience,
          userId:   audience === "specific" ? selectedUserId : undefined,
          link:     link.trim() || undefined,
        }),
      });

      const data = await res.json() as { success?: boolean; sent?: number; error?: string };

      if (!res.ok || !data.success) {
        setError(data.error ?? "Erro ao enviar notificação.");
        return;
      }

      setSuccess(`Notificação enviada para ${data.sent} usuário(s).`);
      setTitle("");
      setMessage("");
      setAudience("all");
      setSelectedUserId("");
      setLink("");
      setUserSearch("");

      const refreshRes = await fetch("/api/admin/notifications/send", { method: "GET" }).catch(() => null);
      void refreshRes;

      const now = new Date().toISOString();
      const newEntry: BroadcastEntry = {
        id:             crypto.randomUUID(),
        adminId:        "",
        adminEmail:     null,
        title:          title.trim(),
        message:        message.trim(),
        audience,
        targetUserId:   audience === "specific" ? selectedUserId : null,
        targetUserName: audience === "specific" ? (selectedUser?.name ?? null) : null,
        link:           link.trim() || null,
        sentCount:      data.sent ?? 0,
        createdAt:      now,
      };
      setBroadcasts((prev) => [newEntry, ...prev]);
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Admin</p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-zinc-900">Notificações</h1>
        <p className="mt-1 text-[13px] text-zinc-500">Envie notificações para usuários diretamente pelo painel.</p>
      </div>

      {/* Composer */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-4">Nova notificação</p>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>

          {/* Title */}
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Atualização importante do sistema"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#1ABC9C] focus:ring-2 focus:ring-[#1ABC9C]/20 transition-colors"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">Mensagem *</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva o conteúdo da notificação..."
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#1ABC9C] focus:ring-2 focus:ring-[#1ABC9C]/20 transition-colors"
            />
          </div>

          {/* Audience */}
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">Destinatário *</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["all", "agencies", "talents", "specific"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { setAudience(opt); setSelectedUserId(""); setUserSearch(""); }}
                  className={[
                    "rounded-xl border px-3 py-2.5 text-[12px] font-medium text-left transition-all",
                    audience === opt
                      ? "border-[#1ABC9C] bg-[#1ABC9C]/8 text-[#0E7C86] ring-1 ring-[#1ABC9C]/30"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300",
                  ].join(" ")}
                >
                  {AUDIENCE_LABELS[opt]}
                </button>
              ))}
            </div>
          </div>

          {/* Specific user search */}
          {audience === "specific" && (
            <div>
              <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">Buscar usuário *</label>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setSelectedUserId(""); }}
                placeholder="Nome ou email..."
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#1ABC9C] focus:ring-2 focus:ring-[#1ABC9C]/20 transition-colors mb-2"
              />
              {filteredUsers.length > 0 && (
                <ul className="rounded-xl border border-zinc-200 bg-white overflow-hidden divide-y divide-zinc-100 max-h-52 overflow-y-auto">
                  {filteredUsers.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => { setSelectedUserId(u.id); setUserSearch(u.name || u.email); }}
                        className={[
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors",
                          selectedUserId === u.id
                            ? "bg-[#1ABC9C]/8 text-[#0E7C86]"
                            : "hover:bg-zinc-50 text-zinc-800",
                        ].join(" ")}
                      >
                        <RoleBadge role={u.role} />
                        <span className="font-medium truncate">{u.name}</span>
                        {u.email && u.email !== u.name && (
                          <span className="text-zinc-400 text-[11px] truncate ml-auto">{u.email}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedUser && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#1ABC9C]/30 bg-[#1ABC9C]/5 px-3 py-2">
                  <RoleBadge role={selectedUser.role} />
                  <span className="text-[13px] font-medium text-zinc-800">{selectedUser.name}</span>
                  <span className="text-[11px] text-zinc-400 ml-1">{selectedUser.email}</span>
                </div>
              )}
            </div>
          )}

          {/* Link */}
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">Link / URL de ação <span className="text-zinc-400 font-normal">(opcional)</span></label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Ex: /agency/billing"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#1ABC9C] focus:ring-2 focus:ring-[#1ABC9C]/20 transition-colors"
            />
          </div>

          {/* Error / Success */}
          {error && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-[13px] text-rose-600">{error}</div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700 font-medium">{success}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#0E7C86] via-[#15A6A8] to-[#1ABC9C] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(26,188,156,0.2)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar notificação"}
          </button>
        </form>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-4">Histórico de envios</p>
        {broadcasts.length === 0 ? (
          <p className="text-[13px] text-zinc-400">Nenhuma notificação enviada ainda.</p>
        ) : (
          <ul className="space-y-3">
            {broadcasts.map((b) => (
              <li key={b.id} className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[14px] font-semibold text-zinc-900">{b.title}</span>
                      <AudienceBadge audience={b.audience} />
                      {b.targetUserName && (
                        <span className="text-[11px] text-zinc-500">→ {b.targetUserName}</span>
                      )}
                    </div>
                    <p className="text-[12px] text-zinc-500 leading-relaxed line-clamp-2">{b.message}</p>
                    {b.link && (
                      <p className="mt-1 text-[11px] text-zinc-400 font-mono">{b.link}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[13px] font-semibold text-zinc-900">{b.sentCount}</p>
                    <p className="text-[10px] text-zinc-400">usuário(s)</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-400">
                  <span>{fmtDateTime(b.createdAt)}</span>
                  {b.adminEmail && <span>· {b.adminEmail}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
