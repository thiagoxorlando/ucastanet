"use client";

import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

type Role = "agency" | "talent";

type StepCard = {
  title: string;
  body: string;
  icon: React.ReactNode;
  tone: string;
};

const AGENCY_CARDS: StepCard[] = [
  {
    title: "Publique sua vaga",
    body: "Descreva o briefing, categoria, local e valor para abrir a oportunidade com clareza.",
    tone: "from-cyan-500/18 to-cyan-300/8 text-cyan-200",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    title: "Receba candidaturas",
    body: "Os talentos visualizam a vaga pública ou privada e enviam suas candidaturas pela plataforma.",
    tone: "from-emerald-500/18 to-emerald-300/8 text-emerald-200",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.36-1.86M17 20H7m10 0v-2c0-.66-.13-1.28-.36-1.86M7 20H2v-2a3 3 0 015.36-1.86M7 20v-2c0-.66.13-1.28.36-1.86m0 0a5 5 0 019.29 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: "Escolha um talento",
    body: "Compare perfis, histórico e disponibilidade antes de fechar sua decisão com confiança.",
    tone: "from-teal-500/18 to-teal-300/8 text-teal-200",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Confirme a reserva com saldo na carteira",
    body: "A contratação usa saldo disponível em carteira para reservar o valor com segurança.",
    tone: "from-amber-500/18 to-amber-300/8 text-amber-200",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 9V7a5 5 0 00-10 0v2m-2 0h14a1 1 0 011 1v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a1 1 0 011-1z" />
      </svg>
    ),
  },
  {
    title: "Libere o pagamento com segurança",
    body: "Depois da entrega, a liberação segue o fluxo interno da plataforma até a carteira do talento.",
    tone: "from-fuchsia-500/18 to-fuchsia-300/8 text-fuchsia-200",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-2.21 0-4 .9-4 2s1.79 2 4 2 4 .9 4 2-1.79 2-4 2m0-10V6m0 12v-2" />
      </svg>
    ),
  },
];

const TALENT_CARDS: StepCard[] = [
  {
    title: "Complete seu perfil",
    body: "Finalize foto, bio, categorias e links para aumentar a qualidade das suas candidaturas.",
    tone: "from-cyan-500/18 to-cyan-300/8 text-cyan-200",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 20a8 8 0 0116 0" />
      </svg>
    ),
  },
  {
    title: "Candidate-se a vagas",
    body: "Explore oportunidades e envie candidatura direto pela plataforma quando o perfil combinar.",
    tone: "from-emerald-500/18 to-emerald-300/8 text-emerald-200",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a3 3 0 006 0M9 5a3 3 0 016 0" />
      </svg>
    ),
  },
  {
    title: "Aceite contratos",
    body: "Quando for escolhido, acompanhe a formalização e os próximos passos do trabalho com clareza.",
    tone: "from-teal-500/18 to-teal-300/8 text-teal-200",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    title: "Receba na carteira",
    body: "Depois da liberação pela agência, o valor entra no seu saldo dentro da BrisaHub.",
    tone: "from-amber-500/18 to-amber-300/8 text-amber-200",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7h18M5 7l1-2h12l1 2m-2 0v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7m7 4h.01" />
      </svg>
    ),
  },
  {
    title: "Saque via PIX",
    body: "Com a chave PIX configurada, você poderá solicitar saque do saldo disponível para sua conta.",
    tone: "from-fuchsia-500/18 to-fuchsia-300/8 text-fuchsia-200",
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 7h4l2 2 4-4m-4 10H9l-2-2-4 4" />
      </svg>
    ),
  },
];

function continueHref(role: Role, nextPath: string | null, initialPlan: "free" | "pro") {
  const params = new URLSearchParams();
  if (nextPath) params.set("next", nextPath);
  if (role === "agency" && initialPlan === "pro") params.set("plan", "pro");
  const qs = params.toString();
  return qs ? `/setup-profile?${qs}` : "/setup-profile";
}

