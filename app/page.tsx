"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserRole } from "@/lib/getUserRole";
import { getAgencyLanding } from "@/lib/getAgencyLanding";
import { buildPlanSettingsFallback, formatPlanCommission, formatPlanMonthlyPrice, planLimitHighlights, premiumSeatHighlights, type PublicPlanSetting } from "@/lib/planSettings.shared";
import { useT } from "@/lib/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";
import heroBrandImage from "@/public/landing/brisahub-hero-brand.png";
import dashboardScreenshot from "@/public/landing/dashboard.png";
import financesScreenshot from "@/public/landing/finances.png";
import jobsScreenshot from "@/public/landing/jobs.png";
import talentScreenshot from "@/public/landing/talent.png";

const FEATURE_ICON_PATHS = [
  "M12 3l7 4v5c0 4.5-2.9 8.5-7 9-4.1-.5-7-4.5-7-9V7l7-4z",
  "M7 3h7l4 4v14H7V3zm7 0v5h5M9 13h6M9 17h6M9 9h2",
  "M4 7h16v10H4V7zm3 4h.01M17 11h.01M8 17v2m8-2v2M7 7V5m10 2V5",
  "M17 20v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9.5 10a4 4 0 100-8 4 4 0 000 8zm10.5 10v-2a3 3 0 00-2-2.83M16 3.13a4 4 0 010 7.75",
  "M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0011.9 3.8M19 9A7 7 0 007.1 5.2",
  "M7 11V8a5 5 0 0110 0v3M6 11h12v10H6V11zm6 4v2",
] as const;

const SHOWCASE_IMAGES = [
  { image: jobsScreenshot,     altKey: "landing_alt_jobs",      width: jobsScreenshot.width,     height: jobsScreenshot.height,     sizes: "(min-width: 1024px) 58vw, 92vw" },
  { image: financesScreenshot, altKey: "landing_alt_finances",  width: financesScreenshot.width, height: financesScreenshot.height, sizes: "(min-width: 1024px) 34vw, 92vw" },
  { image: talentScreenshot,   altKey: "landing_alt_talents",   width: talentScreenshot.width,   height: talentScreenshot.height,   sizes: "(min-width: 1024px) 34vw, 92vw" },
] as const;

// ── Reusable primitives ───────────────────────────────────────────────────────

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/8 border border-white/10 px-4 py-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[#1ABC9C]" />
      <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">{children}</span>
    </div>
  );
}

function CheckIcon({ className = "text-[#1ABC9C]" }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 flex-shrink-0 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function FeatureIcon({ path }: { path: string }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1ABC9C] to-[#27C1D6] shadow-[0_8px_20px_rgba(26,188,156,0.28)]">
      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
      </svg>
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/8 bg-white/5 backdrop-blur-sm p-6 ${className}`}>
      {children}
    </div>
  );
}

function ScreenshotFrame({
  src, alt, width, height, priority = false, className = "", sizes, aspectRatio,
}: {
  src: string | StaticImageData;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
  sizes: string;
  aspectRatio?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.28)] ${className}`}>
      <div className="relative w-full overflow-hidden rounded-[1rem]" style={{ aspectRatio: aspectRatio ?? `${width} / ${height}` }}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          className="h-full w-full object-cover object-top"
          sizes={sizes}
        />
      </div>
    </div>
  );
}

function ProductPreview({ alt }: { alt: string }) {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:mx-0 lg:max-w-2xl lg:justify-self-end">
      <div className="absolute -left-6 top-10 h-40 w-40 rounded-full bg-[#1ABC9C]/20 blur-3xl lg:-left-10 lg:h-48 lg:w-48" />
      <div className="absolute -right-6 bottom-8 h-44 w-44 rounded-full bg-[#27C1D6]/10 blur-3xl lg:-right-8 lg:h-56 lg:w-56" />
      <div className="relative rounded-[2.1rem] bg-[linear-gradient(135deg,rgba(26,188,156,0.20),rgba(255,255,255,0.06)_42%,rgba(255,255,255,0.02))] p-px shadow-[0_22px_54px_rgba(0,0,0,0.32)]">
        <ScreenshotFrame
          src={dashboardScreenshot}
          alt={alt}
          width={dashboardScreenshot.width}
          height={dashboardScreenshot.height}
          priority
          className="rounded-[2rem] bg-white/[0.04] backdrop-blur-sm"
          sizes="(min-width: 1024px) 52vw, 94vw"
          aspectRatio={`${dashboardScreenshot.width} / ${dashboardScreenshot.height}`}
        />
      </div>
    </div>
  );
}

