"use client";

import Link from "next/link";
import { Suspense, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import PhoneInput from "@/components/ui/PhoneInput";
import { supabase } from "@/lib/supabase";
import { TALENT_CATEGORY_LABELS } from "@/lib/talentCategories";
import { formatCpf, formatCpfCnpj, isValidCpf, isValidCpfCnpj, normalizeCpfCnpj, digitsOnly } from "@/lib/cpf";
import { PLAN_DEFINITIONS } from "@/lib/plans";

type Role = "agency" | "talent";
type Plan = "free" | "pro" | "premium";

type TalentForm = {
  fullName: string;
  cpf: string;
  phone: string;
  country: string;
  city: string;
  state: string;
  gender: string;
  age: string;
  bio: string;
  categories: string[];
  instagram: string;
  tiktok: string;
  youtube: string;
  linkedin: string;
  website: string;
};

type AgencyForm = {
  agencyName: string;
  responsibleName: string;
  cpfCnpj: string;
  phone: string;
  country: string;
  city: string;
  state: string;
  website: string;
  description: string;
  plan: Plan;
};

type AccountForm = {
  role: Role;
  email: string;
  password: string;
  termsAccepted: boolean;
};

type FormErrors = Record<string, string | undefined>;

const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

const TALENT_DEFAULTS: TalentForm = {
  fullName: "",
  cpf: "",
  phone: "",
  country: "Brasil",
  city: "",
  state: "",
  gender: "",
  age: "",
  bio: "",
  categories: [],
  instagram: "",
  tiktok: "",
  youtube: "",
  linkedin: "",
  website: "",
};

const AGENCY_DEFAULTS: AgencyForm = {
  agencyName: "",
  responsibleName: "",
  cpfCnpj: "",
  phone: "",
  country: "Brasil",
  city: "",
  state: "",
  website: "",
  description: "",
  plan: "free",
};

const ROLE_COPY: Record<Role, { title: string; subtitle: string; cta: string }> = {
  agency: {
    title: "Crie sua operação completa em um só lugar",
    subtitle: "Cadastre a agência, configure o perfil, escolha o plano e siga para publicar vagas sem retrabalho.",
    cta: "Criar conta da agência",
  },
  talent: {
    title: "Entre com seu perfil pronto para trabalhar",
    subtitle: "Cadastre sua conta, complete o perfil profissional e siga para vagas, contratos e carteira sem um segundo formulário.",
    cta: "Criar conta de talento",
  },
};

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

function FeaturePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/88 backdrop-blur-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
      {children}
    </span>
  );
}

function SectionCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#E3ECEC] p-5 sm:p-6">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#647B7B]">{eyebrow}</p>
        <h3 className="mt-1 text-lg font-semibold text-[#102224]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-1.5 text-[12px] text-rose-500">{error}</p>;
}

function inputClass(hasError = false) {
  return `w-full rounded-2xl border px-4 py-3 text-[14px] outline-none transition-colors ${hasError ? "border-rose-300 focus:border-rose-400" : "border-[#DDE6E6] focus:border-[#0E7C86]"}`;
}

