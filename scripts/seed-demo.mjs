/**
 * BrisaHub Demo Seed — Expanded
 *
 * Creates a realistic, fully-populated demo environment for investor demos,
 * videos, and Acquire listings. Safe to re-run — fully idempotent.
 *
 * Run:   node scripts/seed-demo.mjs
 * Reset: node scripts/reset-demo.mjs
 *
 * Password for all demo accounts: BrisaDemo@2026
 * All demo emails: demo-*@brisahub.com
 * All demo auth users have user_metadata.is_demo = true
 */

import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

// ─── Load env ────────────────────────────────────────────────────────────────

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  const env = readFileSync(join(root, ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && !k.startsWith("#")) process.env[k.trim()] = v.join("=").trim();
  }
} catch {}

const url    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !svcKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, svcKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function findOrCreateUser({ email, password, role, metadata = {} }) {
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) {
    console.log(`  ✓ user exists: ${email}`);
    return existing.id;
  }
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, is_demo: true, ...metadata },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  console.log(`  + created: ${email} (${data.user.id})`);
  return data.user.id;
}

function check(label, error) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function bookingExists(jobId, talentUserId) {
  const { data } = await sb
    .from("bookings")
    .select("id, contracts(id)")
    .eq("job_id", jobId)
    .eq("talent_user_id", talentUserId)
    .maybeSingle();
  return data;
}

async function submissionExists(jobId, talentUserId) {
  const { data } = await sb
    .from("submissions")
    .select("id")
    .eq("job_id", jobId)
    .eq("talent_user_id", talentUserId)
    .maybeSingle();
  return data;
}