const primaryLink =
  "inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#1ABC9C] to-[#27C1D6] px-6 py-4 text-[15px] font-black text-white shadow-[0_16px_36px_rgba(26,188,156,0.28)] transition-all hover:-translate-y-0.5 hover:brightness-105";

const ghostLink =
  "inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/8 px-6 py-4 text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/12";

function GridTexture() {
  return (
    <div
      className="absolute inset-0 opacity-[0.04] pointer-events-none"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    />
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type LivePlanMap = Record<string, PublicPlanSetting>;

export default function Home() {
  const router = useRouter();
  const { t, lang } = useT();
  const [checking, setChecking] = useState(true);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [livePlans, setLivePlans] = useState<LivePlanMap>(buildPlanSettingsFallback);

  // ── Translated data arrays ────────────────────────────────────────────────

  const howItWorks = [
    { step: "01", title: t("landing_hiw_step1_title"), description: t("landing_hiw_step1_desc") },
    { step: "02", title: t("landing_hiw_step2_title"), description: t("landing_hiw_step2_desc") },
    { step: "03", title: t("landing_hiw_step3_title"), description: t("landing_hiw_step3_desc") },
    { step: "04", title: t("landing_hiw_step4_title"), description: t("landing_hiw_step4_desc") },
  ];

  const features = [
    { title: t("landing_feat1_title"), description: t("landing_feat1_desc"), icon: FEATURE_ICON_PATHS[0] },
    { title: t("landing_feat2_title"), description: t("landing_feat2_desc"), icon: FEATURE_ICON_PATHS[1] },
    { title: t("landing_feat3_title"), description: t("landing_feat3_desc"), icon: FEATURE_ICON_PATHS[2] },
    { title: t("landing_feat4_title"), description: t("landing_feat4_desc"), icon: FEATURE_ICON_PATHS[3] },
    { title: t("landing_feat5_title"), description: t("landing_feat5_desc"), icon: FEATURE_ICON_PATHS[4] },
    { title: t("landing_feat6_title"), description: t("landing_feat6_desc"), icon: FEATURE_ICON_PATHS[5] },
  ];

  const trustPillars = [
    { title: t("landing_trust1_title"), description: t("landing_trust1_desc") },
    { title: t("landing_trust2_title"), description: t("landing_trust2_desc") },
    { title: t("landing_trust3_title"), description: t("landing_trust3_desc") },
  ];

  const businessTypes = [
    t("landing_biz_marketing"),
    t("landing_biz_content"),
    t("landing_biz_audiovisual"),
    t("landing_biz_freelancers"),
    t("landing_biz_smb"),
  ];

  const showcase = [
    { ...SHOWCASE_IMAGES[0], alt: t(SHOWCASE_IMAGES[0].altKey), eyebrow: t("landing_showcase_jobs_eyebrow"), title: t("landing_showcase_jobs_title"), description: t("landing_showcase_jobs_desc") },
    { ...SHOWCASE_IMAGES[1], alt: t(SHOWCASE_IMAGES[1].altKey), eyebrow: t("landing_showcase_fin_eyebrow"),  title: t("landing_showcase_fin_title"),  description: t("landing_showcase_fin_desc")  },
    { ...SHOWCASE_IMAGES[2], alt: t(SHOWCASE_IMAGES[2].altKey), eyebrow: t("landing_showcase_tal_eyebrow"),  title: t("landing_showcase_tal_title"),  description: t("landing_showcase_tal_desc")  },
  ];

  const plans = [
    { key: "free"    as const, audience: t("landing_plan_free_audience"),    summary: t("landing_plan_free_summary"),    featured: false, premium: false },
    { key: "pro"     as const, audience: t("landing_plan_pro_audience"),     summary: t("landing_plan_pro_summary"),     featured: true,  premium: false },
    { key: "premium" as const, audience: t("landing_plan_premium_audience"), summary: t("landing_plan_premium_summary"), featured: false, premium: true  },
  ];

  const ctrustItems = [t("landing_ctrust_item1"), t("landing_ctrust_item2"), t("landing_ctrust_item3")];

  function getPlanHighlights(livePlan: PublicPlanSetting) {
    const liveHighlights = planLimitHighlights(livePlan, lang);
    return livePlan.plan_key === "premium"
      ? [t("plan_everything_in_pro"), ...premiumSeatHighlights(livePlan, lang), ...liveHighlights]
      : liveHighlights;
  }

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    getUserRole().then(async (role) => {
      if (role === "agency") router.replace(await getAgencyLanding());
      else if (role === "talent") router.replace("/talent/dashboard");
      else if (role === "admin") router.replace("/admin/dashboard");
      else setChecking(false);
    });
  }, [router]);

  useEffect(() => {
    void fetch("/api/plan-settings").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json() as LivePlanMap;
      setLivePlans((prev) => ({ ...prev, ...data }));
    }).catch(() => undefined);
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#061214]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-[#1ABC9C]" />
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#061214] text-white">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20 border-b border-white/8 bg-[#061214]/95 px-5 backdrop-blur-md lg:px-10">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <Link href="/" aria-label="BrisaHub">
            <Image
              src={heroBrandImage}
              alt="BrisaHub"
              width={heroBrandImage.width}
              height={heroBrandImage.height}
              className="h-auto w-full max-w-[80px]"
            />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSelector variant="dark" />
            <Link
              href="/login"
              className="rounded-xl px-3 py-2 text-[13px] font-semibold text-white/50 transition-colors hover:bg-white/8 hover:text-white"
            >
              {t("landing_nav_signin")}
            </Link>
            <div className="relative hidden sm:block">
              <button
                onClick={() => setShowRoleMenu((v) => !v)}
                className="rounded-xl bg-gradient-to-r from-[#1ABC9C] to-[#27C1D6] px-4 py-2 text-[13px] font-black text-white shadow-[0_4px_16px_rgba(26,188,156,0.28)] transition-all hover:brightness-105 cursor-pointer"
              >
                {t("landing_nav_register")}
              </button>
              {showRoleMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowRoleMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 z-40 w-48 rounded-2xl border border-white/10 bg-[#081718] shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
                    <Link
                      href="/signup?role=agency"
                      onClick={() => setShowRoleMenu(false)}
                      className="flex items-center gap-3 px-4 py-3.5 text-[13px] font-semibold text-white hover:bg-white/8 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-lg bg-[#1ABC9C]/15 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-[#1ABC9C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </span>
                      <div>
                        <p>{t("landing_nav_agency")}</p>
                        <p className="text-[11px] font-normal text-white/40">{t("landing_nav_agency_sub")}</p>
                      </div>
                    </Link>
                    <div className="h-px bg-white/8 mx-4" />
                    <Link
                      href="/signup?role=talent"
                      onClick={() => setShowRoleMenu(false)}
                      className="flex items-center gap-3 px-4 py-3.5 text-[13px] font-semibold text-white hover:bg-white/8 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-lg bg-[#1ABC9C]/15 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-[#1ABC9C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </span>
                      <div>
                        <p>{t("landing_nav_talent")}</p>
                        <p className="text-[11px] font-normal text-white/40">{t("landing_nav_talent_sub")}</p>
                      </div>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(39,193,214,0.22),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(26,188,156,0.18),transparent_35%),linear-gradient(180deg,#081718_0%,#041012_100%)]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:"linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",backgroundSize:"48px 48px"}} />

        <div className="relative mx-auto grid max-w-7xl lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">

          <div className="flex flex-col justify-between px-6 py-14 sm:px-10 lg:px-12 lg:py-12">
            <div>
              <Image
                src={heroBrandImage}
                alt="BrisaHub"
                width={heroBrandImage.width}
                height={heroBrandImage.height}
                priority
                className="h-auto w-full max-w-[110px] lg:max-w-[120px]"
              />
            </div>

            <div className="space-y-6 py-10 lg:py-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/8 border border-white/10 px-4 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1ABC9C]" />
                <span className="text-[12px] font-semibold text-white/60 tracking-wide">{t("landing_hero_badge")}</span>
              </div>
              <h1 className="text-[2.2rem] font-black tracking-[-0.04em] leading-[1.1] text-white sm:text-[2.6rem]">
                {t("landing_hero_title_line1")}<br />
                <span className="bg-gradient-to-r from-[#1ABC9C] to-[#27C1D6] bg-clip-text text-transparent">
                  {t("landing_hero_title_gradient")}
                </span><br />
                {t("landing_hero_title_line3")}
              </h1>
              <p className="text-[15px] leading-7 text-white/50 max-w-sm">
                {t("landing_hero_subtitle")}
              </p>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Link href="/signup?role=agency" className={primaryLink}>
                  {t("landing_hero_cta_agency")}
                </Link>
                <Link href="/signup?role=talent" className={ghostLink}>
                  {t("landing_hero_cta_talent")}
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-8">
              {[
                { value: "100%", label: t("landing_stat_secure") },
                { value: "PIX",  label: t("landing_stat_payments") },
                { value: "24h",  label: t("landing_stat_support") },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-[1.25rem] font-black text-white tracking-tight">{value}</p>
                  <p className="text-[11px] text-white/40 font-medium mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-center px-6 py-12 lg:px-10">
            <ProductPreview alt={t("landing_alt_dashboard")} />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative overflow-hidden px-5 py-20 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(39,193,214,0.08),transparent_40%)]" />
        <GridTexture />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <Pill>{t("landing_hiw_pill1")}</Pill>
            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              {t("landing_hiw_title1")}
            </h2>
            <p className="mt-5 text-base leading-7 text-white/50">
              {t("landing_hiw_desc1")}
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-2xl text-center">
            <Pill>{t("landing_hiw_pill2")}</Pill>
            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              {t("landing_hiw_title2")}
            </h2>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((item) => (
              <GlassCard key={item.step} className="transition-transform duration-200 hover:-translate-y-1">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1ABC9C]/20 to-[#27C1D6]/20 text-sm font-black text-[#1ABC9C] border border-[#1ABC9C]/20">
                  {item.step}
                </span>
                <h3 className="mt-6 text-base font-black text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/50">{item.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative overflow-hidden px-5 py-20 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_60%,rgba(26,188,156,0.10),transparent_35%),radial-gradient(circle_at_90%_40%,rgba(39,193,214,0.07),transparent_35%)]" />
        <GridTexture />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <Pill>{t("landing_feat_pill")}</Pill>
            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              {t("landing_feat_title")}
            </h2>
            <p className="mt-5 text-base leading-7 text-white/50">
              {t("landing_feat_desc")}
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <GlassCard key={feature.title}>
                <FeatureIcon path={feature.icon} />
                <h3 className="mt-5 text-base font-black text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/50">{feature.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ── */}
      <section className="relative overflow-hidden px-5 py-20 lg:px-10">
        <GridTexture />
        <div className="relative mx-auto max-w-7xl">
          <div className="rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_14%_0%,rgba(26,188,156,0.12),transparent_40%)] p-8 lg:p-14">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <Pill>{t("landing_use_pill")}</Pill>
                <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                  {t("landing_use_title")}
                </h2>
                <p className="mt-5 text-base leading-7 text-white/50">
                  {t("landing_use_desc")}
                </p>

                <div className="mt-8 rounded-2xl border border-white/8 bg-white/5 p-5">
                  <p className="text-sm font-black text-white">{t("landing_use_for_whom")}</p>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {t("landing_use_who_desc")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {businessTypes.map((type) => (
                      <span key={type} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-medium text-white/60 capitalize">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {trustPillars.map((pillar) => (
                  <div key={pillar.title} className="rounded-2xl border border-white/8 bg-white/5 px-6 py-5 flex items-start gap-4">
                    <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-xl bg-[#1ABC9C]/15 flex items-center justify-center">
                      <CheckIcon />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">{pillar.title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-white/50">{pillar.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Screenshots ── */}
      <section className="relative overflow-hidden px-5 pb-20 pt-16 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,rgba(39,193,214,0.08),transparent_40%)]" />
        <GridTexture />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Pill>{t("landing_ss_pill")}</Pill>
              <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                {t("landing_ss_title")}
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-white/40">
              {t("landing_ss_desc")}
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
            <article className="flex flex-col gap-4">
              <ScreenshotFrame
                src={showcase[0].image}
                alt={showcase[0].alt}
                width={showcase[0].width}
                height={showcase[0].height}
                sizes={showcase[0].sizes}
                aspectRatio={`${showcase[0].width} / ${showcase[0].height}`}
              />
              <div className="space-y-2 px-1">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1ABC9C]">{showcase[0].eyebrow}</p>
                <h3 className="text-lg font-black text-white">{showcase[0].title}</h3>
                <p className="max-w-2xl text-sm leading-6 text-white/50">{showcase[0].description}</p>
              </div>
            </article>

            <div className="grid gap-6">
              {showcase.slice(1).map((item) => (
                <article key={item.title} className="flex flex-col gap-4">
                  <ScreenshotFrame
                    src={item.image}
                    alt={item.alt}
                    width={item.width}
                    height={item.height}
                    sizes={item.sizes}
                    aspectRatio={`${item.width} / ${item.height}`}
                  />
                  <div className="space-y-2 px-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1ABC9C]">{item.eyebrow}</p>
                    <h3 className="text-lg font-black text-white">{item.title}</h3>
                    <p className="text-sm leading-6 text-white/50">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Plans ── */}
      <section className="relative overflow-hidden px-5 pb-20 pt-24 lg:px-10 lg:pt-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(26,188,156,0.12),transparent_40%)]" />
        <GridTexture />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <Pill>{t("landing_plans_pill")}</Pill>
            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              {t("landing_plans_title")}
            </h2>
            <p className="mt-5 text-base leading-7 text-white/50">
              {t("landing_plans_desc")}
            </p>
          </div>

          <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
            {plans.map((plan) => {
              const livePlan = livePlans[plan.key] ?? buildPlanSettingsFallback()[plan.key];
              const isDisabled = !livePlan.is_available;
              const highlights = getPlanHighlights(livePlan);

              return <div
                key={plan.key}
                className={[
                  "relative flex h-full flex-col rounded-[1.5rem] border p-8 transition-all",
                  plan.featured
                    ? "border-[#1ABC9C]/40 bg-[radial-gradient(circle_at_50%_0%,rgba(26,188,156,0.15),transparent_50%)] shadow-[0_24px_70px_rgba(26,188,156,0.18)]"
                    : plan.key === "premium"
                    ? "border-white/8 bg-white/[0.03]"
                    : "border-white/8 bg-white/5",
                ].join(" ")}
              >
                {plan.featured && (
                  <span className="absolute right-5 top-5 rounded-full bg-gradient-to-r from-[#1ABC9C] to-[#27C1D6] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-[0_4px_16px_rgba(26,188,156,0.28)]">
                    {t("plan_popular_badge")}
                  </span>
                )}
                {isDisabled && (
                  <span className="absolute right-5 top-5 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/50">
                    {t("plan_coming_soon")}
                  </span>
                )}
                <div className={plan.featured || plan.key === "premium" ? "flex h-full flex-col pt-8" : "flex h-full flex-col"}>
                  <p className="text-sm font-bold text-white/40">{plan.audience}</p>
                  <h3 className="mt-4 text-2xl font-black text-white">{livePlan.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/50">{plan.summary}</p>
                  {livePlan.is_available ? (
                    <div className="mt-4 flex items-end gap-1">
                      <span className="text-4xl font-black tracking-[-0.04em] text-white">{formatPlanMonthlyPrice(livePlan.price, lang)}</span>
                    </div>
                  ) : (
                    <p className="mt-4 text-4xl font-black tracking-[-0.04em] text-white/45">{t("plan_coming_soon")}</p>
                  )}
                  {livePlan.is_available && (
                    <div className="mt-5 rounded-2xl border border-[#1ABC9C]/20 bg-[#1ABC9C]/8 px-4 py-3 flex items-center justify-between gap-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#1ABC9C]/80">{t("plan_commission_label")}</p>
                      <p className="text-xl font-black text-white flex-shrink-0">{formatPlanCommission(livePlan.commission_percent)}</p>
                    </div>
                  )}
                  <ul className="mt-6 space-y-3 pb-7">
                    {highlights.map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm leading-6 text-white/60">
                        <CheckIcon />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {isDisabled ? (
                    <span className="mt-auto inline-flex w-full items-center justify-center rounded-2xl px-5 py-3.5 text-sm font-black border border-white/10 bg-white/5 text-white/30 cursor-not-allowed">
                      {t("plan_coming_soon")}
                    </span>
                  ) : (
                    <Link
                      href={`/signup?role=agency&plan=${plan.key}`}
                      className={[
                        "mt-auto inline-flex w-full items-center justify-center rounded-2xl px-5 py-3.5 text-sm font-black transition-all",
                        plan.featured
                          ? "bg-gradient-to-r from-[#1ABC9C] to-[#27C1D6] text-white shadow-[0_8px_24px_rgba(26,188,156,0.28)] hover:brightness-105"
                          : "border border-white/12 bg-white/8 text-white hover:bg-white/12",
                      ].join(" ")}
                    >
                      {t("plan_cta_prefix")} {livePlan.name}
                    </Link>
                  )}
                </div>
              </div>;
            })}
          </div>
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="relative overflow-hidden px-5 py-20 lg:px-10">
        <GridTexture />
        <div className="relative mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Pill>{t("landing_ctrust_pill")}</Pill>
            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              {t("landing_ctrust_title")}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/50">
              {t("landing_ctrust_desc")}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {ctrustItems.map((item) => (
              <GlassCard key={item}>
                <CheckIcon />
                <p className="mt-4 text-sm font-black leading-6 text-white">{item}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden px-5 py-20 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(26,188,156,0.18),transparent_32%),radial-gradient(circle_at_80%_100%,rgba(39,193,214,0.12),transparent_32%)]" />
        <GridTexture />
        <div className="relative mx-auto max-w-7xl">
          <div className="rounded-[2rem] border border-white/8 bg-white/[0.03] px-6 py-14 text-center sm:px-10">
            <Pill>{t("landing_cta_pill")}</Pill>
            <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              {t("landing_cta_title")}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/50">
              {t("landing_cta_desc")}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/signup?role=agency" className={primaryLink}>
                {t("landing_cta_btn_agency")}
              </Link>
              <Link href="/signup?role=talent" className={ghostLink}>
                {t("landing_cta_btn_talent")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 px-5 py-7 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <Image
            src={heroBrandImage}
            alt="BrisaHub"
            width={heroBrandImage.width}
            height={heroBrandImage.height}
            className="h-auto w-full max-w-[64px] mx-auto sm:mx-0 opacity-70"
          />
          <p className="text-[12px] text-white/30">{t("landing_footer_rights")}</p>
        </div>
      </footer>

    </main>
  );
}