function LabeledInput({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-[#516667]">{label}</label>
      {children}
      {error ? <FieldError error={error} /> : hint ? <p className="mt-1 text-[11px] text-zinc-400">{hint}</p> : null}
    </div>
  );
}

function UploadTile({
  label,
  preview,
  onChange,
}: {
  label: string;
  preview: string | null;
  onChange: (file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="mb-1.5 block text-[12px] font-medium text-[#516667]">{label}</p>
      <div
        onClick={() => ref.current?.click()}
        className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 transition-colors hover:border-zinc-400"
      >
        {preview ? (
          <img src={preview} alt="preview" className="h-full w-full object-cover" />
        ) : (
          <svg className="h-6 w-6 text-[#647B7B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4" />
          </svg>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.[0]) onChange(event.target.files[0]);
        }}
      />
      <p className="mt-1.5 text-[11px] text-zinc-400">Clique para enviar · JPG, PNG, WebP</p>
    </div>
  );
}

function SocialInput({
  label,
  prefix,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  prefix?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <LabeledInput label={label}>
      {prefix ? (
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-zinc-400">{prefix}</span>
          <input
            className={`${inputClass()} pl-8`}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value.replace(/^[@\s]+/, ""))}
          />
        </div>
      ) : (
        <input className={inputClass()} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </LabeledInput>
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

  const [account, setAccount] = useState<AccountForm>({
    role: initialRole === "talent" ? "talent" : "agency",
    email: "",
    password: "",
    termsAccepted: false,
  });
  const [talent, setTalent] = useState<TalentForm>(TALENT_DEFAULTS);
  const [agency, setAgency] = useState<AgencyForm>({ ...AGENCY_DEFAULTS, plan: initialPlan });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [customOtherText, setCustomOtherText] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [manualCheckMsg, setManualCheckMsg] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const roleCopy = ROLE_COPY[account.role];
  const selectedPlan = useMemo(() => PLAN_DEFINITIONS[agency.plan], [agency.plan]);

  function setAccountField<K extends keyof AccountForm>(key: K, value: AccountForm[K]) {
    setAccount((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError("");
  }

  function setTalentField<K extends keyof TalentForm>(key: K, value: TalentForm[K]) {
    setTalent((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError("");
  }

  function setAgencyField<K extends keyof AgencyForm>(key: K, value: AgencyForm[K]) {
    setAgency((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError("");
  }

  function setRole(role: Role) {
    setAccount((current) => ({ ...current, role }));
    setErrors({});
    setServerError("");
  }

  function validateTalent() {
    const nextErrors: FormErrors = {};
    if (!account.email.trim()) nextErrors.email = "Informe seu email.";
    if (!account.password.trim()) nextErrors.password = "Crie uma senha.";
    else if (account.password.trim().length < 6) nextErrors.password = "A senha deve ter pelo menos 6 caracteres.";
    if (!talent.fullName.trim()) nextErrors.fullName = "Informe seu nome completo.";
    if (!talent.cpf.trim()) nextErrors.cpf = "Informe seu CPF.";
    else if (!isValidCpf(talent.cpf)) nextErrors.cpf = "CPF inválido. Verifique os números.";
    if (!talent.phone.trim()) nextErrors.phone = "Informe seu telefone.";
    if (!talent.country.trim()) nextErrors.country = "Informe seu país.";
    if (!talent.city.trim()) nextErrors.city = "Informe sua cidade.";
    if (!talent.state.trim()) nextErrors.state = "Selecione seu estado.";
    if (talent.bio.length > 300) nextErrors.bio = "A bio deve ter no máximo 300 caracteres.";
    if (talent.categories.includes("Outro") && !customOtherText.trim()) nextErrors.customOther = "Descreva sua categoria personalizada.";
    if (!account.termsAccepted) nextErrors.termsAccepted = "Você precisa aceitar os Termos de Uso para continuar.";
    return nextErrors;
  }

  function validateAgency() {
    const nextErrors: FormErrors = {};
    if (!account.email.trim()) nextErrors.email = "Informe seu email.";
    if (!account.password.trim()) nextErrors.password = "Crie uma senha.";
    else if (account.password.trim().length < 6) nextErrors.password = "A senha deve ter pelo menos 6 caracteres.";
    if (!agency.agencyName.trim()) nextErrors.agencyName = "Informe o nome da agência.";
    if (!agency.responsibleName.trim()) nextErrors.responsibleName = "Informe o nome do responsável.";
    if (!agency.cpfCnpj.trim()) nextErrors.cpfCnpj = "Informe o CPF ou CNPJ.";
    else if (!isValidCpfCnpj(agency.cpfCnpj)) nextErrors.cpfCnpj = "CPF/CNPJ inválido. Verifique os números.";
    if (!agency.phone.trim()) nextErrors.phone = "Informe o telefone.";
    if (!agency.country.trim()) nextErrors.country = "Informe o país.";
    if (!agency.city.trim()) nextErrors.city = "Informe a cidade.";
    if (!agency.state.trim()) nextErrors.state = "Selecione o estado.";
    if (agency.description.length > 500) nextErrors.description = "A descrição deve ter no máximo 500 caracteres.";
    if (agency.plan === "premium") nextErrors.plan = "O plano Premium ainda não está disponível.";
    if (!account.termsAccepted) nextErrors.termsAccepted = "Você precisa aceitar os Termos de Uso para continuar.";
    return nextErrors;
  }

  async function uploadAsset(file: File, path: string) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("path", path);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
    const uploadJson = await uploadRes.json().catch(() => ({})) as { error?: string; url?: string };
    if (!uploadRes.ok || !uploadJson.url) {
      throw new Error(uploadJson.error ?? "Erro ao enviar arquivo.");
    }
    return uploadJson.url;
  }

  async function linkReferral(userId: string) {
    if (!refToken) return;
    await fetch("/api/referrals/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: refToken, user_id: userId }),
    });
  }

  function openPaymentTab(url: string) {
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    setPopupBlocked(popup === null);
  }

  async function handleManualCheck() {
    setManualCheckMsg(null);
    try {
      const res = await fetch("/api/asaas/plan/status");
      const json = await res.json() as { paid?: boolean };
      if (json.paid) {
        if (pollRef.current) clearInterval(pollRef.current);
        const params = new URLSearchParams();
        if (nextPath) params.set("next", nextPath);
        if (account.role === "agency" && agency.plan === "pro") params.set("plan", "pro");
        const qs = params.toString();
        router.push(qs ? `/onboarding?${qs}` : "/onboarding");
      } else {
        setManualCheckMsg("Pagamento ainda não confirmado. Aguarde alguns instantes.");
      }
    } catch {
      setManualCheckMsg("Erro ao verificar pagamento. Tente novamente.");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError("");

    const validation = account.role === "agency" ? validateAgency() : validateTalent();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setLoading(true);

    let paymentWindow: Window | null = null;
    if (account.role === "agency" && agency.plan === "pro") {
      paymentWindow = window.open("", "_blank", "noopener,noreferrer");
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: account.email.trim(),
        password: account.password,
      });

      if (signUpError || !data.user) {
        paymentWindow?.close();
        setServerError(signUpError?.message ?? "Falha ao criar conta. Tente novamente.");
        setLoading(false);
        return;
      }

      let avatarUrl: string | undefined;
      let logoUrl: string | undefined;

      if (account.role === "talent" && avatar) {
        avatarUrl = await uploadAsset(avatar, `avatars/${data.user.id}.${avatar.name.split(".").pop()}`);
      }

      if (account.role === "agency" && logo) {
        logoUrl = await uploadAsset(logo, `agency-avatars/${data.user.id}.${logo.name.split(".").pop()}`);
      }

      const payload =
        account.role === "agency"
          ? {
              user_id: data.user.id,
              role: account.role,
              termsAccepted: account.termsAccepted,
              agency: {
                company_name: agency.agencyName.trim(),
                contact_name: agency.responsibleName.trim(),
                cpf_cnpj: normalizeCpfCnpj(agency.cpfCnpj),
                phone: agency.phone.trim(),
                country: agency.country.trim(),
                city: agency.city.trim(),
                state: agency.state.trim(),
                website: agency.website.trim() || null,
                description: agency.description.trim() || null,
                avatar_url: logoUrl ?? null,
              },
            }
          : {
              user_id: data.user.id,
              role: account.role,
              termsAccepted: account.termsAccepted,
              talent: {
                full_name: talent.fullName.trim(),
                cpf: digitsOnly(talent.cpf),
                phone: talent.phone.trim(),
                country: talent.country.trim(),
                city: talent.city.trim(),
                state: talent.state.trim(),
                gender: talent.gender || null,
                age: talent.age ? parseInt(talent.age, 10) : null,
                bio: talent.bio.trim() || null,
                categories: talent.categories.map((category) => category === "Outro" && customOtherText.trim() ? customOtherText.trim() : category),
                instagram: talent.instagram.trim() || null,
                tiktok: talent.tiktok.trim() || null,
                youtube: talent.youtube.trim() || null,
                linkedin: talent.linkedin.trim() || null,
                website: talent.website.trim() || null,
                avatar_url: avatarUrl ?? null,
              },
            };

      const profileRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!profileRes.ok) {
        paymentWindow?.close();
        const profileJson = await profileRes.json().catch(() => ({})) as { error?: string };
        setServerError(profileJson.error ?? "Conta criada, mas a configuração inicial falhou. Entre em contato com o suporte.");
        setLoading(false);
        return;
      }

      if (account.role === "agency") {
        await fetch("/api/auth/agency-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: data.user.id, plan: "free" }),
        });
      }

      await linkReferral(data.user.id);

      if (account.role === "agency" && agency.plan === "pro") {
        const checkoutRes = await fetch("/api/asaas/plan/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cpfCnpj: normalizeCpfCnpj(agency.cpfCnpj), plan: agency.plan }),
        });
        const checkoutJson = await checkoutRes.json().catch(() => ({})) as { url?: string; error?: string };

        if (!checkoutRes.ok || !checkoutJson.url) {
          paymentWindow?.close();
          setServerError(checkoutJson.error ?? "Erro ao iniciar pagamento. Tente novamente.");
          setLoading(false);
          return;
        }

        if (paymentWindow) paymentWindow.location.href = checkoutJson.url;
        else setPopupBlocked(true);

        setPaymentUrl(checkoutJson.url);
        setWaitingForPayment(true);
        pollRef.current = setInterval(() => {
          void (async () => {
            try {
              const res = await fetch("/api/asaas/plan/status");
              const json = await res.json() as { paid?: boolean };
              if (json.paid) {
                if (pollRef.current) clearInterval(pollRef.current);
                const params = new URLSearchParams();
                if (nextPath) params.set("next", nextPath);
                params.set("plan", "pro");
                const qs = params.toString();
                router.push(qs ? `/onboarding?${qs}` : "/onboarding");
              }
            } catch {}
          })();
        }, 4000);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (nextPath) params.set("next", nextPath);
      const qs = params.toString();
      router.push(qs ? `/onboarding?${qs}` : "/onboarding");
    } catch (error) {
      paymentWindow?.close();
      setServerError(error instanceof Error ? error.message : "Erro inesperado ao criar conta.");
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  if (waitingForPayment) {
    return (
      <div className="min-h-screen bg-[#061214] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-[32px] border border-white/8 bg-white/5 p-8 text-center backdrop-blur-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/10">
            <svg className="h-7 w-7 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Aguardando confirmação do plano Pro</h1>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-white/70">
            Finalize o pagamento na aba do Asaas. Assim que a assinatura for confirmada, você seguirá automaticamente para a página de onboarding.
          </p>
          {popupBlocked ? (
            <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-left text-[13px] text-amber-100">
              Não foi possível abrir a aba de pagamento. Use o botão abaixo para abrir novamente.
            </div>
          ) : null}
          {manualCheckMsg ? <p className="mt-4 rounded-xl bg-white/5 px-4 py-3 text-[13px] text-white/70">{manualCheckMsg}</p> : null}
          <div className="mt-6 space-y-3">
            {paymentUrl ? (
              <button
                type="button"
                onClick={() => openPaymentTab(paymentUrl)}
                className="w-full rounded-2xl bg-gradient-to-r from-[#0E7C86] via-[#15A6A8] to-[#1ABC9C] px-5 py-4 text-[15px] font-semibold text-white"
              >
                Abrir pagamento novamente
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => { void handleManualCheck(); }}
              className="w-full rounded-2xl border border-white/15 px-5 py-4 text-[15px] font-semibold text-white/85"
            >
              Verificar pagamento
            </button>
          </div>
        </div>
      </div>
    );
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
                <h1 className="text-lg font-semibold tracking-tight text-white">Conta e perfil no mesmo fluxo</h1>
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
                <FeaturePill>Conta criada com perfil completo</FeaturePill>
                <FeaturePill>Onboarding só explica o fluxo</FeaturePill>
                <FeaturePill>Sem segundo formulário para novos usuários</FeaturePill>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="w-full max-w-3xl rounded-[32px] border border-white/8 bg-white px-5 py-6 text-[#1F2D2E] shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:px-7 sm:py-7 lg:px-8">
            <div className="space-y-6">
              <div className="flex flex-col gap-5 rounded-[28px] border border-[#DDE6E6] bg-[#F7FBFB] p-5 sm:p-6">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#647B7B]">Conta</p>
                  <h3 className="text-2xl font-semibold tracking-tight text-[#102224]">Crie sua conta com o perfil já completo</h3>
                  <p className="text-sm leading-6 text-[#5A7273]">
                    Todas as informações principais entram agora no primeiro cadastro. O onboarding seguinte fica apenas para explicar o fluxo.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {(["agency", "talent"] as const).map((roleOption) => {
                    const active = account.role === roleOption;
                    const copy = roleOption === "agency"
                      ? { title: "Agência", body: "Publica vagas, recebe candidaturas e gerencia a operação." }
                      : { title: "Talento", body: "Entra com perfil pronto para candidaturas, contratos e carteira." };
                    return (
                      <button
                        key={roleOption}
                        type="button"
                        onClick={() => setRole(roleOption)}
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
                <SectionCard eyebrow="Conta" title="Credenciais de acesso">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <LabeledInput label="Email" error={errors.email}>
                        <input type="email" required value={account.email} onChange={(event) => setAccountField("email", event.target.value)} placeholder="voce@empresa.com" className={inputClass(!!errors.email)} />
                      </LabeledInput>
                    </div>
                    <div className="sm:col-span-2">
                      <LabeledInput label="Senha" error={errors.password}>
                        <input type="password" required minLength={6} value={account.password} onChange={(event) => setAccountField("password", event.target.value)} placeholder="Mínimo de 6 caracteres" className={inputClass(!!errors.password)} />
                      </LabeledInput>
                    </div>
                  </div>
                </SectionCard>

                {account.role === "talent" ? (
                  <>
                    <SectionCard eyebrow="Informações principais" title="Seu perfil base de talento">
                      <div className="grid gap-5 lg:grid-cols-[140px_minmax(0,1fr)]">
                        <UploadTile
                          label="Foto de perfil"
                          preview={avatarPreview}
                          onChange={(file) => {
                            setAvatar(file);
                            setAvatarPreview(URL.createObjectURL(file));
                          }}
                        />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <LabeledInput label="Nome completo" error={errors.fullName}>
                              <input className={inputClass(!!errors.fullName)} placeholder="Sofia Mendes" value={talent.fullName} onChange={(event) => setTalentField("fullName", event.target.value)} />
                            </LabeledInput>
                          </div>
                          <LabeledInput label="CPF" error={errors.cpf} hint="Somente números — 11 dígitos">
                            <input className={inputClass(!!errors.cpf)} placeholder="000.000.000-00" inputMode="numeric" maxLength={14} value={talent.cpf} onChange={(event) => setTalentField("cpf", formatCpf(event.target.value))} />
                          </LabeledInput>
                          <LabeledInput label="Telefone" error={errors.phone}>
                            <PhoneInput value={talent.phone} onChange={(value) => setTalentField("phone", value)} hasError={!!errors.phone} required />
                          </LabeledInput>
                          <LabeledInput label="País" error={errors.country}>
                            <input className={inputClass(!!errors.country)} placeholder="Brasil" value={talent.country} onChange={(event) => setTalentField("country", event.target.value)} />
                          </LabeledInput>
                          <LabeledInput label="Cidade" error={errors.city}>
                            <input className={inputClass(!!errors.city)} placeholder="São Paulo" value={talent.city} onChange={(event) => setTalentField("city", event.target.value)} />
                          </LabeledInput>
                          <LabeledInput label="Estado" error={errors.state}>
                            <select className={inputClass(!!errors.state)} value={talent.state} onChange={(event) => setTalentField("state", event.target.value)}>
                              <option value="">Selecione</option>
                              {BRAZIL_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                            </select>
                          </LabeledInput>
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard eyebrow="Perfil profissional" title="Como você quer se apresentar">
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <LabeledInput label="Gênero">
                            <select className={inputClass()} value={talent.gender} onChange={(event) => setTalentField("gender", event.target.value)}>
                              <option value="">Selecione</option>
                              <option value="male">Masculino</option>
                              <option value="female">Feminino</option>
                              <option value="other">Outro</option>
                            </select>
                          </LabeledInput>
                          <LabeledInput label="Idade">
                            <input type="number" min={16} max={99} className={inputClass()} placeholder="25" value={talent.age} onChange={(event) => setTalentField("age", event.target.value)} />
                          </LabeledInput>
                        </div>
                        <LabeledInput label={`Bio — ${talent.bio.length}/300`} error={errors.bio}>
                          <textarea rows={4} className={`${inputClass(!!errors.bio)} resize-none`} placeholder="Sou um criador de lifestyle baseado em São Paulo..." value={talent.bio} onChange={(event) => setTalentField("bio", event.target.value)} />
                        </LabeledInput>
                        <div>
                          <p className="mb-1.5 block text-[12px] font-medium text-[#516667]">Categorias</p>
                          <p className="mb-3 text-[12px] text-zinc-400">Selecione todas as categorias que combinam com seu perfil.</p>
                          <div className="flex flex-wrap gap-2">
                            {TALENT_CATEGORY_LABELS.map((category) => {
                              const key = category === "Outro" ? "Outro" : category;
                              const active = talent.categories.includes(key);
                              return (
                                <button
                                  key={category}
                                  type="button"
                                  onClick={() => {
                                    const next = active ? talent.categories.filter((item) => item !== key) : [...talent.categories, key];
                                    setTalentField("categories", next);
                                    if (active && key === "Outro") setCustomOtherText("");
                                  }}
                                  className={[
                                    "rounded-xl px-3.5 py-2 text-[13px] font-medium transition-all",
                                    active ? "bg-[#1F2D2E] text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                                  ].join(" ")}
                                >
                                  {category === "Outro" ? "Outro / Personalizado" : category}
                                </button>
                              );
                            })}
                          </div>
                          {talent.categories.includes("Outro") ? (
                            <div className="mt-4">
                              <LabeledInput label="Descreva sua categoria *" error={errors.customOther}>
                                <input className={inputClass(!!errors.customOther)} placeholder="Ex: DJ, Mágico, Dublador..." value={customOtherText} onChange={(event) => setCustomOtherText(event.target.value)} />
                              </LabeledInput>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard eyebrow="Redes sociais" title="Links públicos do seu perfil">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <SocialInput label="Instagram" prefix="@" placeholder="seuhandle" value={talent.instagram} onChange={(value) => setTalentField("instagram", value)} />
                        <SocialInput label="TikTok" prefix="@" placeholder="seuhandle" value={talent.tiktok} onChange={(value) => setTalentField("tiktok", value)} />
                        <SocialInput label="YouTube" placeholder="https://youtube.com/@canal" value={talent.youtube} onChange={(value) => setTalentField("youtube", value)} />
                        <SocialInput label="LinkedIn" placeholder="https://linkedin.com/in/seuperfil" value={talent.linkedin} onChange={(value) => setTalentField("linkedin", value)} />
                        <div className="sm:col-span-2">
                          <SocialInput label="Website" placeholder="https://seuperfil.com" value={talent.website} onChange={(value) => setTalentField("website", value)} />
                        </div>
                      </div>
                    </SectionCard>
                  </>
                ) : (
                  <>
                    <SectionCard eyebrow="Dados da empresa" title="Base da sua agência">
                      <div className="grid gap-5 lg:grid-cols-[140px_minmax(0,1fr)]">
                        <UploadTile
                          label="Logo"
                          preview={logoPreview}
                          onChange={(file) => {
                            setLogo(file);
                            setLogoPreview(URL.createObjectURL(file));
                          }}
                        />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <LabeledInput label="Nome da empresa" error={errors.agencyName}>
                              <input className={inputClass(!!errors.agencyName)} placeholder="Brisa Creative" value={agency.agencyName} onChange={(event) => setAgencyField("agencyName", event.target.value)} />
                            </LabeledInput>
                          </div>
                          <div className="sm:col-span-2">
                            <LabeledInput label="Nome do contato/responsável" error={errors.responsibleName}>
                              <input className={inputClass(!!errors.responsibleName)} placeholder="Carla Mendes" value={agency.responsibleName} onChange={(event) => setAgencyField("responsibleName", event.target.value)} />
                            </LabeledInput>
                          </div>
                          <LabeledInput label="CPF / CNPJ" error={errors.cpfCnpj}>
                            <input className={inputClass(!!errors.cpfCnpj)} inputMode="numeric" maxLength={18} placeholder="00.000.000/0001-00" value={agency.cpfCnpj} onChange={(event) => setAgencyField("cpfCnpj", formatCpfCnpj(event.target.value))} />
                          </LabeledInput>
                          <LabeledInput label="Telefone" error={errors.phone}>
                            <PhoneInput value={agency.phone} onChange={(value) => setAgencyField("phone", value)} hasError={!!errors.phone} required />
                          </LabeledInput>
                          <LabeledInput label="País" error={errors.country}>
                            <input className={inputClass(!!errors.country)} placeholder="Brasil" value={agency.country} onChange={(event) => setAgencyField("country", event.target.value)} />
                          </LabeledInput>
                          <LabeledInput label="Cidade" error={errors.city}>
                            <input className={inputClass(!!errors.city)} placeholder="São Paulo" value={agency.city} onChange={(event) => setAgencyField("city", event.target.value)} />
                          </LabeledInput>
                          <LabeledInput label="Estado" error={errors.state}>
                            <select className={inputClass(!!errors.state)} value={agency.state} onChange={(event) => setAgencyField("state", event.target.value)}>
                              <option value="">Selecione</option>
                              {BRAZIL_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                            </select>
                          </LabeledInput>
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard eyebrow="Perfil da agência" title="Como sua operação será apresentada">
                      <div className="grid grid-cols-1 gap-4">
                        <LabeledInput label="Website">
                          <input className={inputClass()} placeholder="https://suaagencia.com" value={agency.website} onChange={(event) => setAgencyField("website", event.target.value)} />
                        </LabeledInput>
                        <LabeledInput label={`Descrição — ${agency.description.length}/500`} error={errors.description}>
                          <textarea rows={4} className={`${inputClass(!!errors.description)} resize-none`} placeholder="Conte rapidamente o que faz a sua agência..." value={agency.description} onChange={(event) => setAgencyField("description", event.target.value)} />
                        </LabeledInput>
                      </div>
                    </SectionCard>

                    <SectionCard eyebrow="Plano" title="Escolha como quer começar">
                      <div className="grid gap-4 lg:grid-cols-3">
                        {(["free", "pro", "premium"] as const).map((planKey) => {
                          const definition = PLAN_DEFINITIONS[planKey];
                          const active = agency.plan === planKey;
                          const disabled = !definition.available;
                          return (
                            <button
                              key={planKey}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                if (!disabled) setAgencyField("plan", planKey);
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
                                  <span className="rounded-full bg-[#0E7C86] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white">Popular</span>
                                ) : planKey === "premium" ? (
                                  <span className="rounded-full bg-[#DDE6E6] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#647B7B]">Em breve</span>
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
                            </button>
                          );
                        })}
                      </div>
                      {errors.plan ? <FieldError error={errors.plan} /> : null}
                      <div className="mt-4 rounded-2xl border border-[#DDE6E6] bg-[#F7FBFB] px-4 py-3">
                        <p className="text-[12px] font-semibold text-[#1F2D2E]">Plano escolhido: {selectedPlan.label}</p>
                        <p className="mt-1 text-[12px] leading-5 text-[#647B7B]">
                          {agency.plan === "pro"
                            ? "Ao concluir o cadastro, o pagamento do Pro abre em nova aba e a BrisaHub aguarda a confirmação antes do onboarding."
                            : "Você segue com o plano Free e entra no onboarding explicativo logo após criar a conta."}
                        </p>
                      </div>
                    </SectionCard>
                  </>
                )}

                <SectionCard eyebrow="Termos" title="Aceite obrigatório para continuar">
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#DDE6E6] bg-[#F7FBFB] px-4 py-4 transition-colors hover:border-[#A6CACA]">
                    <input
                      id="termsAccepted"
                      name="termsAccepted"
                      type="checkbox"
                      checked={account.termsAccepted}
                      required
                      onInvalid={(event) => {
                        event.currentTarget.setCustomValidity("Você precisa aceitar os Termos de Uso para continuar.");
                      }}
                      onChange={(event) => {
                        event.currentTarget.setCustomValidity("");
                        setAccountField("termsAccepted", event.target.checked);
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-[#A7B9BA] text-[#0E7C86] focus:ring-[#0E7C86]"
                    />
                    <span className="text-[14px] leading-6 text-[#516667]">
                      Li e aceito os{" "}
                      <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#102224] underline decoration-[#0E7C86]/55 underline-offset-4">
                        Termos de Uso e Condições
                      </Link>{" "}
                      da BrisaHub.
                    </span>
                  </label>
                  <FieldError error={errors.termsAccepted} />
                </SectionCard>

                {serverError ? <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-[13px] text-rose-600">{serverError}</div> : null}

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
