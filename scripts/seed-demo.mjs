/**
 * BrisaHub Demo Seed
 *
 * Creates a realistic, premium demo environment for investor demos, videos,
 * and Acquire listings. Safe to re-run — fully idempotent via upsert/findOrCreate.
 *
 * Run: node scripts/seed-demo.mjs
 * Reset: node scripts/reset-demo.mjs
 *
 * All demo users share password: BrisaDemo@2026
 * All demo auth users have user_metadata.is_demo = true
 * All demo emails follow the pattern demo-*@brisahub.com
 */

import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findOrCreateUser({ email, password, role, metadata = {} }) {
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) {
    console.log(`  ✓ user exists: ${email} (${existing.id})`);
    return existing.id;
  }
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, is_demo: true, ...metadata },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  console.log(`  + created user: ${email} (${data.user.id})`);
  return data.user.id;
}

function check(label, error) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

// ─── Demo data definitions ────────────────────────────────────────────────────

const PASSWORD = "BrisaDemo@2026";

const USERS = {
  owner:        "demo-owner@brisahub.com",
  agent:        "demo-agent@brisahub.com",
  talentPortal: "demo-talent-portal@brisahub.com",
  talentMkt:    "demo-talent-mkt@brisahub.com",
  talent:       "demo-talent@brisahub.com",
  agency:       "demo-agency@brisahub.com",
};

// ─── Step 1: Auth users ───────────────────────────────────────────────────────

console.log("\n[1/9] Creating auth users…");

const ownerId        = await findOrCreateUser({ email: USERS.owner,        password: PASSWORD, role: "agency"  });
const agentId        = await findOrCreateUser({ email: USERS.agent,        password: PASSWORD, role: "agency"  });
const talentPortalId = await findOrCreateUser({ email: USERS.talentPortal, password: PASSWORD, role: "talent"  });
const talentMktId    = await findOrCreateUser({ email: USERS.talentMkt,    password: PASSWORD, role: "talent"  });
const talentId       = await findOrCreateUser({ email: USERS.talent,       password: PASSWORD, role: "talent"  });
const agencyId       = await findOrCreateUser({ email: USERS.agency,       password: PASSWORD, role: "agency"  });

// ─── Step 2: Profiles ─────────────────────────────────────────────────────────

console.log("\n[2/9] Upserting profiles…");

const profiles = [
  { id: ownerId,        role: "agency",  plan: "premium", plan_status: "active",   wallet_balance: 15750 },
  { id: agentId,        role: "agency",  plan: "free",    plan_status: "inactive", wallet_balance: 0     },
  { id: talentPortalId, role: "talent",  plan: "free",    plan_status: "inactive", wallet_balance: 4320  },
  { id: talentMktId,    role: "talent",  plan: "free",    plan_status: "inactive", wallet_balance: 850   },
  { id: talentId,       role: "talent",  plan: "free",    plan_status: "inactive", wallet_balance: 0     },
  { id: agencyId,       role: "agency",  plan: "free",    plan_status: "inactive", wallet_balance: 2100  },
];

for (const p of profiles) {
  const { error } = await sb.from("profiles").upsert(p, { onConflict: "id" });
  check(`profile ${p.id}`, error);
}
console.log(`  ✓ ${profiles.length} profiles upserted`);

// ─── Step 3: Agency rows ──────────────────────────────────────────────────────

console.log("\n[3/9] Upserting agency rows…");

const agencies = [
  { id: ownerId,  company_name: "Aurora Casting",    subscription_status: "active" },
  { id: agentId,  company_name: "Agente Demo",        subscription_status: "active" },
  { id: agencyId, company_name: "Creative Studio BR", subscription_status: "active" },
];

for (const a of agencies) {
  const { error } = await sb.from("agencies").upsert(a, { onConflict: "id" });
  check(`agency ${a.id}`, error);
}
console.log(`  ✓ ${agencies.length} agency rows upserted`);

// ─── Step 4: Talent profiles ──────────────────────────────────────────────────

console.log("\n[4/9] Upserting talent profiles…");

