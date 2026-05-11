"use client";

const ENV_LABELS: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL:      "Supabase URL",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "Supabase Anon Key",
  SUPABASE_SERVICE_ROLE_KEY:     "Service Role Key",
  NEXT_PUBLIC_APP_URL:           "App URL",
  RESEND_API_KEY:                "Resend API Key",
  ASAAS_API_KEY:                 "Asaas API Key",
  ASAAS_API_URL:                 "Asaas API URL",
  ASAAS_WEBHOOK_TOKEN:           "Asaas Webhook Token",
};

export type SystemHealth = {
  database: {
    connected: boolean;
    tables: Record<string, boolean>;
  };
  storage: {
    buckets: Record<string, { exists: boolean; public: boolean | null }>;
  };
  environment: {
    appUrl: string | null;
    nodeEnv: string | null;
    vars: Record<string, boolean>;
  };
  asaas: {
    latestWebhookAt: string | null;
    failedWebhookCount: number;
  };
  warnings: string[];
};


function StatusBadge({ ok, labelOk, labelFail }: { ok: boolean; labelOk: string; labelFail: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
      ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
    }`}>
      {ok ? labelOk : labelFail}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-[#647B7B] mb-4">{title}</h2>
      {children}
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminSystem({ health }: { health: SystemHealth }) {
  const tablesOk = Object.values(health.database.tables).every(Boolean);
  const bucketsOk = Object.values(health.storage.buckets).every((b) => b.exists);
  const asaasEnvOk = health.environment.vars["ASAAS_API_KEY"] && health.environment.vars["ASAAS_API_URL"];

  return (
    <div className="space-y-6">
      {health.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[12px] font-semibold text-amber-700 mb-2">
            {health.warnings.length} aviso(s) de configuração
          </p>
          <ul className="space-y-1">
            {health.warnings.map((w) => (
              <li key={w} className="flex items-start gap-2 text-[12px] text-amber-700">
                <span className="mt-0.5">⚠</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#647B7B] mb-1">Banco de dados</p>
          <StatusBadge ok={health.database.connected && tablesOk} labelOk="Online" labelFail="Erro" />
        </div>
        <div className="card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#647B7B] mb-1">Storage</p>
          <StatusBadge ok={bucketsOk} labelOk="Configurado" labelFail="Incompleto" />
        </div>
        <div className="card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#647B7B] mb-1">Asaas</p>
          <StatusBadge ok={!!asaasEnvOk} labelOk="Configurado" labelFail="Ausente" />
        </div>
        <div className="card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#647B7B] mb-1">Ambiente</p>
          <p className="text-[13px] font-medium text-[#1F2D2E]">{health.environment.nodeEnv ?? "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Supabase — Tabelas">
          <div className="space-y-2">
            {Object.entries(health.database.tables).map(([table, ok]) => (
              <div key={table} className="flex items-center justify-between py-1 border-b border-zinc-50">
                <span className="text-[13px] font-mono text-zinc-700">{table}</span>
                <StatusBadge ok={ok} labelOk="OK" labelFail="Erro" />
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Storage — Buckets">
            <div className="space-y-2">
              {Object.entries(health.storage.buckets).map(([name, info]) => (
                <div key={name} className="flex items-center justify-between py-1 border-b border-zinc-50">
                  <div>
                    <span className="text-[13px] font-mono text-zinc-700">{name}</span>
                    {info.exists && info.public !== null && (
                      <span className={`ml-2 text-[10px] ${info.public ? "text-amber-600" : "text-zinc-400"}`}>
                        {info.public ? "público" : "privado"}
                      </span>
                    )}
                  </div>
                  <StatusBadge ok={info.exists} labelOk="Existe" labelFail="Ausente" />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Asaas">
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1 border-b border-zinc-50">
                <span className="text-[13px] text-zinc-700">ASAAS_API_KEY</span>
                <StatusBadge ok={!!health.environment.vars["ASAAS_API_KEY"]} labelOk="Configurado" labelFail="Ausente" />
              </div>
              <div className="flex items-center justify-between py-1 border-b border-zinc-50">
                <span className="text-[13px] text-zinc-700">ASAAS_API_URL</span>
                <StatusBadge ok={!!health.environment.vars["ASAAS_API_URL"]} labelOk="Configurado" labelFail="Ausente" />
              </div>
              <div className="flex items-center justify-between py-1 border-b border-zinc-50">
                <span className="text-[13px] text-zinc-700">ASAAS_WEBHOOK_TOKEN</span>
                <StatusBadge ok={!!health.environment.vars["ASAAS_WEBHOOK_TOKEN"]} labelOk="Configurado" labelFail="Ausente" />
              </div>
              <div className="flex items-center justify-between py-1 border-b border-zinc-50">
                <span className="text-[13px] text-zinc-700">Último webhook</span>
                <span className="text-[12px] text-zinc-500">{formatDateTime(health.asaas.latestWebhookAt)}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[13px] text-zinc-700">Webhooks com falha</span>
                <span className={`text-[13px] font-semibold ${health.asaas.failedWebhookCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {health.asaas.failedWebhookCount}
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Variáveis de ambiente">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Object.entries(health.environment.vars).map(([key, present]) => (
            <div key={key} className="flex items-center justify-between py-1.5 border-b border-zinc-50">
              <span className="text-[12px] font-mono text-zinc-600">{ENV_LABELS[key] ?? key}</span>
              <StatusBadge ok={present} labelOk="Configurado" labelFail="Ausente" />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Aplicação">
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1 border-b border-zinc-50">
            <span className="text-[13px] text-zinc-600">Ambiente</span>
            <span className="text-[13px] font-medium text-zinc-800">{health.environment.nodeEnv ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-[13px] text-zinc-600">URL da aplicação</span>
            <span className="text-[13px] font-mono text-zinc-800">{health.environment.appUrl ?? "—"}</span>
          </div>
        </div>
        <p className="mt-4 text-[11px] text-zinc-400">
          Para ver a data do deploy e hash do commit, configure as variáveis NEXT_PUBLIC_DEPLOY_DATE e NEXT_PUBLIC_GIT_COMMIT no ambiente de produção.
        </p>
      </SectionCard>

    </div>
  );
}
