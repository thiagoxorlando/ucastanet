"use client";

import { useMemo, useState } from "react";

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
  archivedAt: string | null;
  deletedAt: string | null;
  isOrphanTarget: boolean;
};

type Audience = "all" | "agencies" | "talents" | "specific";
type HistoryFilter = "active" | "archived" | "all";

const AUDIENCE_LABELS: Record<Audience, string> = {
  all: "Todos os usuários",
  agencies: "Apenas agências",
  talents: "Apenas talentos",
  specific: "Usuário específico",
};

function fmtDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RoleBadge({ role }: { role: "agency" | "talent" | "admin" }) {
  if (role === "agency") {
    return <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Agência</span>;
  }
  if (role === "talent") {
    return <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">Talento</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">Admin</span>;
}

function AudienceBadge({ audience }: { audience: string }) {
  const colors: Record<string, string> = {
    all: "bg-emerald-100 text-emerald-700",
    agencies: "bg-blue-100 text-blue-700",
    talents: "bg-violet-100 text-violet-700",
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
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("active");

  const filteredUsers = useMemo(() => {
    const query = userSearch.toLowerCase().trim();
    if (!query) return users.slice(0, 30);
    return users
      .filter((user) => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query))
      .slice(0, 30);
  }, [users, userSearch]);

  const visibleBroadcasts = useMemo(() => {
    return broadcasts.filter((entry) => {
      if (historyFilter === "active") return !entry.archivedAt && !entry.deletedAt;
      if (historyFilter === "archived") return !!entry.archivedAt && !entry.deletedAt;
      return true;
    });
  }, [broadcasts, historyFilter]);

  const selectedUser = users.find((user) => user.id === selectedUserId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError("Título é obrigatório.");
      return;
    }
    if (!message.trim()) {
      setError("Mensagem é obrigatória.");
      return;
    }
    if (audience === "specific" && !selectedUserId) {
      setError("Selecione um usuário.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          audience,
          userId: audience === "specific" ? selectedUserId : undefined,
          link: link.trim() || undefined,
        }),
      });

      const data = (await response.json()) as { success?: boolean; sent?: number; error?: string };
      if (!response.ok || !data.success) {
        setError(data.error ?? "Erro ao enviar notificação.");
        return;
      }

      setSuccess(`Notificação enviada para ${data.sent} usuário(s).`);
      const now = new Date().toISOString();
      setBroadcasts((current) => [
        {
          id: crypto.randomUUID(),
          adminId: "",
          adminEmail: null,
          title: title.trim(),
          message: message.trim(),
          audience,
          targetUserId: audience === "specific" ? selectedUserId : null,
          targetUserName: audience === "specific" ? (selectedUser?.name ?? null) : null,
          link: link.trim() || null,
          sentCount: data.sent ?? 0,
          createdAt: now,
          archivedAt: null,
          deletedAt: null,
          isOrphanTarget: false,
        },
        ...current,
      ]);
      setTitle("");
      setMessage("");
      setAudience("all");
      setSelectedUserId("");
      setLink("");
      setUserSearch("");
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function updateBroadcast(entryId: string, action: "archive" | "delete") {
    setError(null);
    const confirmed = window.confirm(
      action === "delete"
        ? "Deseja ocultar este envio do histórico?"
        : "Deseja arquivar este envio?"
    );
    if (!confirmed) return;

    const response = await fetch(`/api/admin/notifications/broadcasts/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    const data = (await response.json().catch(() => null)) as { archivedAt?: string | null; deletedAt?: string | null; error?: string } | null;
    if (!response.ok) {
      setError(data?.error ?? "Não foi possível atualizar o histórico.");
      return;
    }

    setBroadcasts((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              archivedAt: data?.archivedAt ?? entry.archivedAt,
              deletedAt: data?.deletedAt ?? entry.deletedAt,
            }
          : entry,
      ),
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Admin</p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-zinc-900">Notificações</h1>
        <p className="mt-1 text-[13px] text-zinc-500">Envie notificações para usuários diretamente pelo painel.</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-4">Nova notificação</p>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex: Atualização importante do sistema"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#1ABC9C] focus:ring-2 focus:ring-[#1ABC9C]/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">Mensagem *</label>
            <textarea
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Escreva o conteúdo da notificação..."
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#1ABC9C] focus:ring-2 focus:ring-[#1ABC9C]/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">Destinatário *</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["all", "agencies", "talents", "specific"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setAudience(option);
                    setSelectedUserId("");
                    setUserSearch("");
                  }}
                  className={[
                    "rounded-xl border px-3 py-2.5 text-[12px] font-medium text-left transition-all",
                    audience === option
                      ? "border-[#1ABC9C] bg-[#1ABC9C]/8 text-[#0E7C86] ring-1 ring-[#1ABC9C]/30"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300",
                  ].join(" ")}
                >
                  {AUDIENCE_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          {audience === "specific" ? (
            <div>
              <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">Buscar usuário *</label>
              <input
                type="text"
                value={userSearch}
                onChange={(event) => {
                  setUserSearch(event.target.value);
                  setSelectedUserId("");
                }}
                placeholder="Nome ou email..."
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#1ABC9C] focus:ring-2 focus:ring-[#1ABC9C]/20 transition-colors mb-2"
              />
              {filteredUsers.length > 0 ? (
                <ul className="rounded-xl border border-zinc-200 bg-white overflow-hidden divide-y divide-zinc-100 max-h-52 overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setUserSearch(user.name || user.email);
                        }}
                        className={[
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors",
                          selectedUserId === user.id
                            ? "bg-[#1ABC9C]/8 text-[#0E7C86]"
                            : "hover:bg-zinc-50 text-zinc-800",
                        ].join(" ")}
                      >
                        <RoleBadge role={user.role} />
                        <span className="font-medium truncate">{user.name}</span>
                        {user.email && user.email !== user.name ? (
                          <span className="text-zinc-400 text-[11px] truncate ml-auto">{user.email}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {selectedUser ? (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#1ABC9C]/30 bg-[#1ABC9C]/5 px-3 py-2">
                  <RoleBadge role={selectedUser.role} />
                  <span className="text-[13px] font-medium text-zinc-800">{selectedUser.name}</span>
                  <span className="text-[11px] text-zinc-400 ml-1">{selectedUser.email}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div>
            <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">
              Link / URL de ação <span className="text-zinc-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="Ex: /agency/billing"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#1ABC9C] focus:ring-2 focus:ring-[#1ABC9C]/20 transition-colors"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-[13px] text-rose-600">{error}</div>
          ) : null}
          {success ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700 font-medium">{success}</div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#0E7C86] via-[#15A6A8] to-[#1ABC9C] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_4px_16px_rgba(26,188,156,0.2)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar notificação"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Histórico de envios</p>
          <select
            value={historyFilter}
            onChange={(event) => setHistoryFilter(event.target.value as HistoryFilter)}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-[12px] text-zinc-700"
          >
            <option value="active">Ativos</option>
            <option value="archived">Arquivados</option>
            <option value="all">Todos</option>
          </select>
        </div>

        {visibleBroadcasts.length === 0 ? (
          <p className="text-[13px] text-zinc-400">Nenhuma notificação enviada ainda.</p>
        ) : (
          <ul className="space-y-3">
            {visibleBroadcasts.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-zinc-900">{entry.title}</span>
                      <AudienceBadge audience={entry.audience} />
                      {entry.targetUserName ? (
                        <span className="text-[11px] text-zinc-500">→ {entry.targetUserName}</span>
                      ) : null}
                      {entry.isOrphanTarget ? (
                        <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">Usuário deletado</span>
                      ) : null}
                      {entry.archivedAt && !entry.deletedAt ? (
                        <span className="inline-flex rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">Arquivado</span>
                      ) : null}
                      {entry.deletedAt ? (
                        <span className="inline-flex rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-white">Oculto</span>
                      ) : null}
                    </div>
                    <p className="text-[12px] text-zinc-500 leading-relaxed line-clamp-2">{entry.message}</p>
                    {entry.link ? <p className="mt-1 text-[11px] text-zinc-400 font-mono">{entry.link}</p> : null}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[13px] font-semibold text-zinc-900">{entry.sentCount}</p>
                    <p className="text-[10px] text-zinc-400">usuário(s)</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-400">
                  <span>{fmtDateTime(entry.createdAt)}</span>
                  {entry.adminEmail ? <span>· {entry.adminEmail}</span> : null}
                  {entry.archivedAt && !entry.deletedAt ? <span>· arquivado em {fmtDateTime(entry.archivedAt)}</span> : null}
                </div>
                {!entry.deletedAt ? (
                  <div className="mt-3 flex gap-2">
                    {!entry.archivedAt ? (
                      <button
                        type="button"
                        onClick={() => void updateBroadcast(entry.id, "archive")}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-[11px] font-semibold text-zinc-700 hover:bg-white"
                      >
                        Arquivar
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void updateBroadcast(entry.id, "delete")}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Ocultar
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