const talentProfiles = [
  {
    id: talentPortalId,
    user_id: talentPortalId,
    full_name: "Sofia Andrade",
    city: "São Paulo",
    country: "Brasil",
    bio: "Modelo editorial e comercial. 8 anos de experiência em publicidade e moda.",
    categories: ["moda", "editorial", "comercial"],
    age: 27,
    gender: "feminino",
    marketplace_visible: false,
    instagram: "@sofiaandrade",
  },
  {
    id: talentMktId,
    user_id: talentMktId,
    full_name: "Beatriz Santos",
    city: "Rio de Janeiro",
    country: "Brasil",
    bio: "Atriz e modelo. Especializada em campanhas de lifestyle e beleza.",
    categories: ["atuacao", "moda", "beleza"],
    age: 24,
    gender: "feminino",
    marketplace_visible: true,
    instagram: "@beatrizsantos.rj",
  },
  {
    id: talentId,
    user_id: talentId,
    full_name: "Lucas Mendes",
    city: "Curitiba",
    country: "Brasil",
    bio: "Modelo masculino. Especializado em moda fitness e esportiva.",
    categories: ["moda", "esportes", "fitness"],
    age: 29,
    gender: "masculino",
    marketplace_visible: true,
    instagram: "@lucasmendes.fit",
  },
];

for (const tp of talentProfiles) {
  const { error } = await sb.from("talent_profiles").upsert(tp, { onConflict: "id" });
  check(`talent_profile ${tp.full_name}`, error);
}
console.log(`  ✓ ${talentProfiles.length} talent profiles upserted`);

// ─── Step 5: Premium workspace ────────────────────────────────────────────────

console.log("\n[5/9] Creating premium workspace…");

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
    console.log(`  ✓ workspace exists: ${workspaceId}`);
  } else {
    const { data, error } = await sb
      .from("premium_workspaces")
      .insert({
        owner_user_id:       ownerId,
        agency_id:           ownerId,
        name:                "Aurora Casting",
        slug:                "aurora-casting",
        brand_primary_color: "#7C3AED",
        brand_accent_color:  "#A855F7",
        welcome_message:     "Bem-vindo ao portal exclusivo da Aurora Casting. Aqui você encontra as melhores oportunidades selecionadas para o seu perfil.",
        status:              "active",
        included_agent_seats: 2,
      })
      .select("id")
      .single();
    check("premium_workspaces insert", error);
    workspaceId = data.id;
    console.log(`  + created workspace: ${workspaceId}`);
  }
}

// ─── Step 6: Workspace members ────────────────────────────────────────────────

console.log("\n[6/9] Upserting workspace members…");

const members = [
  { workspace_id: workspaceId, user_id: ownerId,  role: "owner", status: "active", created_by: ownerId },
  { workspace_id: workspaceId, user_id: agentId,  role: "agent", status: "active", spending_limit: 10000, created_by: ownerId },
];

for (const m of members) {
  const { data: existing } = await sb
    .from("premium_workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", m.user_id)
    .is("removed_at", null)
    .maybeSingle();

  if (existing) {
    console.log(`  ✓ member exists: ${m.user_id} (${m.role})`);
    continue;
  }
  const { error } = await sb.from("premium_workspace_members").insert(m);
  check(`member ${m.role}`, error);
  console.log(`  + added member: ${m.user_id} (${m.role})`);
}

// ─── Step 7: Workspace talents ────────────────────────────────────────────────

console.log("\n[7/9] Upserting workspace talents…");

const portalTalents = [talentPortalId, talentMktId];

for (const tid of portalTalents) {
  const { data: existing } = await sb
    .from("premium_workspace_talents")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("talent_user_id", tid)
    .is("removed_at", null)
    .maybeSingle();

  if (existing) {
    console.log(`  ✓ portal talent exists: ${tid}`);
    continue;
  }
  const { error } = await sb.from("premium_workspace_talents").insert({
    workspace_id:   workspaceId,
    talent_user_id: tid,
    status:         "active",
    source:         "portal",
    invited_by:     ownerId,
  });
  check(`workspace talent ${tid}`, error);
  console.log(`  + added portal talent: ${tid}`);
}

// ─── Step 8: Jobs ─────────────────────────────────────────────────────────────

console.log("\n[8/9] Creating jobs…");

