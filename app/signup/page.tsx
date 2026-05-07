"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import PhoneInput from "@/components/ui/PhoneInput";
import { supabase } from "@/lib/supabase";
import { formatCpf, formatCpfCnpj, isValidCpf, isValidCpfCnpj, normalizeCpfCnpj } from "@/lib/cpf";
import { PLAN_DEFINITIONS } from "@/lib/plans";

type Role = "agency" | "talent";
type Plan = "free" | "pro" | "premium";

type FormState = {
  role: Role;
  fullName: string;
  agencyName: string;
  responsibleName: string;
  email: string;
  password: string;
  phone: string;
  cpf: string;
  cpfCnpj: string;
  city: string;
  state: string;
  plan: Plan;
  termsAccepted: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const ROLE_COPY: Record<Role, { title: string; subtitle: string; cta: string }> = {
  agency: {
    title: "Crie sua base de contratação em um só lugar",
    subtitle: "Publique vagas, receba candidaturas e gerencie reserva e pagamento com segurança.",
    cta: "Começar como agência",
  },
  talent: {
    title: "Monte sua presença profissional e comece a se candidatar",
    subtitle: "Crie sua conta, complete o perfil e avance para vagas, contratos e recebimentos na carteira.",
    cta: "Começar como talento",
  },
};

const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function loginHref(refToken: string | null, jobId: string | null, nextPath: string | null) {
  const params = new URLSearchParams();
  if (refToken) params.set("ref", refToken);
  if (jobId) params.set("job", jobId);
  if (nextPath) params.set("next", nextPath);
  const qs = params.toString();
  return qs ? `/login?${qs}` : "/login";
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.email.trim()) errors.email = "Informe seu email.";
  if (!form.password.trim()) errors.password = "Crie uma senha.";
  else if (form.password.trim().length < 6) errors.password = "A senha deve ter pelo menos 6 caracteres.";
  if (!form.phone.trim()) errors.phone = "Informe seu telefone.";
  if (!form.city.trim()) errors.city = "Informe sua cidade.";
  if (!form.state.trim()) errors.state = "Selecione seu estado.";
  if (!form.termsAccepted) errors.termsAccepted = "Você precisa aceitar os Termos de Uso para continuar.";

  if (form.role === "talent") {
    if (!form.fullName.trim()) errors.fullName = "Informe seu nome completo.";
    if (!form.cpf.trim()) errors.cpf = "Informe seu CPF.";
    else if (!isValidCpf(form.cpf)) errors.cpf = "CPF inválido. Verifique os números.";
  }

  if (form.role === "agency") {
    if (!form.agencyName.trim()) errors.agencyName = "Informe o nome da agência.";
    if (!form.responsibleName.trim()) errors.responsibleName = "Informe o nome do responsável.";
    if (!form.cpfCnpj.trim()) errors.cpfCnpj = "Informe o CPF ou CNPJ.";
    else if (!isValidCpfCnpj(form.cpfCnpj)) errors.cpfCnpj = "CPF/CNPJ inválido. Verifique os números.";
    if (form.plan === "premium") errors.plan = "O plano Premium ainda não está disponível.";
  }

  return errors;
}

function FeaturePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/88 backdrop-blur-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
      {children}
    </span>
  );
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get("role") ?? "agency") as Role;
  const refToken = searchParams.get("ref") ?? null;
  const jobId = searchParams.get("job") ?? null;
  const nextPath = safeNextPath(searchParams.get("next")) ?? (jobId ? `/talent/jobs/${jobId}` : null);
  const initialPlan = (["free", "pro"].includes(searchParams.get("plan") ?? "") ? searchParams.get("plan") : "free") as Plan;

  const [form, setForm] = useState<FormState>({
    role: initialRole === "talent" ? "talent" : "agency",
    fullName: "",
    agencyName: "",
    responsibleName: "",
    email: "",
    password: "",
    phone: "",
    cpf: "",
    cpfCnpj: "",
    city: "",
    state: "",
    plan: initialPlan,
    termsAccepted: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const roleCopy = ROLE_COPY[form.role];
  const selectedPlan = useMemo(() => PLAN_DEFINITIONS[form.plan], [form.plan]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError("");
  }

  async function linkReferral(userId: string) {
    if (!refToken) return;

    await fetch("/api/referrals/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: refToken, user_id: userId }),
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError("");

    const validation = validateForm(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
    });

    if (signUpError || !data.user) {
      setServerError(signUpError?.message ?? "Falha ao criar conta. Tente novamente.");
      setLoading(false);
      return;
    }

    const payload =
      form.role === "agency"
        ? {
            user_id: data.user.id,
            role: form.role,
            termsAccepted: form.termsAccepted,
            agency: {
              company_name: form.agencyName.trim(),
              contact_name: form.responsibleName.trim(),
              phone: form.phone.trim(),
              city: form.city.trim(),
              country: form.state.trim(),
              cpf_cnpj: normalizeCpfCnpj(form.cpfCnpj),
            },
          }
        : {
            user_id: data.user.id,
            role: form.role,
            termsAccepted: form.termsAccepted,
            talent: {
              full_name: form.fullName.trim(),
              phone: form.phone.trim(),
              city: form.city.trim(),
              country: form.state.trim(),
              cpf: normalizeCpfCnpj(form.cpf),
            },
          };

    const profileRes = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!profileRes.ok) {
      const profileJson = await profileRes.json().catch(() => ({})) as { error?: string };
      setServerError(profileJson.error ?? "Conta criada, mas a configuração inicial falhou. Entre em contato com o suporte.");
      setLoading(false);
      return;
    }

    if (form.role === "agency") {
      await fetch("/api/auth/agency-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: data.user.id, plan: "free" }),
      });
    }

    await linkReferral(data.user.id);

    const params = new URLSearchParams();
    if (nextPath) params.set("next", nextPath);
    if (form.role === "agency" && form.plan === "pro") params.set("plan", "pro");
    const qs = params.toString();
    router.push(qs ? `/onboarding?${qs}` : "/onboarding");
  }

  return (
    <div className="min-h-screen bg-[#061214] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <section className="relative overflow-hidden border-b border-white/8 px-6 py-10 lg:w-[44%] lg:border-b-0 lg:border-r lg:px-10 lg:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(39,193,214,0.28),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(26,188,156,0.2),transparent_28%),linear-gradient(180deg,#081718_0%,#041012_100%)]" />
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:32px_32px]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-3">
              <Logo size="lg" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">BrisaHub</p>
                <h1 className="text-lg font-semibold tracking-tight text-white">Conta nova, experiência guiada</h1>
              </div>
            </div>

            <div className="mt-10 space-y-5 lg:mt-16">
              <span className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Cadastro premium
              </span>
              <div className="space-y-4">
                <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-white lg:text-[2.45rem]">
                  {roleCopy.title}
                </h2>
                <p className="max-w-lg text-[15px] leading-7 text-white/70">
                  {roleCopy.subtitle}
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <FeaturePill>Conta e perfil base no mesmo passo</FeaturePill>
                <FeaturePill>Termos aceitos antes da criação</FeaturePill>
                <FeaturePill>Onboarding guiado antes do painel</FeaturePill>
              </div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3 lg:mt-auto lg:grid-cols-1">
              <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/45">1. Crie sua base</p>
                <p className="mt-2 text-sm leading-6 text-white/78">
                  Preencha seus dados principais, escolha o perfil e siga com a conta já pronta para avançar.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/45">2. Entenda o fluxo</p>
                <p className="mt-2 text-sm leading-6 text-white/78">
                  Mostramos em poucos cards como publicar, contratar, receber candidaturas ou sacar via PIX.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/45">3. Continue sem perder dados</p>
                <p className="mt-2 text-sm leading-6 text-white/78">
                  O setup detalhado continua depois, com os campos iniciais já preenchidos para reduzir atrito.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/8 bg-white px-5 py-6 text-[#1F2D2E] shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:px-7 sm:py-7 lg:px-8">
            <div className="space-y-6">
              <div className="flex flex-col gap-5 rounded-[28px] border border-[#DDE6E6] bg-[#F7FBFB] p-5 sm:p-6">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#647B7B]">Conta</p>
                  <h3 className="text-2xl font-semibold tracking-tight text-[#102224]">Crie sua conta em uma única etapa</h3>
                  <p className="text-sm leading-6 text-[#5A7273]">
                    Escolha o tipo de conta, informe seus dados principais e siga para uma explicação rápida antes de completar o restante do perfil.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {(["agency", "talent"] as const).map((roleOption) => {
                    const active = form.role === roleOption;
                    const copy = roleOption === "agency"
                      ? { title: "Agência", body: "Publica vagas, recebe candidaturas e gerencia sua operação." }
                      : { title: "Talento", body: "Monta perfil, candidata-se e acompanha contratos." };

                    return (
                      <button
                        key={roleOption}
                        type="button"
                        onClick={() => setField("role", roleOption)}
                        className={[
                          "rounded-[24px] border px-4 py-4 text-left transition-all",
                          active
                            ? "border-[#0E7C86] bg-[#0E7C86] text-white shadow-[0_10px_30px_rgba(14,124,134,0.22)]"
                            : "border-[#DDE6E6] bg-white hover:border-[#A6CACA]",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className={`text-[15px] font-semibold ${active ? "text-white" : "text-[#102224]"}`}>{copy.title}</p>
                            <p className={`mt-1 text-[13px] leading-5 ${active ? "text-white/78" : "text-[#647B7B]"}`}>{copy.body}</p>
                          </div>
                          <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? "border-white/60 bg-white/15" : "border-[#C7D6D7] bg-white"}`}>
                            {active ? <span className="h-2.5 w-2.5 rounded-full bg-white" /> : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div className="grid gap-6">
                  <div className="rounded-[28px] border border-[#E3ECEC] p-5 sm:p-6">
                    <div className="mb-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#647B7B]">Acesso</p>
                      <h4 className="mt-1 text-lg font-semibold text-[#102224]">Credenciais da conta</h4>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-[12px] font-medium text-[#516667]">Email</label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(event) => setField("email", event.target.value)}
                          placeholder="voce@empresa.com"
                          className={`w-full rounded-2xl border px-4 py-3 text-[14px] outline-none transition-colors ${errors.email ? "border-rose-300 focus:border-rose-400" : "border-[#DDE6E6] focus:border-[#0E7C86]"}`}
                        />
                        {errors.email ? <p className="mt-1.5 text-[12px] text-rose-500">{errors.email}</p> : null}
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-[12px] font-medium text-[#516667]">Senha</label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={form.password}
                          onChange={(event) => setField("password", event.target.value)}
                          placeholder="Mínimo de 6 caracteres"
                          className={`w-full rounded-2xl border px-4 py-3 text-[14px] outline-none transition-colors ${errors.password ? "border-rose-300 focus:border-rose-400" : "border-[#DDE6E6] focus:border-[#0E7C86]"}`}
                        />
                        {errors.password ? <p className="mt-1.5 text-[12px] text-rose-500">{errors.password}</p> : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-[#E3ECEC] p-5 sm:p-6">
                    <div className="mb-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#647B7B]">Dados principais</p>
                      <h4 className="mt-1 text-lg font-semibold text-[#102224]">
                        {form.role === "agency" ? "Informações da agência" : "Informações do talento"}
                      </h4>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {form.role === "agency" ? (
                        <>
                          <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-[12px] font-medium text-[#516667]">Nome da agência</label>
                            <input
                              value={form.agencyName}
                              onChange={(event) => setField("agencyName", event.target.value)}
                              placeholder="Brisa Creative"
                              className={`w-full rounded-2xl border px-4 py-3 text-[14px] outline-none transition-colors ${errors.agencyName ? "border-rose-300 focus:border-rose-400" : "border-[#DDE6E6] focus:border-[#0E7C86]"}`}
                            />
                            {errors.agencyName ? <p className="mt-1.5 text-[12px] text-rose-500">{errors.agencyName}</p> : null}
                          </div>
                          <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-[12px] font-medium text-[#516667]">Nome do responsável</label>
                            <input
                              value={form.responsibleName}
                              onChange={(event) => setField("responsibleName", event.target.value)}
                              placeholder="Carla Mendes"
                              className={`w-full rounded-2xl border px-4 py-3 text-[14px] outline-none transition-colors ${errors.responsibleName ? "border-rose-300 focus:border-rose-400" : "border-[#DDE6E6] focus:border-[#0E7C86]"}`}
                            />
                            {errors.responsibleName ? <p className="mt-1.5 text-[12px] text-rose-500">{errors.responsibleName}</p> : null}
                          </div>
                        </>
                      ) : (
                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-[12px] font-medium text-[#516667]">Nome completo</label>
                          <input
                            value={form.fullName}
                            onChange={(event) => setField("fullName", event.target.value)}
                            placeholder="Sofia Mendes"
                            className={`w-full rounded-2xl border px-4 py-3 text-[14px] outline-none transition-colors ${errors.fullName ? "border-rose-300 focus:border-rose-400" : "border-[#DDE6E6] focus:border-[#0E7C86]"}`}
                          />
                          {errors.fullName ? <p className="mt-1.5 text-[12px] text-rose-500">{errors.fullName}</p> : null}
                        </div>
                      )}

                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-[12px] font-medium text-[#516667]">Telefone</label>
                        <PhoneInput
                          value={form.phone}
                          onChange={(value) => setField("phone", value)}
                          hasError={!!errors.phone}
                          required
                        />
                        {errors.phone ? <p className="mt-1.5 text-[12px] text-rose-500">{errors.phone}</p> : null}
                      </div>

                      {form.role === "agency" ? (
                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-[12px] font-medium text-[#516667]">CPF / CNPJ</label>
                          <input
                            inputMode="numeric"
                            maxLength={18}
                            value={form.cpfCnpj}
                            onChange={(event) => setField("cpfCnpj", formatCpfCnpj(event.target.value))}
                            placeholder="00.000.000/0001-00"
                            className={`w-full rounded-2xl border px-4 py-3 text-[14px] outline-none transition-colors ${errors.cpfCnpj ? "border-rose-300 focus:border-rose-400" : "border-[#DDE6E6] focus:border-[#0E7C86]"}`}
                          />
                          {errors.cpfCnpj ? <p className="mt-1.5 text-[12px] text-rose-500">{errors.cpfCnpj}</p> : null}
                        </div>
                      ) : (
                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-[12px] font-medium text-[#516667]">CPF</label>
                          <input
                            inputMode="numeric"
                            maxLength={14}
                            value={form.cpf}
                            onChange={(event) => setField("cpf", formatCpf(event.target.value))}
                            placeholder="000.000.000-00"
                            className={`w-full rounded-2xl border px-4 py-3 text-[14px] outline-none transition-colors ${errors.cpf ? "border-rose-300 focus:border-rose-400" : "border-[#DDE6E6] focus:border-[#0E7C86]"}`}
                          />
                          {errors.cpf ? <p className="mt-1.5 text-[12px] text-rose-500">{errors.cpf}</p> : null}
                        </div>
                      )}

                      <div>
                        <label className="mb-1.5 block text-[12px] font-medium text-[#516667]">Cidade</label>
                        <input
                          value={form.city}
                          onChange={(event) => setField("city", event.target.value)}
                          placeholder="São Paulo"
                          className={`w-full rounded-2xl border px-4 py-3 text-[14px] outline-none transition-colors ${errors.city ? "border-rose-300 focus:border-rose-400" : "border-[#DDE6E6] focus:border-[#0E7C86]"}`}
                        />
                        {errors.city ? <p className="mt-1.5 text-[12px] text-rose-500">{errors.city}</p> : null}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[12px] font-medium text-[#516667]">Estado</label>
                        <select
                          value={form.state}
                          onChange={(event) => setField("state", event.target.value)}
                          className={`w-full rounded-2xl border px-4 py-3 text-[14px] outline-none transition-colors ${errors.state ? "border-rose-300 focus:border-rose-400" : "border-[#DDE6E6] focus:border-[#0E7C86]"}`}
                        >
                          <option value="">Selecione</option>
                          {BRAZIL_STATES.map((state) => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                        {errors.state ? <p className="mt-1.5 text-[12px] text-rose-500">{errors.state}</p> : null}
                      </div>
                    </div>
                  </div>

                  {form.role === "agency" ? (
                    <div className="rounded-[28px] border border-[#E3ECEC] p-5 sm:p-6">
                      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#647B7B]">Plano inicial</p>
                          <h4 className="mt-1 text-lg font-semibold text-[#102224]">Escolha como quer começar</h4>
                        </div>
                        <p className="text-[12px] text-[#647B7B]">Premium segue indisponível nesta fase.</p>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-3">
                        {(["free", "pro", "premium"] as const).map((planKey) => {
                          const definition = PLAN_DEFINITIONS[planKey];
                          const active = form.plan === planKey;
                          const disabled = !definition.available;
                          return (
                            <button
                              key={planKey}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                if (!disabled) setField("plan", planKey);
                              }}
                              className={[
                                "rounded-[24px] border p-4 text-left transition-all",
                                disabled
                                  ? "cursor-not-allowed border-[#E6ECEC] bg-[#F7F9F9] opacity-70"
                                  : active
                                    ? "border-[#0E7C86] bg-[#ECFAFA] shadow-[0_10px_28px_rgba(14,124,134,0.12)]"
                                    : "border-[#DDE6E6] bg-white hover:border-[#A6CACA]",
                              ].join(" ")}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-[15px] font-semibold text-[#102224]">{definition.label}</p>
                                  <p className="mt-1 text-[13px] font-medium text-[#0E7C86]">
                                    {definition.available ? `${definition.priceLabel}/mês` : definition.priceLabel}
                                  </p>
                                </div>
                                {planKey === "pro" ? (
                                  <span className="rounded-full bg-[#0E7C86] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white">
                                    Popular
                                  </span>
                                ) : planKey === "premium" ? (
                                  <span className="rounded-full bg-[#DDE6E6] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#647B7B]">
                                    Em breve
                                  </span>
                                ) : null}
                              </div>
                              <ul className="mt-4 space-y-2">
                                {definition.features.map((feature) => (
                                  <li key={feature} className="flex items-start gap-2 text-[12px] leading-5 text-[#5A7273]">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#1ABC9C]" />
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                              {active ? <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0E7C86]">Selecionado</p> : null}
                            </button>
                          );
                        })}
                      </div>
                      {errors.plan ? <p className="mt-3 text-[12px] text-rose-500">{errors.plan}</p> : null}
                      <div className="mt-4 rounded-2xl border border-[#DDE6E6] bg-[#F7FBFB] px-4 py-3">
                        <p className="text-[12px] font-semibold text-[#1F2D2E]">Plano escolhido agora: {selectedPlan.label}</p>
                        <p className="mt-1 text-[12px] leading-5 text-[#647B7B]">
                          {form.plan === "pro"
                            ? "Após o cadastro, você segue para o onboarding e depois conclui o setup com pagamento da assinatura Pro."
                            : "Você entra com o plano Free e pode seguir para configurar a agência e publicar sua primeira vaga."}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-[28px] border border-[#E3ECEC] p-5 sm:p-6">
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#DDE6E6] bg-[#F7FBFB] px-4 py-4 transition-colors hover:border-[#A6CACA]">
                      <input
                        id="termsAccepted"
                        name="termsAccepted"
                        type="checkbox"
                        checked={form.termsAccepted}
                        required
                        onInvalid={(event) => {
                          event.currentTarget.setCustomValidity("Você precisa aceitar os Termos de Uso para continuar.");
                        }}
                        onChange={(event) => {
                          event.currentTarget.setCustomValidity("");
                          setField("termsAccepted", event.target.checked);
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-[#A7B9BA] text-[#0E7C86] focus:ring-[#0E7C86]"
                      />
                      <span className="text-[14px] leading-6 text-[#516667]">
                        Li e aceito os{" "}
                        <Link
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[#102224] underline decoration-[#0E7C86]/55 underline-offset-4"
                        >
                          Termos de Uso e Condições
                        </Link>{" "}
                        da BrisaHub.
                      </span>
                    </label>
                    {errors.termsAccepted ? <p className="mt-2 text-[12px] text-rose-500">{errors.termsAccepted}</p> : null}
                  </div>
                </div>

                {serverError ? (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-[13px] text-rose-600">
                    {serverError}
                  </div>
                ) : null}

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#0E7C86] via-[#15A6A8] to-[#1ABC9C] px-5 py-4 text-[15px] font-semibold text-white shadow-[0_14px_28px_rgba(18,150,153,0.22)] transition-all hover:translate-y-[-1px] hover:shadow-[0_18px_30px_rgba(18,150,153,0.26)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Criando conta..." : roleCopy.cta}
                  </button>
                  <p className="text-center text-[13px] text-[#647B7B]">
                    Já tem uma conta?{" "}
                    <Link href={loginHref(refToken, jobId, nextPath)} className="font-semibold text-[#102224] hover:text-[#0E7C86]">
                      Entrar
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageContent />
    </Suspense>
  );
}