async function notifExists(userId, type, title) {
  const { data } = await sb
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .eq("title", title)
    .maybeSingle();
  return !!data;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PASSWORD = "BrisaDemo@2026";

// ─── Step 1: Auth users ───────────────────────────────────────────────────────

console.log("\n[1/13] Creating auth users…");

const ownerId   = await findOrCreateUser({ email: "demo-owner@brisahub.com",          password: PASSWORD, role: "agency" });
const agent1Id  = await findOrCreateUser({ email: "demo-agent@brisahub.com",          password: PASSWORD, role: "agency" });
const agent2Id  = await findOrCreateUser({ email: "demo-agent-2@brisahub.com",        password: PASSWORD, role: "agency" });
const agencyId  = await findOrCreateUser({ email: "demo-agency@brisahub.com",         password: PASSWORD, role: "agency" });

// Talent pool — portal-only + marketplace + mixed states
const sofiaId   = await findOrCreateUser({ email: "demo-talent-portal@brisahub.com",  password: PASSWORD, role: "talent" });
const beatrizId = await findOrCreateUser({ email: "demo-talent-mkt@brisahub.com",     password: PASSWORD, role: "talent" });
const lucasId   = await findOrCreateUser({ email: "demo-talent@brisahub.com",         password: PASSWORD, role: "talent" });
const camilaId  = await findOrCreateUser({ email: "demo-talent-camila@brisahub.com",  password: PASSWORD, role: "talent" });
const rafaelId  = await findOrCreateUser({ email: "demo-talent-rafael@brisahub.com",  password: PASSWORD, role: "talent" });
const isabelaId = await findOrCreateUser({ email: "demo-talent-isabela@brisahub.com", password: PASSWORD, role: "talent" });

// ─── Step 2: Profiles ─────────────────────────────────────────────────────────

console.log("\n[2/13] Upserting profiles…");

const profiles = [
  { id: ownerId,   role: "agency", plan: "premium", plan_status: "active",   wallet_balance: 28400  },
  { id: agent1Id,  role: "agency", plan: "free",    plan_status: "inactive", wallet_balance: 0      },
  { id: agent2Id,  role: "agency", plan: "free",    plan_status: "inactive", wallet_balance: 0      },
  { id: agencyId,  role: "agency", plan: "free",    plan_status: "inactive", wallet_balance: 2100   },
  { id: sofiaId,   role: "talent", plan: "free",    plan_status: "inactive", wallet_balance: 4320   },
  { id: beatrizId, role: "talent", plan: "free",    plan_status: "inactive", wallet_balance: 850    },
  { id: lucasId,   role: "talent", plan: "free",    plan_status: "inactive", wallet_balance: 0      },
  { id: camilaId,  role: "talent", plan: "free",    plan_status: "inactive", wallet_balance: 18900  },
  { id: rafaelId,  role: "talent", plan: "free",    plan_status: "inactive", wallet_balance: 7650   },
  { id: isabelaId, role: "talent", plan: "free",    plan_status: "inactive", wallet_balance: 0      },
];

for (const p of profiles) {
  const { error } = await sb.from("profiles").upsert(p, { onConflict: "id" });
  check(`profile ${p.id}`, error);
}
console.log(`  ✓ ${profiles.length} profiles upserted`);

// ─── Step 3: Agency rows ──────────────────────────────────────────────────────

console.log("\n[3/13] Upserting agency rows…");

const agencies = [
  { id: ownerId,  company_name: "Aurora Casting",    subscription_status: "active" },
  { id: agent1Id, company_name: "Agente Demo",        subscription_status: "active" },
  { id: agent2Id, company_name: "Agente 2 Demo",      subscription_status: "active" },
  { id: agencyId, company_name: "Creative Studio BR", subscription_status: "active" },
];

for (const a of agencies) {
  const { error } = await sb.from("agencies").upsert(a, { onConflict: "id" });
  check(`agency ${a.id}`, error);
}
console.log(`  ✓ ${agencies.length} agency rows upserted`);

// ─── Step 4: Talent profiles ──────────────────────────────────────────────────

console.log("\n[4/13] Upserting talent profiles…");

const talentProfiles = [
  {
    id: sofiaId, user_id: sofiaId,
    full_name: "Sofia Andrade",
    city: "São Paulo", country: "Brasil",
    bio: "Modelo editorial e comercial. 8 anos de experiência em publicidade e moda. Rostos de campanha nacionais e internacionais.",
    categories: ["moda", "editorial", "comercial"],
    age: 27, gender: "female",
    marketplace_visible: false,
    instagram: "@sofiaandrade",
  },
  {
    id: beatrizId, user_id: beatrizId,
    full_name: "Beatriz Santos",
    city: "Rio de Janeiro", country: "Brasil",
    bio: "Atriz e modelo. Especializada em campanhas de lifestyle e beleza. Experiência em cinema e publicidade.",
    categories: ["atuacao", "moda", "beleza"],
    age: 24, gender: "female",
    marketplace_visible: true,
    instagram: "@beatrizsantos.rj",
  },
  {
    id: lucasId, user_id: lucasId,
    full_name: "Lucas Mendes",
    city: "Curitiba", country: "Brasil",
    bio: "Modelo masculino fitness. Especializado em moda esportiva, ativewear e lifestyle ao ar livre.",
    categories: ["moda", "esportes", "fitness"],
    age: 29, gender: "male",
    marketplace_visible: true,
    instagram: "@lucasmendes.fit",
  },
  {
    id: camilaId, user_id: camilaId,
    full_name: "Camila Rocha",
    city: "São Paulo", country: "Brasil",
    bio: "Modelo e apresentadora. Mais de 12 anos de carreira. Especialista em campanhas de beleza, luxo e alta costura.",
    categories: ["moda", "beleza", "luxo", "editorial"],
    age: 31, gender: "female",
    marketplace_visible: false,
    instagram: "@camilarocha.oficial",
  },
  {
    id: rafaelId, user_id: rafaelId,
    full_name: "Rafael Souza",
    city: "São Paulo", country: "Brasil",
    bio: "Ator e modelo. Especializado em comerciais de TV, campanhas corporativas e lifestyle masculino.",
    categories: ["atuacao", "moda", "comercial"],
    age: 32, gender: "male",
    marketplace_visible: true,
    instagram: "@rafaelsouza.modelo",
  },
  {
    id: isabelaId, user_id: isabelaId,
    full_name: "Isabela Costa",
    city: "Belo Horizonte", country: "Brasil",
    bio: "Modelo iniciante. Perfil fresh, autêntico e versátil. Disponível para editoriais e campanhas comerciais.",
    categories: ["moda", "editorial"],
    age: 22, gender: "female",
    marketplace_visible: false,
    instagram: "@isabelacosta.mg",
  },
];

for (const tp of talentProfiles) {
  const { error } = await sb.from("talent_profiles").upsert(tp, { onConflict: "id" });
  check(`talent_profile ${tp.full_name}`, error);
}
console.log(`  ✓ ${talentProfiles.length} talent profiles upserted`);

// ─── Step 5: Premium workspace ────────────────────────────────────────────────

console.log("\n[5/13] Creating premium workspace…");

let workspaceId;
{
  const { data: existing } = await sb
    .from("premium_workspaces")
    .select("id")
    .eq("owner_user_id", ownerId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    workspaceId = existing.id;
    // Ensure onboarding is completed so wizard doesn't appear during demos
    await sb.from("premium_workspaces")
      .update({ onboarding_completed: true })
      .eq("id", workspaceId);
    console.log(`  ✓ workspace exists: ${workspaceId}`);
  } else {
    const { data, error } = await sb
      .from("premium_workspaces")
      .insert({
        owner_user_id:        ownerId,
        agency_id:            ownerId,
        name:                 "Aurora Casting",
        slug:                 "aurora-casting",
        brand_primary_color:  "#7C3AED",
        brand_accent_color:   "#A855F7",
        welcome_message:      "Bem-vindo ao portal exclusivo da Aurora Casting. Aqui você encontra as melhores oportunidades selecionadas para o seu perfil.",
        status:               "active",
        included_agent_seats: 3,
        onboarding_completed: true,
      })
      .select("id")
      .single();
    check("premium_workspaces insert", error);
    workspaceId = data.id;
    console.log(`  + created workspace: ${workspaceId}`);
  }
}

// ─── Step 6: Workspace members ────────────────────────────────────────────────

console.log("\n[6/13] Upserting workspace members…");

const memberDefs = [
  { user_id: ownerId,  role: "owner", status: "active", spending_limit: null,  created_by: ownerId },
  { user_id: agent1Id, role: "agent", status: "active", spending_limit: 60000, created_by: ownerId },
  { user_id: agent2Id, role: "agent", status: "active", spending_limit: 30000, created_by: ownerId },
];

for (const m of memberDefs) {
  const { data: existing } = await sb
    .from("premium_workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", m.user_id)
    .is("removed_at", null)
    .maybeSingle();

  if (existing) {
    console.log(`  ✓ member exists: ${m.role}`);
    continue;
  }
  const { error } = await sb.from("premium_workspace_members").insert({
    workspace_id: workspaceId, ...m,
  });
  check(`member ${m.role}`, error);
  console.log(`  + added member: ${m.role}`);
}

// ─── Step 7: Workspace talents ────────────────────────────────────────────────

console.log("\n[7/13] Upserting workspace talents…");

// Remove any non-talent rows that may have leaked in
await sb.from("premium_workspace_talents").delete()
  .eq("workspace_id", workspaceId)
  .in("talent_user_id", [ownerId, agent1Id, agent2Id]);

const portalTalentDefs = [
  { talent_user_id: sofiaId,   status: "active" },
  { talent_user_id: camilaId,  status: "active" },
  { talent_user_id: isabelaId, status: "active" },
  // Beatriz and Rafael are marketplace-visible but also portal members
  { talent_user_id: beatrizId, status: "active" },
  { talent_user_id: rafaelId,  status: "active" },
];

for (const t of portalTalentDefs) {
  const { data: existing } = await sb
    .from("premium_workspace_talents")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("talent_user_id", t.talent_user_id)
    .is("removed_at", null)
    .maybeSingle();

  if (existing) {
    console.log(`  ✓ portal talent exists: ${t.talent_user_id}`);
    continue;
  }
  const { error } = await sb.from("premium_workspace_talents").insert({
    workspace_id:   workspaceId,
    talent_user_id: t.talent_user_id,
    status:         t.status,
    source:         "portal",
    invited_by:     ownerId,
  });
  check(`workspace talent ${t.talent_user_id}`, error);
  console.log(`  + added portal talent: ${t.talent_user_id}`);
}

// ─── Step 8: Jobs ─────────────────────────────────────────────────────────────

console.log("\n[8/13] Creating jobs (12 states)…");

/*
 * 12 job scenarios covering every major platform state:
 *  1. recem_criada      — newly created, no applications
 *  2. casting_ativo     — active casting, several submissions pending
 *  3. talento_selecionado — selection done, mix approved/rejected
 *  4. contrato_enviado  — contract sent, waiting talent signature
 *  5. contrato_assinado — talent signed, waiting agency deposit
 *  6. escrow_funded     — escrow funded, booking upcoming TODAY
 *  7. booking_realizado — work done, waiting payout release
 *  8. comercial_itau    — paid/complete (legacy, kept as-is)
 *  9. job_cancelado     — cancelled job + cancelled contract
 * 10. job_expirado      — expired/unfilled, past date, no completion
 * 11. campanha_nike     — high-budget premium campaign (R$80k)
 * 12. foto_ecommerce    — small quick booking, completed same day
 */

const jobDefs = [
  {
    _key: "recem_criada",
    title:              "Teste de Câmera — Novos Rostos 2026",
    description:        "Seleção de novos talentos para o roster da Aurora Casting. Sessão de testes com fotógrafo profissional. Sem experiência prévia necessária.",
    location:           "São Paulo, SP",
    status:             "open",
    visibility:         "workspace_only",
    budget:             2000,
    gender:             null,
    age_min:            18,
    age_max:            28,
    job_date:           "2026-07-15",
    job_time:           "10:00",
    talents_needed:     5,
    workspace_id:       workspaceId,
    created_by_user_id: agent2Id,
  },
  {
    _key: "casting_ativo",
    title:              "Campanha Natura — Ekos Verão 2026",
    description:        "Campanha de verão para linha Ekos. Perfil natural, autêntico, diverso. Shooting em locação externa (praia e mata). 2 dias.",
    location:           "São Paulo, SP",
    status:             "open",
    visibility:         "workspace_only",
    budget:             15000,
    gender:             null,
    age_min:            20,
    age_max:            38,
    job_date:           "2026-08-10",
    job_time:           "08:00",
    talents_needed:     3,
    workspace_id:       workspaceId,
    created_by_user_id: agent1Id,
  },
  {
    _key: "talento_selecionado",
    title:              "Lookbook FARM Rio — Coleção Outono",
    description:        "Lookbook editorial outono/inverno para FARM Rio. Estilo boho-chic, cores terrosas, locação interna e externa. 1 dia.",
    location:           "Rio de Janeiro, RJ",
    status:             "open",
    visibility:         "private_invite",
    budget:             9500,
    gender:             "feminino",
    age_min:            22,
    age_max:            32,
    job_date:           "2026-07-20",
    job_time:           "09:00",
    talents_needed:     2,
    workspace_id:       workspaceId,
    created_by_user_id: ownerId,
  },
  {
    _key: "contrato_enviado",
    title:              "Spot Rádio Bradesco — Voz Feminina",
    description:        "Locução para spot de rádio. Voz clara, profissional, tom de confiança e modernidade. Gravação em estúdio, 4 horas.",
    location:           "São Paulo, SP",
    status:             "open",
    visibility:         "private_invite",
    budget:             4500,
    gender:             "feminino",
    age_min:            25,
    age_max:            45,
    job_date:           "2026-06-25",
    job_time:           "14:00",
    talents_needed:     1,
    workspace_id:       workspaceId,
    created_by_user_id: agent1Id,
  },
  {
    _key: "contrato_assinado",
    title:              "Campanha Havaianas — Redes Sociais Verão",
    description:        "Conteúdo para redes sociais da Havaianas. Estilo descontraído, alegre, verão brasileiro. Produção de fotos e vídeos curtos.",
    location:           "Rio de Janeiro, RJ",
    status:             "open",
    visibility:         "workspace_only",
    budget:             7200,
    gender:             null,
    age_min:            20,
    age_max:            32,
    job_date:           "2026-07-08",
    job_time:           "11:00",
    talents_needed:     2,
    workspace_id:       workspaceId,
    created_by_user_id: ownerId,
  },
  {
    _key: "escrow_funded",
    title:              "TVC Samsung Galaxy — Jovem Conectado",
    description:        "Comercial de TV para lançamento Samsung Galaxy. Perfil jovem, tecnológico, urbano. 1 dia de gravação em set producionado.",
    location:           "São Paulo, SP",
    status:             "open",
    visibility:         "private_invite",
    budget:             18000,
    gender:             "masculino",
    age_min:            22,
    age_max:            30,
    job_date:           "2026-05-16",
    job_time:           "07:00",
    talents_needed:     1,
    workspace_id:       workspaceId,
    created_by_user_id: agent1Id,
  },
  {
    _key: "booking_realizado",
    title:              "Desfile SPFW — Coleção Outono-Inverno",
    description:        "Desfile no São Paulo Fashion Week. Alta costura, passarela profissional. Ensaio 2 dias antes, desfile 1 dia.",
    location:           "São Paulo, SP",
    status:             "closed",
    visibility:         "private_invite",
    budget:             11000,
    gender:             "feminino",
    age_min:            20,
    age_max:            30,
    job_date:           "2026-05-10",
    talents_needed:     2,
    workspace_id:       workspaceId,
    created_by_user_id: ownerId,
  },
  {
    _key: "comercial_itau",
    title:              "Comercial TV Banco Itaú — Família",
    description:        "Comercial de TV nacional. Perfil família, transmitir confiança e modernidade. 1 dia de gravação.",
    location:           "São Paulo, SP",
    status:             "closed",
    visibility:         "private_invite",
    budget:             25000,
    gender:             null,
    age_min:            25,
    age_max:            45,
    job_date:           "2026-04-20",
    talents_needed:     3,
    workspace_id:       workspaceId,
    created_by_user_id: ownerId,
  },
  {
    _key: "job_cancelado",
    title:              "Ensaio Produto Natura — Chronos",
    description:        "Ensaio para produto Natura Chronos. Cancelado por mudança no calendário editorial da marca.",
    location:           "São Paulo, SP",
    status:             "cancelled",
    visibility:         "private_invite",
    budget:             3500,
    gender:             "feminino",
    age_min:            30,
    age_max:            50,
    job_date:           "2026-05-30",
    talents_needed:     1,
    workspace_id:       workspaceId,
    created_by_user_id: agent1Id,
  },
  {
    _key: "job_expirado",
    title:              "Hostess Evento Corporativo Sebrae",
    description:        "Hostess para evento corporativo do Sebrae. Postura profissional, apresentação impecável. Vaga não preenchida.",
    location:           "Brasília, DF",
    status:             "closed",
    visibility:         "public",
    budget:             2800,
    gender:             "feminino",
    age_min:            20,
    age_max:            35,
    job_date:           "2026-04-15",
    talents_needed:     2,
    workspace_id:       null,
    created_by_user_id: agencyId,
  },
  {
    _key: "campanha_nike",
    title:              "Campanha Global Nike — Sprint Brasil",
    description:        "Campanha global Nike para mercado brasileiro. Perfis atléticos, diversidade, alto impacto. Produção internacional, 3 dias de shooting.",
    location:           "São Paulo, SP",
    status:             "open",
    visibility:         "private_invite",
    budget:             80000,
    gender:             null,
    age_min:            20,
    age_max:            35,
    job_date:           "2026-09-01",
    job_time:           "06:00",
    talents_needed:     6,
    workspace_id:       workspaceId,
    created_by_user_id: ownerId,
  },
  {
    _key: "foto_ecommerce",
    title:              "Foto Produto Ecommerce — Linha Infantil",
    description:        "Fotos de produto para ecommerce. Entrega rápida, fundo branco e neutro, 4 horas de studio.",
    location:           "São Paulo, SP",
    status:             "closed",
    visibility:         "public",
    budget:             1200,
    gender:             "feminino",
    age_min:            20,
    age_max:            35,
    job_date:           "2026-05-14",
    talents_needed:     1,
    workspace_id:       null,
    created_by_user_id: agencyId,
  },
  // Existing legacy public job
  {
    _key: "book_feminino",
    title:              "Ensaio Book Feminino SP — Verão",
    description:        "Book fotográfico de verão. Ambiente descontraído, ótimo para renovar portfólio.",
    location:           "São Paulo, SP",
    status:             "open",
    visibility:         "public",
    budget:             1800,
    gender:             "feminino",
    age_min:            18,
    age_max:            35,
    job_date:           "2026-06-28",
    talents_needed:     1,
    workspace_id:       null,
    created_by_user_id: agencyId,
  },
];

const jobIds = {};

for (const def of jobDefs) {
  const key = def._key;
  const payload = { ...def };
  delete payload._key;

  const { data: existing } = await sb
    .from("jobs")
    .select("id")
    .eq("title", payload.title)
    .eq("created_by_user_id", payload.created_by_user_id)
    .maybeSingle();

  if (existing) {
    jobIds[key] = existing.id;
    console.log(`  ✓ job exists: "${payload.title}"`);
    continue;
  }

  const { data, error } = await sb
    .from("jobs")
    .insert({ ...payload, agency_id: payload.created_by_user_id })
    .select("id")
    .single();
  check(`job "${payload.title}"`, error);
  jobIds[key] = data.id;
  console.log(`  + created job: "${payload.title}"`);
}

// ─── Step 9: Bookings + Contracts ─────────────────────────────────────────────

console.log("\n[9/13] Creating bookings and contracts…");

// Helper: create a booking+contract pair, idempotent
async function ensureBookingContract({
  label, jobId, jobTitle, agencyId: agId, talentId: tId,
  bookingStatus, contractStatus,
  amount, commission, net, commissionPct,
  jobDate, location, description,
  signedAt = null, depositAt = null, paidAt = null,
  bookingCreatedAt, contractCreatedAt,
}) {
  const existing = await bookingExists(jobId, tId);
  if (existing) {
    console.log(`  ✓ booking exists: ${label}`);
    return existing;
  }

  const { data: booking, error: bErr } = await sb.from("bookings").insert({
    job_id: jobId, job_title: jobTitle,
    agency_id: agId, talent_user_id: tId,
    status: bookingStatus, created_at: bookingCreatedAt,
  }).select("id").single();
  check(`booking ${label}`, bErr);

  const contractPayload = {
    booking_id: booking.id, job_id: jobId,
    agency_id: agId, talent_user_id: tId,
    job_title: jobTitle,
    payment_amount: amount,
    commission_amount: commission,
    net_amount: net,
    commission_percent: commissionPct,
    status: contractStatus,
    job_date: jobDate, location, job_description: description,
    created_at: contractCreatedAt,
  };
  if (signedAt)  { contractPayload.signed_at = signedAt; contractPayload.agency_signed_at = signedAt; }
  if (depositAt) { contractPayload.deposit_paid_at = depositAt; }
  if (paidAt)    { contractPayload.paid_at = paidAt; }

  const { data: contract, error: cErr } = await sb.from("contracts")
    .insert(contractPayload).select("id").single();
  check(`contract ${label}`, cErr);

  console.log(`  + created: ${label} (booking ${booking.id})`);
  return { id: booking.id, contracts: [{ id: contract.id }] };
}

// ── 1. Comercial Itaú / Sofia — PAID (complete lifecycle) ─────────────────────
const itauBooking = await ensureBookingContract({
  label: "Comercial Itaú / Sofia (paid)",
  jobId: jobIds.comercial_itau, jobTitle: "Comercial TV Banco Itaú — Família",
  agencyId: ownerId, talentId: sofiaId,
  bookingStatus: "paid", contractStatus: "paid",
  amount: 25000, commission: 2500, net: 22500, commissionPct: 10,
  jobDate: "2026-04-20", location: "São Paulo, SP",
  description: "Comercial de TV nacional. Perfil família.",
  signedAt: "2026-04-11T10:00:00Z",
  depositAt: "2026-04-12T14:00:00Z",
  paidAt: "2026-04-21T16:00:00Z",
  bookingCreatedAt: "2026-04-10T09:00:00Z",
  contractCreatedAt: "2026-04-10T09:30:00Z",
});

// ── 2. Editorial Inverno / Beatriz — CONFIRMED (escrowed) ────────────────────
const editorialBooking = await ensureBookingContract({
  label: "Editorial Inverno / Beatriz (confirmed/escrow)",
  jobId: jobIds.booking_realizado, jobTitle: "Desfile SPFW — Coleção Outono-Inverno",
  agencyId: ownerId, talentId: beatrizId,
  bookingStatus: "confirmed", contractStatus: "confirmed",
  amount: 11000, commission: 1100, net: 9900, commissionPct: 10,
  jobDate: "2026-05-10", location: "São Paulo, SP",
  description: "Desfile no São Paulo Fashion Week. Alta costura.",
  signedAt: "2026-05-03T14:00:00Z",
  depositAt: "2026-05-04T10:00:00Z",
  bookingCreatedAt: "2026-05-02T11:00:00Z",
  contractCreatedAt: "2026-05-02T11:30:00Z",
});

// ── 3. Catálogo Verão / Sofia — SENT (waiting talent signature) ───────────────
const catalogoBooking = await ensureBookingContract({
  label: "Catálogo Verão / Sofia (sent, waiting signature)",
  jobId: jobIds.contrato_enviado, jobTitle: "Spot Rádio Bradesco — Voz Feminina",
  agencyId: ownerId, talentId: sofiaId,
  bookingStatus: "pending", contractStatus: "sent",
  amount: 4500, commission: 450, net: 4050, commissionPct: 10,
  jobDate: "2026-06-25", location: "São Paulo, SP",
  description: "Locução para spot de rádio.",
  bookingCreatedAt: "2026-05-13T10:00:00Z",
  contractCreatedAt: "2026-05-13T10:30:00Z",
});

// ── 4. Havaianas / Beatriz — SIGNED (talent signed, waiting deposit) ──────────
const havaianasBooking = await ensureBookingContract({
  label: "Havaianas / Beatriz (signed, waiting deposit)",
  jobId: jobIds.contrato_assinado, jobTitle: "Campanha Havaianas — Redes Sociais Verão",
  agencyId: ownerId, talentId: beatrizId,
  bookingStatus: "pending", contractStatus: "signed",
  amount: 7200, commission: 720, net: 6480, commissionPct: 10,
  jobDate: "2026-07-08", location: "Rio de Janeiro, RJ",
  description: "Conteúdo para redes sociais da Havaianas.",
  signedAt: "2026-05-14T09:00:00Z",
  bookingCreatedAt: "2026-05-12T15:00:00Z",
  contractCreatedAt: "2026-05-12T15:30:00Z",
});

// ── 5. Samsung Galaxy / Rafael — CONFIRMED (escrow, booking TODAY) ────────────
const samsungBooking = await ensureBookingContract({
  label: "Samsung Galaxy / Rafael (confirmed, happening today)",
  jobId: jobIds.escrow_funded, jobTitle: "TVC Samsung Galaxy — Jovem Conectado",
  agencyId: ownerId, talentId: rafaelId,
  bookingStatus: "confirmed", contractStatus: "confirmed",
  amount: 18000, commission: 1800, net: 16200, commissionPct: 10,
  jobDate: "2026-05-16", location: "São Paulo, SP",
  description: "Comercial de TV para lançamento Samsung Galaxy.",
  signedAt: "2026-05-08T11:00:00Z",
  depositAt: "2026-05-09T14:00:00Z",
  bookingCreatedAt: "2026-05-07T10:00:00Z",
  contractCreatedAt: "2026-05-07T10:30:00Z",
});

// ── 6. Job cancelado / Lucas ──────────────────────────────────────────────────
const canceladoBooking = await ensureBookingContract({
  label: "Natura Chronos / Lucas (cancelled)",
  jobId: jobIds.job_cancelado, jobTitle: "Ensaio Produto Natura — Chronos",
  agencyId: ownerId, talentId: lucasId,
  bookingStatus: "cancelled", contractStatus: "cancelled",
  amount: 3500, commission: 350, net: 3150, commissionPct: 10,
  jobDate: "2026-05-30", location: "São Paulo, SP",
  description: "Ensaio para produto Natura Chronos.",
  bookingCreatedAt: "2026-05-05T09:00:00Z",
  contractCreatedAt: "2026-05-05T09:30:00Z",
});

// ── 7. Foto Ecommerce / Isabela — PAID (quick small booking) ─────────────────
const ecommerceBooking = await ensureBookingContract({
  label: "Foto Ecommerce / Isabela (paid, quick)",
  jobId: jobIds.foto_ecommerce, jobTitle: "Foto Produto Ecommerce — Linha Infantil",
  agencyId: agencyId, talentId: isabelaId,
  bookingStatus: "paid", contractStatus: "paid",
  amount: 1200, commission: 240, net: 960, commissionPct: 20,
  jobDate: "2026-05-14", location: "São Paulo, SP",
  description: "Fotos de produto para ecommerce.",
  signedAt: "2026-05-13T08:00:00Z",
  depositAt: "2026-05-13T09:00:00Z",
  paidAt: "2026-05-14T18:00:00Z",
  bookingCreatedAt: "2026-05-12T14:00:00Z",
  contractCreatedAt: "2026-05-12T14:30:00Z",
});

// ── 8. Camila — PAID high-value historical (multiple completed contracts) ──────
// First completed contract for Camila
{
  const existing = await bookingExists(jobIds.comercial_itau, camilaId);
  if (!existing) {
    // Need a second paid booking on a different job — reuse booking_realizado for Camila
  }
}

// Camila / SPFW — second talent on the desfile job (CONFIRMED, payout pending)
{
  const existing = await bookingExists(jobIds.booking_realizado, camilaId);
  if (!existing) {
    const { data: booking, error: bErr } = await sb.from("bookings").insert({
      job_id: jobIds.booking_realizado,
      job_title: "Desfile SPFW — Coleção Outono-Inverno",
      agency_id: ownerId,
      talent_user_id: camilaId,
      status: "confirmed",
      created_at: "2026-05-02T12:00:00Z",
    }).select("id").single();
    check("booking Camila SPFW", bErr);

    const { data: contract, error: cErr } = await sb.from("contracts").insert({
      booking_id: booking.id,
      job_id: jobIds.booking_realizado,
      agency_id: ownerId,
      talent_user_id: camilaId,
      job_title: "Desfile SPFW — Coleção Outono-Inverno",
      payment_amount: 11000,
      commission_amount: 1100,
      net_amount: 9900,
      commission_percent: 10,
      status: "confirmed",
      job_date: "2026-05-10",
      location: "São Paulo, SP",
      job_description: "Desfile no São Paulo Fashion Week.",
      signed_at: "2026-05-03T16:00:00Z",
      agency_signed_at: "2026-05-03T16:00:00Z",
      deposit_paid_at: "2026-05-04T11:00:00Z",
      created_at: "2026-05-02T12:30:00Z",
    }).select("id").single();
    check("contract Camila SPFW", cErr);

    console.log(`  + created: Camila SPFW (booking ${booking.id})`);
  } else {
    console.log(`  ✓ booking exists: Camila SPFW`);
  }
}

// ─── Step 10: Wallet transactions ─────────────────────────────────────────────

console.log("\n[10/13] Creating wallet transactions…");

const walletTxDefs = [
  // Sofia — payout for Itaú job
  {
    user_id: sofiaId, type: "payout", amount: 22500,
    description: "Pagamento — Comercial TV Banco Itaú",
    idempotency_key: "demo-payout-itau-sofia",
    created_at: "2026-04-21T16:05:00Z",
  },
  // Owner — escrow lock for Editorial Inverno (SPFW Beatriz)
  {
    user_id: ownerId, type: "escrow", amount: 11000,
    description: "Custódia — Desfile SPFW / Beatriz Santos",
    idempotency_key: "demo-escrow-spfw-beatriz",
    created_at: "2026-05-04T10:05:00Z",
  },
  // Owner — escrow lock for Samsung Galaxy (Rafael)
  {
    user_id: ownerId, type: "escrow", amount: 18000,
    description: "Custódia — TVC Samsung Galaxy / Rafael Souza",
    idempotency_key: "demo-escrow-samsung-rafael",
    created_at: "2026-05-09T14:10:00Z",
  },
  // Owner — escrow lock for SPFW Camila
  {
    user_id: ownerId, type: "escrow", amount: 11000,
    description: "Custódia — Desfile SPFW / Camila Rocha",
    idempotency_key: "demo-escrow-spfw-camila",
    created_at: "2026-05-04T11:10:00Z",
  },
  // Camila — large historical payout (she has high earnings)
  {
    user_id: camilaId, type: "payout", amount: 18900,
    description: "Pagamento — Campanha Editorial Vogue Brasil",
    idempotency_key: "demo-payout-vogue-camila",
    created_at: "2026-03-15T14:00:00Z",
  },
  // Rafael — payout for Samsung (released)
  {
    user_id: rafaelId, type: "payout", amount: 7650,
    description: "Pagamento — TVC LG Smart TV (contrato anterior)",
    idempotency_key: "demo-payout-lg-rafael",
    created_at: "2026-04-05T11:00:00Z",
  },
  // Isabela — first payout (small ecommerce job)
  {
    user_id: isabelaId, type: "payout", amount: 960,
    description: "Pagamento — Foto Produto Ecommerce",
    idempotency_key: "demo-payout-ecommerce-isabela",
    created_at: "2026-05-14T18:10:00Z",
  },
  // Owner — deposit to wallet (loaded balance for demos)
  {
    user_id: ownerId, type: "deposit", amount: 50000,
    description: "Depósito via PIX — Operações Q2 2026",
    idempotency_key: "demo-deposit-owner-q2",
    created_at: "2026-04-01T08:00:00Z",
  },
  {
    user_id: ownerId, type: "deposit", amount: 20000,
    description: "Depósito via PIX — Reforço orçamento maio",
    idempotency_key: "demo-deposit-owner-maio",
    created_at: "2026-05-02T08:00:00Z",
  },
  // Beatriz — historical payout
  {
    user_id: beatrizId, type: "payout", amount: 850,
    description: "Pagamento — Ensaio Lifestyle Vivo",
    idempotency_key: "demo-payout-vivo-beatriz",
    created_at: "2026-03-20T15:00:00Z",
  },
  // Refund/release example — cancelled Natura job
  {
    user_id: ownerId, type: "refund", amount: 3500,
    description: "Estorno — Ensaio Natura Chronos cancelado",
    idempotency_key: "demo-refund-natura-chronos",
    created_at: "2026-05-06T09:00:00Z",
  },
  // Sofia escrow for sent contract
  {
    user_id: ownerId, type: "escrow", amount: 4500,
    description: "Custódia — Spot Rádio Bradesco / Sofia Andrade",
    idempotency_key: "demo-escrow-bradesco-sofia",
    created_at: "2026-05-13T11:00:00Z",
  },
];

let walletCount = 0;
for (const tx of walletTxDefs) {
  const { data: existing } = await sb
    .from("wallet_transactions")
    .select("id")
    .eq("idempotency_key", tx.idempotency_key)
    .maybeSingle();

  if (existing) continue;

  const { error } = await sb.from("wallet_transactions").insert(tx);
  check(`wallet_tx ${tx.idempotency_key}`, error);
  walletCount++;
}
console.log(`  ✓ ${walletCount} wallet transactions inserted`);

// ─── Step 11: Agent wallet transactions ───────────────────────────────────────

console.log("\n[11/13] Creating agent wallet ledger…");

const agentWalletDefs = [
  // Agent1 — initial allocation Q2
  {
    workspace_id: workspaceId, agent_user_id: agent1Id, owner_user_id: ownerId,
    type: "allocation", amount: 60000, status: "completed",
    note: "Orçamento Q2 2026 — Agente Principal",
    created_by: ownerId, created_at: "2026-04-01T09:00:00Z",
  },
  // Agent2 — initial allocation
  {
    workspace_id: workspaceId, agent_user_id: agent2Id, owner_user_id: ownerId,
    type: "allocation", amount: 30000, status: "completed",
    note: "Orçamento Q2 2026 — Agente Júnior",
    created_by: ownerId, created_at: "2026-04-01T09:15:00Z",
  },
  // Agent1 — partial reversal (returned unused budget)
  {
    workspace_id: workspaceId, agent_user_id: agent1Id, owner_user_id: ownerId,
    type: "allocation_reversal", amount: 5000, status: "completed",
    note: "Devolução de saldo não utilizado — Março 2026",
    created_by: ownerId, created_at: "2026-04-01T09:30:00Z",
  },
  // Agent1 — commitment for Itaú job
  {
    workspace_id: workspaceId, agent_user_id: agent1Id, owner_user_id: ownerId,
    type: "job_commitment", amount: 25000, status: "completed",
    related_job_id: jobIds.comercial_itau,
    note: "Reserva orçamentária — Comercial TV Banco Itaú",
    created_by: agent1Id, created_at: "2026-04-10T09:30:00Z",
  },
  // Agent1 — settlement for Itaú job (paid)
  {
    workspace_id: workspaceId, agent_user_id: agent1Id, owner_user_id: ownerId,
    type: "job_settlement", amount: 25000, status: "completed",
    related_job_id: jobIds.comercial_itau,
    note: "Liquidação — Comercial TV Banco Itaú (pago)",
    created_by: ownerId, created_at: "2026-04-21T16:10:00Z",
  },
  // Agent1 — commitment for Samsung job
  {
    workspace_id: workspaceId, agent_user_id: agent1Id, owner_user_id: ownerId,
    type: "job_commitment", amount: 18000, status: "completed",
    related_job_id: jobIds.escrow_funded,
    note: "Reserva orçamentária — TVC Samsung Galaxy",
    created_by: agent1Id, created_at: "2026-05-07T10:30:00Z",
  },
  // Agent1 — commitment for Natura (cancelled, then reversed)
  {
    workspace_id: workspaceId, agent_user_id: agent1Id, owner_user_id: ownerId,
    type: "job_commitment", amount: 3500, status: "completed",
    related_job_id: jobIds.job_cancelado,
    note: "Reserva orçamentária — Ensaio Natura Chronos",
    created_by: agent1Id, created_at: "2026-05-05T09:30:00Z",
  },
  // Agent1 — refund of cancelled commitment
  {
    workspace_id: workspaceId, agent_user_id: agent1Id, owner_user_id: ownerId,
    type: "refund", amount: 3500, status: "completed",
    related_job_id: jobIds.job_cancelado,
    note: "Estorno — Ensaio Natura Chronos cancelado",
    created_by: ownerId, created_at: "2026-05-06T09:10:00Z",
  },
  // Agent2 — commitment for Casting Ativo
  {
    workspace_id: workspaceId, agent_user_id: agent2Id, owner_user_id: ownerId,
    type: "job_commitment", amount: 15000, status: "completed",
    related_job_id: jobIds.casting_ativo,
    note: "Reserva orçamentária — Campanha Natura Ekos",
    created_by: agent2Id, created_at: "2026-05-08T14:00:00Z",
  },
  // Agent1 — Bradesco radio spot commitment
  {
    workspace_id: workspaceId, agent_user_id: agent1Id, owner_user_id: ownerId,
    type: "job_commitment", amount: 4500, status: "completed",
    related_job_id: jobIds.contrato_enviado,
    note: "Reserva orçamentária — Spot Rádio Bradesco",
    created_by: agent1Id, created_at: "2026-05-13T10:30:00Z",
  },
];

let agentWalletCount = 0;
for (const tx of agentWalletDefs) {
  // Idempotency: check by workspace + agent + type + note
  const { data: existing } = await sb
    .from("premium_agent_wallet_transactions")
    .select("id")
    .eq("workspace_id", tx.workspace_id)
    .eq("agent_user_id", tx.agent_user_id)
    .eq("type", tx.type)
    .eq("note", tx.note)
    .maybeSingle();

  if (existing) continue;

  const { error } = await sb.from("premium_agent_wallet_transactions").insert(tx);
  check(`agent_wallet ${tx.type}/${tx.note}`, error);
  agentWalletCount++;
}
console.log(`  ✓ ${agentWalletCount} agent wallet entries inserted`);

// ─── Step 12: Submissions ─────────────────────────────────────────────────────

console.log("\n[12/13] Creating submissions…");

const submissionDefs = [
  // Job: casting_ativo (Natura) — multiple pending
  { job_id: jobIds.casting_ativo, talent_user_id: sofiaId,   status: "pending",  created_at: "2026-05-08T09:00:00Z" },
  { job_id: jobIds.casting_ativo, talent_user_id: camilaId,  status: "pending",  created_at: "2026-05-08T10:00:00Z" },
  { job_id: jobIds.casting_ativo, talent_user_id: rafaelId,  status: "pending",  created_at: "2026-05-09T11:00:00Z" },
  { job_id: jobIds.casting_ativo, talent_user_id: beatrizId, status: "pending",  created_at: "2026-05-09T14:00:00Z" },
  // Job: talento_selecionado (FARM lookbook) — mix approved/rejected
  { job_id: jobIds.talento_selecionado, talent_user_id: sofiaId,   status: "approved", created_at: "2026-05-04T10:00:00Z" },
  { job_id: jobIds.talento_selecionado, talent_user_id: beatrizId, status: "rejected", created_at: "2026-05-04T11:00:00Z" },
  { job_id: jobIds.talento_selecionado, talent_user_id: isabelaId, status: "rejected", created_at: "2026-05-05T09:00:00Z" },
  { job_id: jobIds.talento_selecionado, talent_user_id: camilaId,  status: "approved", created_at: "2026-05-05T10:00:00Z" },
  // Job: campanha_nike — several under review
  { job_id: jobIds.campanha_nike, talent_user_id: rafaelId,  status: "pending",  created_at: "2026-05-10T09:00:00Z" },
  { job_id: jobIds.campanha_nike, talent_user_id: lucasId,   status: "pending",  created_at: "2026-05-10T10:00:00Z" },
  { job_id: jobIds.campanha_nike, talent_user_id: camilaId,  status: "pending",  created_at: "2026-05-11T08:00:00Z" },
  { job_id: jobIds.campanha_nike, talent_user_id: sofiaId,   status: "pending",  created_at: "2026-05-11T09:00:00Z" },
  { job_id: jobIds.campanha_nike, talent_user_id: beatrizId, status: "pending",  created_at: "2026-05-11T10:00:00Z" },
  // Job: book_feminino — pending
  { job_id: jobIds.book_feminino, talent_user_id: beatrizId, status: "pending",  created_at: "2026-05-10T09:00:00Z" },
  { job_id: jobIds.book_feminino, talent_user_id: isabelaId, status: "pending",  created_at: "2026-05-10T11:00:00Z" },
  // Job: escrow_funded (Samsung) — approved Rafael, rejected Lucas
  { job_id: jobIds.escrow_funded, talent_user_id: rafaelId, status: "approved",  created_at: "2026-05-07T09:00:00Z" },
  { job_id: jobIds.escrow_funded, talent_user_id: lucasId,  status: "rejected",  created_at: "2026-05-07T10:00:00Z" },
  // Job: contrato_assinado (Havaianas) — approved Beatriz
  { job_id: jobIds.contrato_assinado, talent_user_id: beatrizId, status: "approved", created_at: "2026-05-12T14:00:00Z" },
  // Lucas — rejected application on high-budget job (shows rejection state)
  { job_id: jobIds.talento_selecionado, talent_user_id: lucasId, status: "rejected", created_at: "2026-05-04T15:00:00Z" },
];

let submissionCount = 0;
for (const sub of submissionDefs) {
  const existing = await submissionExists(sub.job_id, sub.talent_user_id);
  if (existing) continue;

  const { error } = await sb.from("submissions").insert({
    job_id: sub.job_id,
    talent_user_id: sub.talent_user_id,
    status: sub.status,
    created_at: sub.created_at,
  });
  check(`submission ${sub.talent_user_id}`, error);
  submissionCount++;
}
console.log(`  ✓ ${submissionCount} submissions inserted`);

// ─── Step 13: Notifications ───────────────────────────────────────────────────

console.log("\n[13/13] Creating notifications…");

const notifDefs = [
  // ── Owner notifications ────────────────────────────────────────────────────
  { user_id: ownerId, type: "contract_paid",     is_read: true,  created_at: "2026-04-21T16:15:00Z",
    title: "Contrato pago com sucesso",
    body:  "O pagamento do Comercial TV Banco Itaú foi liberado para Sofia Andrade. R$ 22.500,00." },

  { user_id: ownerId, type: "contract_escrowed", is_read: true,  created_at: "2026-05-04T10:10:00Z",
    title: "Depósito confirmado — Desfile SPFW",
    body:  "R$ 11.000,00 em custódia para Desfile SPFW / Beatriz Santos. Vaga em 10/05." },

  { user_id: ownerId, type: "contract_escrowed", is_read: false, created_at: "2026-05-09T14:15:00Z",
    title: "Depósito confirmado — TVC Samsung",
    body:  "R$ 18.000,00 em custódia para TVC Samsung Galaxy / Rafael Souza. Gravação HOJE." },

  { user_id: ownerId, type: "contract_signed",   is_read: true,  created_at: "2026-05-03T14:05:00Z",
    title: "Beatriz Santos assinou o contrato",
    body:  "Contrato para Desfile SPFW — Coleção Outono-Inverno assinado. Aguardando depósito." },

  { user_id: ownerId, type: "contract_signed",   is_read: false, created_at: "2026-05-14T09:05:00Z",
    title: "Beatriz Santos assinou o contrato",
    body:  "Contrato para Campanha Havaianas — Redes Sociais assinado. Realize o depósito para confirmar." },

  { user_id: ownerId, type: "new_submission",    is_read: false, created_at: "2026-05-11T09:05:00Z",
    title: "5 candidaturas — Campanha Nike",
    body:  "Rafael, Lucas, Camila, Sofia e Beatriz se candidataram para Campanha Global Nike." },

  { user_id: ownerId, type: "new_submission",    is_read: false, created_at: "2026-05-09T11:05:00Z",
    title: "Nova candidatura — Campanha Natura",
    body:  "Rafael Souza se candidatou para Campanha Natura Ekos Verão 2026." },

  { user_id: ownerId, type: "job_expiring",      is_read: false, created_at: "2026-05-15T08:00:00Z",
    title: "Vaga expirando em breve",
    body:  "Spot Rádio Bradesco — Voz Feminina encerra em 10 dias. Sofia Andrade ainda não assinou." },

  { user_id: ownerId, type: "invite_accepted",   is_read: true,  created_at: "2026-05-06T10:00:00Z",
    title: "Camila Rocha aceitou o convite",
    body:  "Camila Rocha entrou no portal Aurora Casting como talento exclusivo." },

  { user_id: ownerId, type: "invite_accepted",   is_read: true,  created_at: "2026-05-07T11:00:00Z",
    title: "Isabela Costa aceitou o convite",
    body:  "Isabela Costa aceitou o convite e está disponível para vagas do workspace." },

  { user_id: ownerId, type: "booking_reminder",  is_read: false, created_at: "2026-05-15T07:00:00Z",
    title: "Lembrete: gravação AMANHÃ",
    body:  "TVC Samsung Galaxy com Rafael Souza está agendado para amanhã, 16/05. Set de gravação, São Paulo." },

  // ── Agent 1 notifications ──────────────────────────────────────────────────
  { user_id: agent1Id, type: "new_submission",    is_read: false, created_at: "2026-05-08T09:05:00Z",
    title: "Sofia Andrade se candidatou — Natura",
    body:  "Sofia Andrade enviou candidatura para Campanha Natura Ekos Verão 2026." },

  { user_id: agent1Id, type: "new_submission",    is_read: false, created_at: "2026-05-08T10:05:00Z",
    title: "Camila Rocha se candidatou — Natura",
    body:  "Camila Rocha enviou candidatura para Campanha Natura Ekos Verão 2026." },

  { user_id: agent1Id, type: "contract_sent",     is_read: true,  created_at: "2026-05-13T10:35:00Z",
    title: "Contrato enviado para Sofia Andrade",
    body:  "Contrato para Spot Rádio Bradesco — Voz Feminina enviado para assinatura." },

  { user_id: agent1Id, type: "contract_escrowed", is_read: false, created_at: "2026-05-09T14:15:00Z",
    title: "Pagamento confirmado — Samsung",
    body:  "Depósito de R$ 18.000,00 confirmado. TVC Samsung Galaxy em custódia." },

  { user_id: agent1Id, type: "booking_reminder",  is_read: false, created_at: "2026-05-15T07:00:00Z",
    title: "Gravação amanhã — Samsung Galaxy",
    body:  "Rafael Souza grava amanhã, 16/05. Confirme logística de set com a produção." },

  { user_id: agent1Id, type: "job_expiring",      is_read: false, created_at: "2026-05-15T08:00:00Z",
    title: "Assinatura pendente — Bradesco",
    body:  "Sofia ainda não assinou o contrato do Spot Rádio Bradesco. Vaga em 25/06." },

  // ── Agent 2 notifications ──────────────────────────────────────────────────
  { user_id: agent2Id, type: "new_submission",    is_read: false, created_at: "2026-05-09T11:00:00Z",
    title: "Rafael Souza se candidatou — Natura",
    body:  "Rafael Souza enviou candidatura para Campanha Natura Ekos Verão 2026." },

  { user_id: agent2Id, type: "new_submission",    is_read: false, created_at: "2026-05-09T14:05:00Z",
    title: "Beatriz Santos se candidatou — Natura",
    body:  "Beatriz Santos enviou candidatura para Campanha Natura Ekos Verão 2026." },

  // ── Sofia notifications ────────────────────────────────────────────────────
  { user_id: sofiaId, type: "payment_received",   is_read: true,  created_at: "2026-04-21T16:20:00Z",
    title: "Pagamento recebido — R$ 22.500",
    body:  "Você recebeu R$ 22.500,00 pelo Comercial TV Banco Itaú. Disponível na sua carteira." },

  { user_id: sofiaId, type: "contract_sent",      is_read: false, created_at: "2026-05-13T10:35:00Z",
    title: "Novo contrato para assinar",
    body:  "Aurora Casting enviou um contrato para Spot Rádio Bradesco — Voz Feminina. Valor: R$ 4.500,00." },

  { user_id: sofiaId, type: "submission_approved", is_read: true, created_at: "2026-05-05T10:30:00Z",
    title: "Candidatura aprovada — Lookbook FARM",
    body:  "Aurora Casting aprovou sua candidatura para Lookbook FARM Rio — Coleção Outono." },

  // ── Beatriz notifications ──────────────────────────────────────────────────
  { user_id: beatrizId, type: "submission_approved", is_read: true,  created_at: "2026-05-12T14:10:00Z",
    title: "Candidatura aprovada — Havaianas",
    body:  "Aurora Casting aprovou sua candidatura para Campanha Havaianas — Redes Sociais." },

  { user_id: beatrizId, type: "contract_sent",      is_read: true,  created_at: "2026-05-12T15:00:00Z",
    title: "Contrato para assinar — Havaianas",
    body:  "Contrato para Campanha Havaianas — Redes Sociais enviado. Valor líquido: R$ 6.480,00." },

  { user_id: beatrizId, type: "submission_rejected", is_read: true, created_at: "2026-05-04T11:30:00Z",
    title: "Candidatura não selecionada",
    body:  "Sua candidatura para Lookbook FARM Rio — Coleção Outono não foi selecionada desta vez." },

  { user_id: beatrizId, type: "booking_reminder",   is_read: false, created_at: "2026-05-04T12:00:00Z",
    title: "Booking confirmado — Desfile SPFW",
    body:  "Seu booking para Desfile SPFW foi confirmado. Data: 10/05/2026. São Paulo, SP." },

  // ── Camila notifications ───────────────────────────────────────────────────
  { user_id: camilaId, type: "invite_accepted",    is_read: true,  created_at: "2026-05-06T10:05:00Z",
    title: "Bem-vinda ao portal Aurora Casting",
    body:  "Você foi adicionada ao portal exclusivo da Aurora Casting. Explore as vagas disponíveis." },

  { user_id: camilaId, type: "submission_approved", is_read: false, created_at: "2026-05-05T10:30:00Z",
    title: "Candidatura aprovada — Lookbook FARM",
    body:  "Aurora Casting aprovou sua candidatura para Lookbook FARM Rio — Coleção Outono." },

  { user_id: camilaId, type: "booking_reminder",   is_read: false, created_at: "2026-05-04T12:00:00Z",
    title: "Booking confirmado — Desfile SPFW",
    body:  "Seu booking para Desfile SPFW foi confirmado. Data: 10/05/2026. São Paulo, SP." },

  // ── Rafael notifications ───────────────────────────────────────────────────
  { user_id: rafaelId, type: "submission_approved", is_read: true, created_at: "2026-05-07T09:30:00Z",
    title: "Candidatura aprovada — Samsung Galaxy",
    body:  "Aurora Casting aprovou sua candidatura para TVC Samsung Galaxy — Jovem Conectado." },

  { user_id: rafaelId, type: "contract_sent",      is_read: true,  created_at: "2026-05-07T10:30:00Z",
    title: "Contrato para assinar — Samsung",
    body:  "Contrato para TVC Samsung Galaxy enviado. Valor líquido: R$ 16.200,00." },

  { user_id: rafaelId, type: "contract_escrowed",  is_read: false, created_at: "2026-05-09T14:20:00Z",
    title: "Pagamento em custódia — Samsung",
    body:  "Aurora Casting realizou o depósito. Seu pagamento está protegido. Gravação: HOJE." },

  { user_id: rafaelId, type: "booking_reminder",   is_read: false, created_at: "2026-05-15T07:00:00Z",
    title: "Gravação amanhã — TVC Samsung",
    body:  "Lembrete: você tem gravação amanhã, 16/05. Set em São Paulo. Confirme presença." },

  { user_id: rafaelId, type: "submission_rejected", is_read: true, created_at: "2026-05-07T10:05:00Z",
    title: "Candidatura não selecionada",
    body:  "Sua candidatura para TVC Samsung Galaxy — vaga masculina 2 não foi selecionada." },

  // ── Lucas notifications ────────────────────────────────────────────────────
  { user_id: lucasId, type: "submission_rejected", is_read: true,  created_at: "2026-05-04T15:30:00Z",
    title: "Candidatura não selecionada",
    body:  "Sua candidatura para Lookbook FARM Rio — Coleção Outono não foi selecionada desta vez." },

  { user_id: lucasId, type: "submission_rejected", is_read: false, created_at: "2026-05-07T10:05:00Z",
    title: "Candidatura não selecionada",
    body:  "Sua candidatura para TVC Samsung Galaxy não foi selecionada desta vez." },

  { user_id: lucasId, type: "new_job",             is_read: false, created_at: "2026-05-10T09:00:00Z",
    title: "Nova vaga — Campanha Nike",
    body:  "Uma vaga da Campanha Global Nike — Sprint Brasil está disponível para você. Candidate-se agora." },

  // ── Isabela notifications ──────────────────────────────────────────────────
  { user_id: isabelaId, type: "invite_accepted",    is_read: true, created_at: "2026-05-07T11:05:00Z",
    title: "Bem-vinda ao portal Aurora Casting",
    body:  "Você foi adicionada ao portal exclusivo da Aurora Casting. Explore as vagas disponíveis." },

  { user_id: isabelaId, type: "payment_received",   is_read: true, created_at: "2026-05-14T18:15:00Z",
    title: "Primeiro pagamento recebido!",
    body:  "Parabéns! Você recebeu R$ 960,00 pela Foto Produto Ecommerce. Disponível na sua carteira." },

  { user_id: isabelaId, type: "submission_rejected", is_read: true, created_at: "2026-05-05T09:30:00Z",
    title: "Candidatura não selecionada",
    body:  "Sua candidatura para Lookbook FARM Rio não foi selecionada. Continue tentando!" },

  { user_id: isabelaId, type: "new_job",             is_read: false, created_at: "2026-05-15T09:00:00Z",
    title: "Nova vaga exclusiva para você",
    body:  "Teste de Câmera — Novos Rostos 2026 está disponível no portal Aurora Casting." },
];

let notifCount = 0;
for (const n of notifDefs) {
  const exists = await notifExists(n.user_id, n.type, n.title);
  if (exists) continue;

  const { error } = await sb.from("notifications").insert(n);
  check(`notification "${n.title}"`, error);
  notifCount++;
}
console.log(`  ✓ ${notifCount} notifications inserted`);

// ─── Done ─────────────────────────────────────────────────────────────────────

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              BrisaHub Demo Seed — Complete                       ║
╠══════════════════════════════════════════════════════════════════╣
║  Workspace:  Aurora Casting  (aurora-casting)                    ║
╠══════════════════════════════════════════════════════════════════╣
║  AGENCY / OWNER                                                  ║
║  demo-owner@brisahub.com          BrisaDemo@2026                 ║
║    premium / workspace owner                                     ║
║                                                                  ║
║  AGENTS (workspace)                                              ║
║  demo-agent@brisahub.com          BrisaDemo@2026                 ║
║  demo-agent-2@brisahub.com        BrisaDemo@2026                 ║
║                                                                  ║
║  TALENTS — PORTAL ONLY                                           ║
║  demo-talent-portal@brisahub.com  BrisaDemo@2026  Sofia Andrade  ║
║  demo-talent-camila@brisahub.com  BrisaDemo@2026  Camila Rocha   ║
║  demo-talent-isabela@brisahub.com BrisaDemo@2026  Isabela Costa  ║
║                                                                  ║
║  TALENTS — MARKETPLACE + PORTAL                                  ║
║  demo-talent-mkt@brisahub.com     BrisaDemo@2026  Beatriz Santos ║
║  demo-talent-rafael@brisahub.com  BrisaDemo@2026  Rafael Souza   ║
║  demo-talent@brisahub.com         BrisaDemo@2026  Lucas Mendes   ║
║                                                                  ║
║  EXTERNAL AGENCY                                                 ║
║  demo-agency@brisahub.com         BrisaDemo@2026                 ║
╠══════════════════════════════════════════════════════════════════╣
║  JOBS (13 total across 12 lifecycle states)                      ║
║   1. Teste Câmera Novos Rostos       open/no-applications        ║
║   2. Campanha Natura Ekos            open/active-casting         ║
║   3. Lookbook FARM Rio               open/talent-selected        ║
║   4. Spot Rádio Bradesco             open/contract-sent          ║
║   5. Campanha Havaianas              open/contract-signed        ║
║   6. TVC Samsung Galaxy              open/escrow-TODAY           ║
║   7. Desfile SPFW                    closed/awaiting-payout      ║
║   8. Comercial TV Banco Itaú         closed/paid-complete        ║
║   9. Ensaio Natura Chronos           cancelled                   ║
║  10. Hostess Evento Sebrae           closed/expired              ║
║  11. Campanha Global Nike            open/high-budget R$80k      ║
║  12. Foto Produto Ecommerce          closed/paid-quick           ║
║  13. Ensaio Book Feminino SP         open/public                 ║
╚══════════════════════════════════════════════════════════════════╝
`);