const jobDefs = [
  {
    _key: "editorial_inverno",
    title:        "Campanha Editorial Inverno 2026",
    description:  "Campanha editorial de inverno para coleção premium. Shooting em estúdio, 2 dias. Perfil sofisticado, elegante.",
    location:     "São Paulo, SP",
    status:       "open",
    visibility:   "private_invite",
    budget:       8500,
    gender:       "feminino",
    age_min:      22,
    age_max:      32,
    job_date:     "2026-06-15",
    talents_needed: 2,
    workspace_id: workspaceId,
    created_by_user_id: ownerId,
  },
  {
    _key: "catalogo_verao",
    title:        "Catálogo Verão Riachuelo 2027",
    description:  "Catálogo de verão. Looks de praia, casual e festas. 3 dias de shooting em locação externa.",
    location:     "Rio de Janeiro, RJ",
    status:       "open",
    visibility:   "workspace_only",
    budget:       12000,
    gender:       null,
    age_min:      20,
    age_max:      35,
    job_date:     "2026-07-03",
    talents_needed: 4,
    workspace_id: workspaceId,
    created_by_user_id: agentId,
  },
  {
    _key: "comercial_itau",
    title:        "Comercial TV Banco Itaú — Família",
    description:  "Comercial de TV nacional. Perfil família, transmitir confiança e modernidade. 1 dia de gravação.",
    location:     "São Paulo, SP",
    status:       "closed",
    visibility:   "private_invite",
    budget:       25000,
    gender:       null,
    age_min:      25,
    age_max:      45,
    job_date:     "2026-04-20",
    talents_needed: 3,
    workspace_id: workspaceId,
    created_by_user_id: ownerId,
  },
  {
    _key: "book_feminino",
    title:        "Ensaio Book Feminino SP — Verão",
    description:  "Book fotográfico de verão. Ambiente descontraído, ótimo para renovar portfólio.",
    location:     "São Paulo, SP",
    status:       "open",
    visibility:   "public",
    budget:       1800,
    gender:       "feminino",
    age_min:      18,
    age_max:      35,
    job_date:     "2026-06-28",
    talents_needed: 1,
    workspace_id: null,
    created_by_user_id: agencyId,
  },
];

const jobIds = {};

for (const def of jobDefs) {
  const key = def._key;
  const payload = { ...def };
  delete payload._key;

  // Check if job with same title and workspace already exists
  const { data: existing } = await sb
    .from("jobs")
    .select("id")
    .eq("title", payload.title)
    .eq("created_by_user_id", payload.created_by_user_id)
    .maybeSingle();

  if (existing) {
    jobIds[key] = existing.id;
    console.log(`  ✓ job exists: "${payload.title}" (${existing.id})`);
    continue;
  }

  const { data, error } = await sb
    .from("jobs")
    .insert({ ...payload, agency_id: payload.created_by_user_id })
    .select("id")
    .single();
  check(`job "${payload.title}"`, error);
  jobIds[key] = data.id;
  console.log(`  + created job: "${payload.title}" (${data.id})`);
}

// ─── Step 9: Bookings + Contracts + Wallet ────────────────────────────────────

console.log("\n[9/9] Creating bookings, contracts, and wallet entries…");

// ── 9a. Comercial Itaú — PAID contract (Sofia, complete lifecycle) ────────────