export default function OnboardingFlow({
  role,
  nextPath,
  initialPlan,
}: {
  role: Role;
  nextPath: string | null;
  initialPlan: "free" | "pro";
}) {
  const router = useRouter();
  const cards = role === "agency" ? AGENCY_CARDS : TALENT_CARDS;
  const primaryLabel = role === "agency" ? "Começar como agência" : "Começar como talento";
  const eyebrow = role === "agency" ? "Fluxo da agência" : "Fluxo do talento";
  const heading = role === "agency"
    ? "Antes de entrar, veja como sua operação vai funcionar na BrisaHub"
    : "Antes de entrar, veja como sua jornada de trabalho acontece na BrisaHub";
  const subheading = role === "agency"
    ? "Você já criou a conta. Agora falta só completar o setup detalhado para publicar vagas, confirmar reservas e liberar pagamentos com segurança."
    : "Você já criou a conta. Agora falta só completar o setup detalhado para ter acesso a vagas, candidaturas, contratos e saques.";

  return (
    <div className="min-h-screen bg-[#071416] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-[36px] border border-white/8 bg-[linear-gradient(180deg,#081517_0%,#051012_100%)] shadow-[0_28px_80px_rgba(0,0,0,0.36)]">
          <div className="grid lg:grid-cols-[1.05fr_1.35fr]">
            <div className="relative overflow-hidden border-b border-white/8 px-6 py-8 sm:px-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(39,193,214,0.24),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(26,188,156,0.18),transparent_28%)]" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-center gap-3">
                  <Logo size="lg" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">BrisaHub</p>
                    <p className="text-sm font-medium text-white/82">Boas-vindas</p>
                  </div>
                </div>

                <div className="mt-10 space-y-5">
                  <span className="inline-flex rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                    {eyebrow}
                  </span>
                  <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-white lg:text-[2.35rem]">
                    {heading}
                  </h1>
                  <p className="max-w-lg text-[15px] leading-7 text-white/70">
                    {subheading}
                  </p>
                </div>

                <div className="mt-8 space-y-4 lg:mt-auto">
                  <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/45">Próximo passo</p>
                    <p className="mt-2 text-sm leading-6 text-white/82">
                      {role === "agency"
                        ? "Completar os dados da empresa, revisar o plano e seguir para publicar sua primeira vaga."
                        : "Completar os dados do perfil, adicionar informações profissionais e entrar no painel de talento."}
                    </p>
                  </div>
                  {role === "agency" ? (
                    <div className="rounded-[28px] border border-emerald-400/18 bg-emerald-400/8 p-5 text-sm leading-6 text-emerald-100">
                      <p className="font-semibold">Plano inicial escolhido: {initialPlan === "pro" ? "Pro" : "Free"}</p>
                      <p className="mt-1 text-emerald-100/80">
                        {initialPlan === "pro"
                          ? "O setup vai preservar essa escolha e continuar para a etapa de assinatura."
                          : "Você seguirá com o plano Free e poderá começar sem pagamento imediato."}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-8 lg:py-10">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => (
                  <div key={card.title} className="rounded-[28px] border border-white/8 bg-white/[0.04] p-5 text-white backdrop-blur-sm">
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.tone}`}>
                      {card.icon}
                    </div>
                    <h2 className="mt-4 text-[17px] font-semibold tracking-tight text-white">{card.title}</h2>
                    <p className="mt-2 text-[14px] leading-6 text-white/68">{card.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 rounded-[28px] border border-white/8 bg-white/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[15px] font-semibold text-white">Conta criada com sucesso</p>
                  <p className="mt-1 text-[13px] text-white/65">
                    Você segue agora para o setup detalhado sem perder os dados já preenchidos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(continueHref(role, nextPath, initialPlan))}
                  className="rounded-2xl bg-gradient-to-r from-[#0E7C86] via-[#15A6A8] to-[#1ABC9C] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_14px_28px_rgba(18,150,153,0.22)] transition-all hover:translate-y-[-1px]"
                >
                  {primaryLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