{
  const label = "Comercial Itaú / Sofia (paid)";

  const { data: existingBooking } = await sb
    .from("bookings")
    .select("id, contracts(id)")
    .eq("job_id", jobIds.comercial_itau)
    .eq("talent_user_id", talentPortalId)
    .maybeSingle();

  if (existingBooking) {
    console.log(`  ✓ booking exists: ${label}`);
  } else {
    // Booking: paid
    const { data: booking, error: bErr } = await sb
      .from("bookings")
      .insert({
        job_id:         jobIds.comercial_itau,
        job_title:      "Comercial TV Banco Itaú — Família",
        agency_id:      ownerId,
        talent_user_id: talentPortalId,
        status:         "paid",
        created_at:     "2026-04-10T09:00:00Z",
      })
      .select("id")
      .single();
    check(`booking ${label}`, bErr);

    // Contract: paid
    const { data: contract, error: cErr } = await sb
      .from("contracts")
      .insert({
        booking_id:        booking.id,
        job_id:            jobIds.comercial_itau,
        agency_id:         ownerId,
        talent_user_id:    talentPortalId,
        job_title:         "Comercial TV Banco Itaú — Família",
        payment_amount:    25000,
        commission_amount: 2500,
        net_amount:        22500,
        commission_percent: 10,
        status:            "paid",
        job_date:          "2026-04-20",
        location:          "São Paulo, SP",
        job_description:   "Comercial de TV nacional. Perfil família.",
        signed_at:         "2026-04-11T10:00:00Z",
        agency_signed_at:  "2026-04-11T10:00:00Z",
        deposit_paid_at:   "2026-04-12T14:00:00Z",
        paid_at:           "2026-04-21T16:00:00Z",
        created_at:        "2026-04-10T09:30:00Z",
      })
      .select("id")
      .single();
    check(`contract ${label}`, cErr);

    // Talent payout wallet transaction
    const { error: wtErr } = await sb.from("wallet_transactions").insert({
      user_id:         talentPortalId,
      type:            "payout",
      amount:          22500,
      description:     "Pagamento — Comercial TV Banco Itaú",
      reference_id:    contract.id,
      idempotency_key: `demo-payout-itau-sofia-${contract.id}`,
      created_at:      "2026-04-21T16:05:00Z",
    });
    check(`wallet_transaction payout ${label}`, wtErr);

    // Agent wallet: job_commitment + job_settlement (agent was the one who created the job)
    const { error: awcErr } = await sb.from("premium_agent_wallet_transactions").insert({
      workspace_id:       workspaceId,
      agent_user_id:      agentId,
      owner_user_id:      ownerId,
      type:               "job_commitment",
      amount:             25000,
      status:             "completed",
      related_job_id:     jobIds.comercial_itau,
      related_contract_id: null,
      note:               "Reserva orçamentária — Comercial TV Banco Itaú",
      created_by:         agentId,
      created_at:         "2026-04-10T09:30:00Z",
    });
    check(`agent wallet commitment ${label}`, awcErr);

    const { error: awsErr } = await sb.from("premium_agent_wallet_transactions").insert({
      workspace_id:        workspaceId,
      agent_user_id:       agentId,
      owner_user_id:       ownerId,
      type:                "job_settlement",
      amount:              25000,
      status:              "completed",
      related_job_id:      jobIds.comercial_itau,
      related_contract_id: contract.id,
      note:                "Liquidação — Comercial TV Banco Itaú pago",
      created_by:          ownerId,
      created_at:          "2026-04-21T16:10:00Z",
    });
    check(`agent wallet settlement ${label}`, awsErr);

    console.log(`  + created: ${label} (booking ${booking.id}, contract ${contract.id})`);
  }
}

// ── 9b. Editorial Inverno — CONFIRMED contract (Beatriz, in escrow) ───────────

{
  const label = "Editorial Inverno / Beatriz (confirmed)";

  const { data: existingBooking } = await sb
    .from("bookings")
    .select("id")
    .eq("job_id", jobIds.editorial_inverno)
    .eq("talent_user_id", talentMktId)
    .maybeSingle();

  if (existingBooking) {
    console.log(`  ✓ booking exists: ${label}`);
  } else {
    const { data: booking, error: bErr } = await sb
      .from("bookings")
      .insert({
        job_id:         jobIds.editorial_inverno,
        job_title:      "Campanha Editorial Inverno 2026",
        agency_id:      ownerId,
        talent_user_id: talentMktId,
        status:         "confirmed",
        created_at:     "2026-05-02T11:00:00Z",
      })
      .select("id")
      .single();
    check(`booking ${label}`, bErr);

    const { data: contract, error: cErr } = await sb
      .from("contracts")
      .insert({
        booking_id:         booking.id,
        job_id:             jobIds.editorial_inverno,
        agency_id:          ownerId,
        talent_user_id:     talentMktId,
        job_title:          "Campanha Editorial Inverno 2026",
        payment_amount:     8500,
        commission_amount:  850,
        net_amount:         7650,
        commission_percent: 10,
        status:             "confirmed",
        job_date:           "2026-06-15",
        location:           "São Paulo, SP",
        job_description:    "Campanha editorial de inverno para coleção premium.",
        signed_at:          "2026-05-03T14:00:00Z",
        agency_signed_at:   "2026-05-03T14:00:00Z",
        deposit_paid_at:    "2026-05-04T10:00:00Z",
        created_at:         "2026-05-02T11:30:00Z",
      })
      .select("id")
      .single();
    check(`contract ${label}`, cErr);

    // Escrow wallet transaction (owner's balance is held)
    const { error: wtErr } = await sb.from("wallet_transactions").insert({
      user_id:         ownerId,
      type:            "escrow",
      amount:          8500,
      description:     "Custódia — Campanha Editorial Inverno 2026",
      reference_id:    contract.id,
      idempotency_key: `demo-escrow-editorial-beatriz-${contract.id}`,
      created_at:      "2026-05-04T10:05:00Z",
    });
    check(`wallet_transaction escrow ${label}`, wtErr);

    console.log(`  + created: ${label} (booking ${booking.id}, contract ${contract.id})`);
  }
}

// ── 9c. Catálogo Verão — SENT contract (Sofia, awaiting signature) ────────────

{
  const label = "Catálogo Verão / Sofia (sent)";

  const { data: existingBooking } = await sb
    .from("bookings")
    .select("id")
    .eq("job_id", jobIds.catalogo_verao)
    .eq("talent_user_id", talentPortalId)
    .maybeSingle();

  if (existingBooking) {
    console.log(`  ✓ booking exists: ${label}`);
  } else {
    const { data: booking, error: bErr } = await sb
      .from("bookings")
      .insert({
        job_id:         jobIds.catalogo_verao,
        job_title:      "Catálogo Verão Riachuelo 2027",
        agency_id:      ownerId,
        talent_user_id: talentPortalId,
        status:         "pending",
        created_at:     "2026-05-12T15:00:00Z",
      })
      .select("id")
      .single();
    check(`booking ${label}`, bErr);

    const { error: cErr } = await sb.from("contracts").insert({
      booking_id:         booking.id,
      job_id:             jobIds.catalogo_verao,
      agency_id:          ownerId,
      talent_user_id:     talentPortalId,
      job_title:          "Catálogo Verão Riachuelo 2027",
      payment_amount:     12000,
      commission_amount:  1200,
      net_amount:         10800,
      commission_percent: 10,
      status:             "sent",
      job_date:           "2026-07-03",
      location:           "Rio de Janeiro, RJ",
      job_description:    "Catálogo de verão. Looks de praia, casual e festas.",
      created_at:         "2026-05-12T15:30:00Z",
    });
    check(`contract ${label}`, cErr);

    console.log(`  + created: ${label} (booking ${booking.id})`);
  }
}

// ── 9d. Agent wallet: allocation row (owner granted budget to agent) ──────────

{
  const { data: existing } = await sb
    .from("premium_agent_wallet_transactions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("agent_user_id", agentId)
    .eq("type", "allocation")
    .maybeSingle();

  if (existing) {
    console.log("  ✓ agent allocation exists");
  } else {
    const { error } = await sb.from("premium_agent_wallet_transactions").insert({
      workspace_id:   workspaceId,
      agent_user_id:  agentId,
      owner_user_id:  ownerId,
      type:           "allocation",
      amount:         50000,
      status:         "completed",
      note:           "Orçamento inicial — Q2 2026",
      created_by:     ownerId,
      created_at:     "2026-04-01T09:00:00Z",
    });
    check("agent allocation", error);
    console.log("  + created: agent allocation R$50,000");
  }
}

// ── 9e. Submissions (job applications) ────────────────────────────────────────

{
  const submissionDefs = [
    { job_id: jobIds.editorial_inverno, talent_user_id: talentPortalId, status: "pending",  created_at: "2026-05-05T10:00:00Z" },
    { job_id: jobIds.editorial_inverno, talent_user_id: talentId,        status: "pending",  created_at: "2026-05-05T11:00:00Z" },
    { job_id: jobIds.catalogo_verao,    talent_user_id: talentMktId,     status: "approved", created_at: "2026-05-08T14:00:00Z" },
    { job_id: jobIds.book_feminino,     talent_user_id: talentMktId,     status: "pending",  created_at: "2026-05-10T09:00:00Z" },
  ];

  for (const sub of submissionDefs) {
    const { data: existing } = await sb
      .from("submissions")
      .select("id")
      .eq("job_id", sub.job_id)
      .eq("talent_user_id", sub.talent_user_id)
      .maybeSingle();

    if (existing) {
      console.log(`  ✓ submission exists: ${sub.talent_user_id} → ${sub.job_id}`);
      continue;
    }

    const { error } = await sb.from("submissions").insert({
      job_id:         sub.job_id,
      talent_user_id: sub.talent_user_id,
      status:         sub.status,
      created_at:     sub.created_at,
    });
    check(`submission ${sub.talent_user_id}`, error);
    console.log(`  + submission: ${sub.talent_user_id} → job`);
  }
}

// ── 9f. Notifications ─────────────────────────────────────────────────────────

{
  const notifDefs = [
    {
      user_id:    ownerId,
      title:      "Contrato pago com sucesso",
      body:       "O pagamento do Comercial TV Banco Itaú foi liberado para Sofia Andrade.",
      type:       "contract_paid",
      is_read:    true,
      created_at: "2026-04-21T16:15:00Z",
    },
    {
      user_id:    ownerId,
      title:      "Novo contrato em custódia",
      body:       "Depósito confirmado para Campanha Editorial Inverno 2026.",
      type:       "contract_escrowed",
      is_read:    false,
      created_at: "2026-05-04T10:10:00Z",
    },
    {
      user_id:    ownerId,
      title:      "Beatriz Santos aceitou o contrato",
      body:       "O contrato para Editorial Inverno 2026 foi assinado.",
      type:       "contract_signed",
      is_read:    false,
      created_at: "2026-05-03T14:05:00Z",
    },
    {
      user_id:    agentId,
      title:      "Nova candidatura recebida",
      body:       "Lucas Mendes se candidatou para Campanha Editorial Inverno 2026.",
      type:       "new_submission",
      is_read:    false,
      created_at: "2026-05-05T11:05:00Z",
    },
    {
      user_id:    agentId,
      title:      "Novo contrato enviado",
      body:       "Contrato para Catálogo Verão Riachuelo enviado para Sofia Andrade.",
      type:       "contract_sent",
      is_read:    true,
      created_at: "2026-05-12T15:35:00Z",
    },
    {
      user_id:    talentPortalId,
      title:      "Você tem um novo contrato para assinar",
      body:       "Aurora Casting enviou um contrato para Catálogo Verão Riachuelo 2027.",
      type:       "contract_sent",
      is_read:    false,
      created_at: "2026-05-12T15:35:00Z",
    },
    {
      user_id:    talentPortalId,
      title:      "Pagamento recebido",
      body:       "Você recebeu R$ 22.500,00 pelo Comercial TV Banco Itaú.",
      type:       "payment_received",
      is_read:    true,
      created_at: "2026-04-21T16:20:00Z",
    },
    {
      user_id:    talentMktId,
      title:      "Sua candidatura foi aprovada",
      body:       "Aurora Casting aprovou sua candidatura para Catálogo Verão Riachuelo 2027.",
      type:       "submission_approved",
      is_read:    false,
      created_at: "2026-05-08T14:10:00Z",
    },
    {
      user_id:    talentId,
      title:      "Nova vaga disponível para você",
      body:       "Uma nova vaga de editorial de inverno foi publicada. Candidate-se agora.",
      type:       "new_job",
      is_read:    false,
      created_at: "2026-05-01T09:00:00Z",
    },
  ];

  let notifCount = 0;
  for (const n of notifDefs) {
    const { data: existing } = await sb
      .from("notifications")
      .select("id")
      .eq("user_id", n.user_id)
      .eq("type", n.type)
      .eq("title", n.title)
      .maybeSingle();

    if (existing) continue;

    const { error } = await sb.from("notifications").insert(n);
    check(`notification "${n.title}"`, error);
    notifCount++;
  }
  console.log(`  ✓ ${notifCount} new notifications inserted (${notifDefs.length - notifCount} already existed)`);
}

// ─── Done ─────────────────────────────────────────────────────────────────────

console.log(`
╔══════════════════════════════════════════════════════════╗
║             BrisaHub Demo Seed Complete                  ║
╠══════════════════════════════════════════════════════════╣
║  Workspace:   Aurora Casting (aurora-casting)            ║
╠══════════════════════════════════════════════════════════╣
║  demo-owner@brisahub.com        BrisaDemo@2026           ║
║    → agency / premium / Aurora Casting owner             ║
║  demo-agent@brisahub.com        BrisaDemo@2026           ║
║    → agency / free / workspace agent                     ║
║  demo-talent-portal@brisahub.com  BrisaDemo@2026         ║
║    → talent / portal-only (Sofia Andrade)                ║
║  demo-talent-mkt@brisahub.com   BrisaDemo@2026           ║
║    → talent / marketplace (Beatriz Santos)               ║
║  demo-talent@brisahub.com       BrisaDemo@2026           ║
║    → talent / marketplace (Lucas Mendes)                 ║
║  demo-agency@brisahub.com       BrisaDemo@2026           ║
║    → agency / free / Creative Studio BR                  ║
╚══════════════════════════════════════════════════════════╝
`);
