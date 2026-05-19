const { createClient } = require("@supabase/supabase-js");
const { readFileSync } = require("node:fs");
const path = require("node:path");

type JsonRecord = Record<string, unknown>;
type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: JsonRecord | null;
};

type Scope = {
  users: AuthUser[];
  userIds: string[];
  workspaceRows: Array<JsonRecord>;
  workspaceIds: string[];
  agencyRows: Array<JsonRecord>;
  agencyIds: string[];
  talentRows: Array<JsonRecord>;
  talentIds: string[];
  jobRows: Array<JsonRecord>;
  jobIds: string[];
  submissionRows: Array<JsonRecord>;
  submissionIds: string[];
  presentationRows: Array<JsonRecord>;
  presentationIds: string[];
  presentationCandidateRows: Array<JsonRecord>;
  presentationCandidateIds: string[];
  presentationFeedbackRows: Array<JsonRecord>;
  presentationFeedbackIds: string[];
  notificationRows: Array<JsonRecord>;
  notificationIds: string[];
  supportConversationRows: Array<JsonRecord>;
  supportConversationIds: string[];
  supportMessageRows: Array<JsonRecord>;
  supportMessageIds: string[];
  jobInviteRows: Array<JsonRecord>;
  jobInviteIds: string[];
  jobInviteLinkRows: Array<JsonRecord>;
  jobInviteLinkIds: string[];
  premiumAgentInviteRows: Array<JsonRecord>;
  premiumAgentInviteIds: string[];
  referralInviteRows: Array<JsonRecord>;
  referralInviteIds: string[];
  agencyTalentHistoryRows: Array<JsonRecord>;
  agencyTalentHistoryIds: string[];
  contractRows: Array<JsonRecord>;
  contractIds: string[];
  bookingRows: Array<JsonRecord>;
  bookingIds: string[];
  walletTransactionRows: Array<JsonRecord>;
  walletTransactionIds: string[];
  walletFundingSourceRows: Array<JsonRecord>;
  walletFundingSourceIds: string[];
  walletWithdrawalAllocationRows: Array<JsonRecord>;
  walletWithdrawalAllocationIds: string[];
  premiumAgentWalletRows: Array<JsonRecord>;
  premiumAgentWalletIds: string[];
  workspaceMemberRows: Array<JsonRecord>;
  workspaceMemberIds: string[];
  workspaceTalentRows: Array<JsonRecord>;
  workspaceTalentIds: string[];
  pipelineNoteRows: Array<JsonRecord>;
  pipelineNoteIds: string[];
  profileIds: string[];
  storagePaths: Map<string, Set<string>>;
};

const ROOT = path.join(__dirname, "..");
const DEMO_PASSWORD = "123456";
const SEED_EMAILS = [
  "owner@brisahub.com",
  "agent@brisahub.com",
  "talent1@brisahub.com",
  "talent2@brisahub.com",
  "talent3@brisahub.com",
];
const SAFE_NAME_MARKERS = ["demo", "test", "aurora", "sofia", "camila"];
const SAFE_SEED_NAMES = [
  "BrisaHub Studio",
  "BrisaHub Workspace",
  "Bianca Martins",
  "Julia Ferreira",
  "Mateus Lima",
  "Lia Monteiro",
];
const SAFE_JOB_MARKERS = [
  "fashion editorial",
  "tv commercial",
  "social media campaign",
  "beauty campaign hold",
];

function loadEnvFile() {
  try {
    const envRaw = readFileSync(path.join(ROOT, ".env.local"), "utf8");
    for (const line of envRaw.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx < 0) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Best-effort local env loading.
  }
}

loadEnvFile();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const mode = process.argv[2] === "seed" ? "seed" : "reset";

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isSeedEmail(email: string | null | undefined) {
  return SEED_EMAILS.includes(normalizeText(email));
}

function hasSafeEmailMarker(email: string | null | undefined) {
  const normalized = normalizeText(email);
  return normalized.includes("demo") || normalized.includes("test") || isSeedEmail(normalized);
}

function hasMarker(value: unknown, markers: string[]) {
  const normalized = normalizeText(value);
  return normalized.length > 0 && markers.some((marker) => normalized.includes(marker));
}

function asId(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function chunk<T>(values: T[], size = 100) {
  const output: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }
  return output;
}

function addStoragePath(storagePaths: Map<string, Set<string>>, bucket: string, rawValue: unknown) {
  const value = String(rawValue ?? "").trim();
  if (!value) return;

  const patterns = [
    new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`),
    new RegExp(`/storage/v1/object/sign/${bucket}/(.+?)(?:\\?|$)`),
    new RegExp(`/storage/v1/object/authenticated/${bucket}/(.+?)(?:\\?|$)`),
  ];

  let resolvedPath = value;
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) {
      resolvedPath = decodeURIComponent(match[1]);
      break;
    }
  }

  if (resolvedPath.startsWith("http://") || resolvedPath.startsWith("https://")) return;

  if (!storagePaths.has(bucket)) storagePaths.set(bucket, new Set<string>());
  storagePaths.get(bucket)?.add(resolvedPath.replace(/^\/+/, ""));
}

async function listAllAuthUsers() {
  const users: AuthUser[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`auth.listUsers failed: ${error.message}`);

    const pageUsers = (data?.users ?? []) as AuthUser[];
    users.push(...pageUsers);

    if (pageUsers.length < 1000) break;
    page += 1;
  }

  return users;
}

async function safeSelect(table: string, columns: string) {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw new Error(`select ${table} failed: ${error.message}`);
  return (data ?? []) as Array<JsonRecord>;
}

async function deleteByIds(table: string, ids: string[], idColumn = "id") {
  if (!ids.length) {
    console.log(`  ${table}: 0`);
    return 0;
  }

  let deleted = 0;
  for (const batch of chunk(ids)) {
    const { error } = await supabase.from(table).delete().in(idColumn, batch);
    if (error) throw new Error(`delete ${table} failed: ${error.message}`);
    deleted += batch.length;
  }

  console.log(`  ${table}: ${deleted}`);
  return deleted;
}

function ensureResultOk(label: string, error: { message?: string } | null) {
  if (error) throw new Error(`${label} failed: ${error.message ?? "unknown error"}`);
}

async function deleteAuthUsers(users: AuthUser[]) {
  if (!users.length) {
    console.log("  auth.users: 0");
    return 0;
  }

  let deleted = 0;
  for (const user of users) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error && !error.message.toLowerCase().includes("user not found")) {
      throw new Error(`delete auth user ${user.email ?? user.id} failed: ${error.message}`);
    }
    deleted += 1;
  }

  console.log(`  auth.users: ${deleted}`);
  return deleted;
}

async function listPrefixPaths(bucket: string, prefix: string) {
  const trimmed = prefix.replace(/^\/+|\/+$/g, "");
  if (!trimmed) return [];

  const results: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(trimmed, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("bucket not found") || message.includes("not found")) return [];
      throw new Error(`storage list ${bucket}/${trimmed} failed: ${error.message}`);
    }

    const entries = data ?? [];
    for (const entry of entries) {
      const name = String(entry.name ?? "").trim();
      if (!name) continue;
      const nextPath = `${trimmed}/${name}`;
      if ((entry as { id?: string | null }).id) {
        results.push(nextPath);
      } else {
        results.push(...await listAllPaths(bucket, nextPath));
      }
    }

    if (entries.length < 100) break;
    offset += 100;
  }

  return results;
}

async function listAllPaths(bucket: string, prefix: string) {
  return listPrefixPaths(bucket, prefix);
}

async function removeStoragePaths(storagePaths: Map<string, Set<string>>) {
  let totalRemoved = 0;

  for (const [bucket, pathSet] of Array.from(storagePaths.entries())) {
    const paths = Array.from(pathSet).filter(Boolean);
    if (!paths.length) {
      console.log(`  storage:${bucket}: 0`);
      continue;
    }

    let removed = 0;
    for (const batch of chunk(paths)) {
      const { error } = await supabase.storage.from(bucket).remove(batch);
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("bucket not found") || message.includes("not found")) continue;
        throw new Error(`storage remove ${bucket} failed: ${error.message}`);
      }
      removed += batch.length;
    }

    console.log(`  storage:${bucket}: ${removed}`);
    totalRemoved += removed;
  }

  return totalRemoved;
}

async function collectScope(): Promise<Scope> {
  const authUsers = await listAllAuthUsers();
  const matchedUsers = authUsers.filter((user) => {
    const email = normalizeText(user.email);
    const metadata = user.user_metadata ?? {};
    return hasSafeEmailMarker(email) || metadata.is_demo === true;
  });

  const userIds = uniqueIds(matchedUsers.map((user) => user.id));
  const storagePaths = new Map<string, Set<string>>();

  const [
    workspaceRowsAll,
    agencyRowsAll,
    talentRowsAll,
    jobRowsAll,
    submissionRowsAll,
    presentationRowsAll,
    presentationCandidateRowsAll,
    presentationFeedbackRowsAll,
    notificationRowsAll,
    supportConversationRowsAll,
    supportMessageRowsAll,
    jobInviteRowsAll,
    jobInviteLinkRowsAll,
    premiumAgentInviteRowsAll,
    referralInviteRowsAll,
    agencyTalentHistoryRowsAll,
    contractRowsAll,
    bookingRowsAll,
    walletTransactionRowsAll,
    walletFundingSourceRowsAll,
    walletWithdrawalAllocationRowsAll,
    premiumAgentWalletRowsAll,
    workspaceMemberRowsAll,
    workspaceTalentRowsAll,
    pipelineNoteRowsAll,
  ] = await Promise.all([
    safeSelect("premium_workspaces", "id, owner_user_id, agency_id, name, slug, logo_url"),
    safeSelect("agencies", "id, company_name, avatar_url"),
    safeSelect("talent_profiles", "id, user_id, full_name, avatar_url, photo_front_url, photo_left_url, photo_right_url"),
    safeSelect("jobs", "id, agency_id, workspace_id, created_by_user_id, title, description"),
    safeSelect("submissions", "id, job_id, talent_user_id, email, photo_front_url, photo_left_url, photo_right_url, video_url, curriculum_url, portfolio_url"),
    safeSelect("workspace_presentations", "id, workspace_id, job_id, title"),
    safeSelect("workspace_presentation_candidates", "id, presentation_id, submission_id"),
    safeSelect("presentation_feedback", "id, presentation_id, submission_id"),
    safeSelect("notifications", "id, user_id"),
    safeSelect("support_conversations", "id, user_id"),
    safeSelect("support_messages", "id, conversation_id, sender_id, attachment_url"),
    safeSelect("job_invites", "id, job_id, talent_id, agency_id"),
    safeSelect("job_invite_links", "id, job_id, workspace_id, created_by"),
    safeSelect("premium_agent_invites", "id, workspace_id, invited_email, created_by"),
    safeSelect("referral_invites", "id, job_id, referrer_id, referred_user_id, referred_email, submission_id"),
    safeSelect("agency_talent_history", "id, agency_id, talent_id"),
    safeSelect("contracts", "id, job_id, agency_id, talent_id, talent_user_id, contract_file_url, signed_contract_url"),
    safeSelect("bookings", "id, job_id, agency_id, talent_user_id"),
    safeSelect("wallet_transactions", "id, user_id, reference_id"),
    safeSelect("wallet_funding_sources", "id, user_id, source_wallet_transaction_id"),
    safeSelect("wallet_withdrawal_source_allocations", "id, withdrawal_transaction_id, funding_source_id, source_wallet_transaction_id"),
    safeSelect("premium_agent_wallet_transactions", "id, workspace_id, owner_user_id, agent_user_id, related_job_id, related_contract_id"),
    safeSelect("premium_workspace_members", "id, workspace_id, user_id"),
    safeSelect("premium_workspace_talents", "id, workspace_id, talent_user_id"),
    safeSelect("submission_pipeline_notes", "id, submission_id, workspace_id"),
  ]);

  const workspaceRows = workspaceRowsAll.filter((row) =>
    userIds.includes(String(row.owner_user_id ?? "")) ||
    userIds.includes(String(row.agency_id ?? "")) ||
    hasMarker(row.name, SAFE_NAME_MARKERS) ||
    hasMarker(row.slug, SAFE_NAME_MARKERS)
  );
  const workspaceIds = uniqueIds(workspaceRows.map((row) => asId(row.id)));

  const agencyRows = agencyRowsAll.filter((row) =>
    userIds.includes(String(row.id ?? "")) ||
    hasMarker(row.company_name, [...SAFE_NAME_MARKERS, "brisahub studio"])
  );
  const agencyIds = uniqueIds(agencyRows.map((row) => asId(row.id)));

  const talentRows = talentRowsAll.filter((row) =>
    userIds.includes(String(row.id ?? "")) ||
    userIds.includes(String(row.user_id ?? "")) ||
    hasMarker(row.full_name, [...SAFE_NAME_MARKERS, ...SAFE_SEED_NAMES.map((name) => name.toLowerCase())])
  );
  const talentIds = uniqueIds(
    talentRows.flatMap((row) => [asId(row.id), asId(row.user_id)])
  );

  const jobRows = jobRowsAll.filter((row) =>
    workspaceIds.includes(String(row.workspace_id ?? "")) ||
    userIds.includes(String(row.agency_id ?? "")) ||
    userIds.includes(String(row.created_by_user_id ?? "")) ||
    hasMarker(row.title, [...SAFE_NAME_MARKERS, ...SAFE_JOB_MARKERS]) ||
    hasMarker(row.description, SAFE_NAME_MARKERS)
  );
  const jobIds = uniqueIds(jobRows.map((row) => asId(row.id)));

  const submissionRows = submissionRowsAll.filter((row) =>
    jobIds.includes(String(row.job_id ?? "")) ||
    userIds.includes(String(row.talent_user_id ?? "")) ||
    hasSafeEmailMarker(String(row.email ?? ""))
  );
  const submissionIds = uniqueIds(submissionRows.map((row) => asId(row.id)));

  const presentationRows = presentationRowsAll.filter((row) =>
    workspaceIds.includes(String(row.workspace_id ?? "")) ||
    jobIds.includes(String(row.job_id ?? "")) ||
    hasMarker(row.title, SAFE_NAME_MARKERS)
  );
  const presentationIds = uniqueIds(presentationRows.map((row) => asId(row.id)));

  const presentationCandidateRows = presentationCandidateRowsAll.filter((row) =>
    presentationIds.includes(String(row.presentation_id ?? "")) ||
    submissionIds.includes(String(row.submission_id ?? ""))
  );
  const presentationCandidateIds = uniqueIds(presentationCandidateRows.map((row) => asId(row.id)));

  const presentationFeedbackRows = presentationFeedbackRowsAll.filter((row) =>
    presentationIds.includes(String(row.presentation_id ?? "")) ||
    submissionIds.includes(String(row.submission_id ?? ""))
  );
  const presentationFeedbackIds = uniqueIds(presentationFeedbackRows.map((row) => asId(row.id)));

  const notificationRows = notificationRowsAll.filter((row) => userIds.includes(String(row.user_id ?? "")));
  const notificationIds = uniqueIds(notificationRows.map((row) => asId(row.id)));

  const supportConversationRows = supportConversationRowsAll.filter((row) => userIds.includes(String(row.user_id ?? "")));
  const supportConversationIds = uniqueIds(supportConversationRows.map((row) => asId(row.id)));

  const supportMessageRows = supportMessageRowsAll.filter((row) =>
    supportConversationIds.includes(String(row.conversation_id ?? "")) ||
    userIds.includes(String(row.sender_id ?? ""))
  );
  const supportMessageIds = uniqueIds(supportMessageRows.map((row) => asId(row.id)));

  const jobInviteRows = jobInviteRowsAll.filter((row) =>
    jobIds.includes(String(row.job_id ?? "")) ||
    userIds.includes(String(row.talent_id ?? "")) ||
    userIds.includes(String(row.agency_id ?? ""))
  );
  const jobInviteIds = uniqueIds(jobInviteRows.map((row) => asId(row.id)));

  const jobInviteLinkRows = jobInviteLinkRowsAll.filter((row) =>
    jobIds.includes(String(row.job_id ?? "")) ||
    workspaceIds.includes(String(row.workspace_id ?? "")) ||
    userIds.includes(String(row.created_by ?? ""))
  );
  const jobInviteLinkIds = uniqueIds(jobInviteLinkRows.map((row) => asId(row.id)));

  const premiumAgentInviteRows = premiumAgentInviteRowsAll.filter((row) =>
    workspaceIds.includes(String(row.workspace_id ?? "")) ||
    userIds.includes(String(row.created_by ?? "")) ||
    hasSafeEmailMarker(String(row.invited_email ?? ""))
  );
  const premiumAgentInviteIds = uniqueIds(premiumAgentInviteRows.map((row) => asId(row.id)));

  const referralInviteRows = referralInviteRowsAll.filter((row) =>
    jobIds.includes(String(row.job_id ?? "")) ||
    submissionIds.includes(String(row.submission_id ?? "")) ||
    userIds.includes(String(row.referrer_id ?? "")) ||
    userIds.includes(String(row.referred_user_id ?? "")) ||
    hasSafeEmailMarker(String(row.referred_email ?? ""))
  );
  const referralInviteIds = uniqueIds(referralInviteRows.map((row) => asId(row.id)));

  const agencyTalentHistoryRows = agencyTalentHistoryRowsAll.filter((row) =>
    userIds.includes(String(row.agency_id ?? "")) ||
    userIds.includes(String(row.talent_id ?? ""))
  );
  const agencyTalentHistoryIds = uniqueIds(agencyTalentHistoryRows.map((row) => asId(row.id)));

  const contractRows = contractRowsAll.filter((row) =>
    jobIds.includes(String(row.job_id ?? "")) ||
    userIds.includes(String(row.agency_id ?? "")) ||
    userIds.includes(String(row.talent_id ?? "")) ||
    userIds.includes(String(row.talent_user_id ?? ""))
  );
  const contractIds = uniqueIds(contractRows.map((row) => asId(row.id)));

  const bookingRows = bookingRowsAll.filter((row) =>
    jobIds.includes(String(row.job_id ?? "")) ||
    userIds.includes(String(row.agency_id ?? "")) ||
    userIds.includes(String(row.talent_user_id ?? ""))
  );
  const bookingIds = uniqueIds(bookingRows.map((row) => asId(row.id)));

  const walletTransactionRows = walletTransactionRowsAll.filter((row) =>
    userIds.includes(String(row.user_id ?? "")) ||
    contractIds.includes(String(row.reference_id ?? "")) ||
    bookingIds.includes(String(row.reference_id ?? "")) ||
    jobIds.includes(String(row.reference_id ?? ""))
  );
  const walletTransactionIds = uniqueIds(walletTransactionRows.map((row) => asId(row.id)));

  const walletFundingSourceRows = walletFundingSourceRowsAll.filter((row) =>
    userIds.includes(String(row.user_id ?? "")) ||
    walletTransactionIds.includes(String(row.source_wallet_transaction_id ?? ""))
  );
  const walletFundingSourceIds = uniqueIds(walletFundingSourceRows.map((row) => asId(row.id)));

  const walletWithdrawalAllocationRows = walletWithdrawalAllocationRowsAll.filter((row) =>
    walletTransactionIds.includes(String(row.withdrawal_transaction_id ?? "")) ||
    walletTransactionIds.includes(String(row.source_wallet_transaction_id ?? "")) ||
    walletFundingSourceIds.includes(String(row.funding_source_id ?? ""))
  );
  const walletWithdrawalAllocationIds = uniqueIds(walletWithdrawalAllocationRows.map((row) => asId(row.id)));

  const premiumAgentWalletRows = premiumAgentWalletRowsAll.filter((row) =>
    workspaceIds.includes(String(row.workspace_id ?? "")) ||
    userIds.includes(String(row.owner_user_id ?? "")) ||
    userIds.includes(String(row.agent_user_id ?? "")) ||
    jobIds.includes(String(row.related_job_id ?? "")) ||
    contractIds.includes(String(row.related_contract_id ?? ""))
  );
  const premiumAgentWalletIds = uniqueIds(premiumAgentWalletRows.map((row) => asId(row.id)));

  const workspaceMemberRows = workspaceMemberRowsAll.filter((row) =>
    workspaceIds.includes(String(row.workspace_id ?? "")) ||
    userIds.includes(String(row.user_id ?? ""))
  );
  const workspaceMemberIds = uniqueIds(workspaceMemberRows.map((row) => asId(row.id)));

  const workspaceTalentRows = workspaceTalentRowsAll.filter((row) =>
    workspaceIds.includes(String(row.workspace_id ?? "")) ||
    userIds.includes(String(row.talent_user_id ?? ""))
  );
  const workspaceTalentIds = uniqueIds(workspaceTalentRows.map((row) => asId(row.id)));

  const pipelineNoteRows = pipelineNoteRowsAll.filter((row) =>
    submissionIds.includes(String(row.submission_id ?? "")) ||
    workspaceIds.includes(String(row.workspace_id ?? ""))
  );
  const pipelineNoteIds = uniqueIds(pipelineNoteRows.map((row) => asId(row.id)));

  for (const row of talentRows) {
    addStoragePath(storagePaths, "talent-media", row.avatar_url);
    addStoragePath(storagePaths, "talent-media", row.photo_front_url);
    addStoragePath(storagePaths, "talent-media", row.photo_left_url);
    addStoragePath(storagePaths, "talent-media", row.photo_right_url);
  }

  for (const row of agencyRows) addStoragePath(storagePaths, "talent-media", row.avatar_url);
  for (const row of workspaceRows) {
    addStoragePath(storagePaths, "logos", row.logo_url);
    addStoragePath(storagePaths, "talent-media", row.logo_url);
  }
  for (const row of submissionRows) {
    addStoragePath(storagePaths, "talent-media", row.photo_front_url);
    addStoragePath(storagePaths, "talent-media", row.photo_left_url);
    addStoragePath(storagePaths, "talent-media", row.photo_right_url);
    addStoragePath(storagePaths, "talent-media", row.video_url);
    addStoragePath(storagePaths, "talent-media", row.curriculum_url);
    addStoragePath(storagePaths, "talent-media", row.portfolio_url);
    addStoragePath(storagePaths, "uploads", row.curriculum_url);
    addStoragePath(storagePaths, "portfolios", row.portfolio_url);
    addStoragePath(storagePaths, "presentations", row.video_url);
  }
  for (const row of contractRows) {
    addStoragePath(storagePaths, "contracts", row.contract_file_url);
    addStoragePath(storagePaths, "contracts", row.signed_contract_url);
  }
  for (const row of supportMessageRows) addStoragePath(storagePaths, "uploads", row.attachment_url);

  for (const userId of userIds) {
    for (const pathValue of await listAllPaths("talent-media", `submissions/${userId}`)) addStoragePath(storagePaths, "talent-media", pathValue);
    for (const pathValue of await listAllPaths("contracts", `signed/${userId}`)) addStoragePath(storagePaths, "contracts", pathValue);
    for (const pathValue of await listAllPaths("avatars", userId)) addStoragePath(storagePaths, "avatars", pathValue);
    for (const pathValue of await listAllPaths("uploads", userId)) addStoragePath(storagePaths, "uploads", pathValue);
    for (const pathValue of await listAllPaths("portfolios", userId)) addStoragePath(storagePaths, "portfolios", pathValue);
  }

  for (const workspaceId of workspaceIds) {
    for (const pathValue of await listAllPaths("contracts", `workspaces/${workspaceId}`)) addStoragePath(storagePaths, "contracts", pathValue);
    for (const pathValue of await listAllPaths("logos", `premium-workspaces/${workspaceId}`)) addStoragePath(storagePaths, "logos", pathValue);
    for (const pathValue of await listAllPaths("talent-media", `premium-workspaces/${workspaceId}`)) addStoragePath(storagePaths, "talent-media", pathValue);
    for (const pathValue of await listAllPaths("presentations", workspaceId)) addStoragePath(storagePaths, "presentations", pathValue);
  }

  for (const agencyId of agencyIds) {
    for (const pathValue of await listAllPaths("contracts", `open/${agencyId}`)) addStoragePath(storagePaths, "contracts", pathValue);
  }

  const profileIds = uniqueIds([...userIds, ...agencyIds, ...talentIds]);

  return {
    users: matchedUsers,
    userIds,
    workspaceRows,
    workspaceIds,
    agencyRows,
    agencyIds,
    talentRows,
    talentIds,
    jobRows,
    jobIds,
    submissionRows,
    submissionIds,
    presentationRows,
    presentationIds,
    presentationCandidateRows,
    presentationCandidateIds,
    presentationFeedbackRows,
    presentationFeedbackIds,
    notificationRows,
    notificationIds,
    supportConversationRows,
    supportConversationIds,
    supportMessageRows,
    supportMessageIds,
    jobInviteRows,
    jobInviteIds,
    jobInviteLinkRows,
    jobInviteLinkIds,
    premiumAgentInviteRows,
    premiumAgentInviteIds,
    referralInviteRows,
    referralInviteIds,
    agencyTalentHistoryRows,
    agencyTalentHistoryIds,
    contractRows,
    contractIds,
    bookingRows,
    bookingIds,
    walletTransactionRows,
    walletTransactionIds,
    walletFundingSourceRows,
    walletFundingSourceIds,
    walletWithdrawalAllocationRows,
    walletWithdrawalAllocationIds,
    premiumAgentWalletRows,
    premiumAgentWalletIds,
    workspaceMemberRows,
    workspaceMemberIds,
    workspaceTalentRows,
    workspaceTalentIds,
    pipelineNoteRows,
    pipelineNoteIds,
    profileIds,
    storagePaths,
  };
}

async function resetDemoData() {
  console.log("\nResetting demo/test data in SAFE MODE...\n");
  const scope = await collectScope();

  console.log("Matched scope:");
  console.log(`  auth users: ${scope.users.length}`);
  console.log(`  workspaces: ${scope.workspaceIds.length}`);
  console.log(`  jobs: ${scope.jobIds.length}`);
  console.log(`  submissions: ${scope.submissionIds.length}`);
  console.log(`  contracts: ${scope.contractIds.length}`);
  console.log(`  bookings: ${scope.bookingIds.length}`);

  console.log("\nRemoving storage files...");
  await removeStoragePaths(scope.storagePaths);

  console.log("\nDeleting rows...");
  await deleteByIds("support_messages", scope.supportMessageIds);
  await deleteByIds("support_conversations", scope.supportConversationIds);
  await deleteByIds("presentation_feedback", scope.presentationFeedbackIds);
  await deleteByIds("workspace_presentation_candidates", scope.presentationCandidateIds);
  await deleteByIds("workspace_presentations", scope.presentationIds);
  await deleteByIds("submission_pipeline_notes", scope.pipelineNoteIds);
  await deleteByIds("notifications", scope.notificationIds);
  await deleteByIds("referral_invites", scope.referralInviteIds);
  await deleteByIds("job_invites", scope.jobInviteIds);
  await deleteByIds("job_invite_links", scope.jobInviteLinkIds);
  await deleteByIds("premium_agent_invites", scope.premiumAgentInviteIds);
  await deleteByIds("wallet_withdrawal_source_allocations", scope.walletWithdrawalAllocationIds);
  await deleteByIds("wallet_funding_sources", scope.walletFundingSourceIds);
  await deleteByIds("premium_agent_wallet_transactions", scope.premiumAgentWalletIds);
  await deleteByIds("contracts", scope.contractIds);
  await deleteByIds("bookings", scope.bookingIds);
  await deleteByIds("submissions", scope.submissionIds);
  await deleteByIds("agency_talent_history", scope.agencyTalentHistoryIds);
  await deleteByIds("premium_workspace_talents", scope.workspaceTalentIds);
  await deleteByIds("premium_workspace_members", scope.workspaceMemberIds);
  await deleteByIds("wallet_transactions", scope.walletTransactionIds);
  await deleteByIds("jobs", scope.jobIds);
  await deleteByIds("premium_workspaces", scope.workspaceIds);
  await deleteByIds("agencies", scope.agencyIds);
  await deleteByIds("talent_profiles", uniqueIds(scope.talentRows.map((row) => asId(row.id))));
  await deleteByIds("profiles", scope.profileIds);
  await deleteAuthUsers(scope.users);

  console.log("\nSAFE MODE reset complete.\n");
}

async function ensureAuthUser(input: {
  email: string;
  password: string;
  role: "agency" | "talent";
  metadata?: JsonRecord;
}) {
  const users = await listAllAuthUsers();
  const existing = users.find((user) => normalizeText(user.email) === normalizeText(input.email));

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: input.password,
      email_confirm: true,
      user_metadata: { ...(existing.user_metadata ?? {}), role: input.role, seeded_by_reset_demo: true, ...(input.metadata ?? {}) },
    });
    if (error) throw new Error(`update auth user ${input.email} failed: ${error.message}`);
    return data.user.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { role: input.role, seeded_by_reset_demo: true, ...(input.metadata ?? {}) },
  });
  if (error) throw new Error(`create auth user ${input.email} failed: ${error.message}`);
  return data.user.id;
}

async function upsertJobs(jobDefs: Array<JsonRecord>) {
  for (const job of jobDefs) {
    const existingRows = await supabase
      .from("jobs")
      .select("id")
      .eq("title", String(job.title))
      .eq("created_by_user_id", String(job.created_by_user_id))
      .limit(1);
    ensureResultOk(`lookup job ${String(job.title)}`, existingRows.error ?? null);

    const existingId = asId(existingRows.data?.[0]?.id);
    if (existingId) {
      const { error } = await supabase.from("jobs").update(job).eq("id", existingId);
      if (error) throw new Error(`update job ${job.title} failed: ${error.message}`);
      continue;
    }

    const { error } = await supabase.from("jobs").insert(job);
    if (error) throw new Error(`insert job ${job.title} failed: ${error.message}`);
  }
}

async function syncWorkspaceMember(input: {
  workspaceId: string;
  userId: string;
  role: "owner" | "agent";
  createdBy: string;
}) {
  const existing = await supabase
    .from("premium_workspace_members")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", input.userId)
    .is("removed_at", null)
    .limit(1)
    .maybeSingle();
  ensureResultOk(`lookup workspace member ${input.userId}`, existing.error ?? null);

  if (existing.data?.id) {
    const { error } = await supabase
      .from("premium_workspace_members")
      .update({ role: input.role, status: "active", created_by: input.createdBy, removed_at: null })
      .eq("id", existing.data.id);
    ensureResultOk(`update workspace member ${input.userId}`, error);
    return;
  }

  const { error } = await supabase.from("premium_workspace_members").insert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
    role: input.role,
    status: "active",
    created_by: input.createdBy,
  });
  ensureResultOk(`insert workspace member ${input.userId}`, error);
}

async function syncWorkspaceTalent(input: {
  workspaceId: string;
  talentUserId: string;
  invitedBy: string;
}) {
  const existing = await supabase
    .from("premium_workspace_talents")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("talent_user_id", input.talentUserId)
    .is("removed_at", null)
    .limit(1)
    .maybeSingle();
  ensureResultOk(`lookup workspace talent ${input.talentUserId}`, existing.error ?? null);

  if (existing.data?.id) {
    const { error } = await supabase
      .from("premium_workspace_talents")
      .update({ status: "active", source: "portal", invited_by: input.invitedBy, removed_at: null })
      .eq("id", existing.data.id);
    ensureResultOk(`update workspace talent ${input.talentUserId}`, error);
    return;
  }

  const { error } = await supabase.from("premium_workspace_talents").insert({
    workspace_id: input.workspaceId,
    talent_user_id: input.talentUserId,
    status: "active",
    source: "portal",
    invited_by: input.invitedBy,
  });
  ensureResultOk(`insert workspace talent ${input.talentUserId}`, error);
}

async function seedDemoData() {
  await resetDemoData();

  console.log("Seeding fresh demo data...\n");

  const ownerId = await ensureAuthUser({ email: SEED_EMAILS[0], password: DEMO_PASSWORD, role: "agency" });
  const agentId = await ensureAuthUser({ email: SEED_EMAILS[1], password: DEMO_PASSWORD, role: "agency" });
  const talent1Id = await ensureAuthUser({ email: SEED_EMAILS[2], password: DEMO_PASSWORD, role: "talent" });
  const talent2Id = await ensureAuthUser({ email: SEED_EMAILS[3], password: DEMO_PASSWORD, role: "talent" });
  const talent3Id = await ensureAuthUser({ email: SEED_EMAILS[4], password: DEMO_PASSWORD, role: "talent" });

  const profilesResult = await supabase.from("profiles").upsert([
    { id: ownerId, role: "agency", plan: "premium", plan_status: "active", wallet_balance: 0, onboarding_completed: true },
    { id: agentId, role: "agency", plan: "free", plan_status: "inactive", wallet_balance: 0, onboarding_completed: true },
    { id: talent1Id, role: "talent", plan: "free", plan_status: "inactive", wallet_balance: 0, onboarding_completed: true },
    { id: talent2Id, role: "talent", plan: "free", plan_status: "inactive", wallet_balance: 0, onboarding_completed: true },
    { id: talent3Id, role: "talent", plan: "free", plan_status: "inactive", wallet_balance: 0, onboarding_completed: true },
  ], { onConflict: "id" });
  ensureResultOk("upsert profiles", profilesResult.error ?? null);

  const agenciesResult = await supabase.from("agencies").upsert([
    { id: ownerId, company_name: "BrisaHub Studio", contact_name: "Equipe BrisaHub", subscription_status: "active", city: "Sao Paulo", country: "Brasil" },
    { id: agentId, company_name: "BrisaHub Agent Desk", contact_name: "Equipe BrisaHub", subscription_status: "active", city: "Sao Paulo", country: "Brasil" },
  ], { onConflict: "id" });
  ensureResultOk("upsert agencies", agenciesResult.error ?? null);

  const talentsResult = await supabase.from("talent_profiles").upsert([
    {
      id: talent1Id,
      user_id: talent1Id,
      full_name: "Bianca Martins",
      city: "Sao Paulo",
      country: "Brasil",
      bio: "Modelo editorial com experiencia em moda e beleza.",
      categories: ["moda", "editorial"],
      age: 24,
      gender: "female",
      marketplace_visible: false,
    },
    {
      id: talent2Id,
      user_id: talent2Id,
      full_name: "Julia Ferreira",
      city: "Rio de Janeiro",
      country: "Brasil",
      bio: "Atriz comercial com experiencia em campanhas de video e TV.",
      categories: ["atuacao", "comercial"],
      age: 27,
      gender: "female",
      marketplace_visible: false,
    },
    {
      id: talent3Id,
      user_id: talent3Id,
      full_name: "Mateus Lima",
      city: "Belo Horizonte",
      country: "Brasil",
      bio: "Criador e modelo para campanhas digitais e lifestyle.",
      categories: ["lifestyle", "digital"],
      age: 29,
      gender: "male",
      marketplace_visible: false,
    },
  ], { onConflict: "id" });
  ensureResultOk("upsert talent_profiles", talentsResult.error ?? null);

  const workspaceSlug = "brisahub-studio";
  let workspaceId = "";

  const workspaceLookup = await supabase
    .from("premium_workspaces")
    .select("id")
    .eq("owner_user_id", ownerId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (workspaceLookup.data?.id) {
    workspaceId = String(workspaceLookup.data.id);
    const { error } = await supabase.from("premium_workspaces").update({
      agency_id: ownerId,
      name: "BrisaHub Studio",
      slug: workspaceSlug,
      status: "active",
      brand_primary_color: "#1ABC9C",
      brand_accent_color: "#0F766E",
      welcome_message: "Portal privado da BrisaHub Studio.",
      onboarding_completed: true,
    }).eq("id", workspaceId);
    if (error) throw new Error(`update workspace failed: ${error.message}`);
  } else {
    const { data, error } = await supabase.from("premium_workspaces").insert({
      owner_user_id: ownerId,
      agency_id: ownerId,
      name: "BrisaHub Studio",
      slug: workspaceSlug,
      status: "active",
      brand_primary_color: "#1ABC9C",
      brand_accent_color: "#0F766E",
      welcome_message: "Portal privado da BrisaHub Studio.",
      onboarding_completed: true,
    }).select("id").single();
    if (error || !data?.id) throw new Error(`create workspace failed: ${error?.message ?? "missing id"}`);
    workspaceId = String(data.id);
  }

  await syncWorkspaceMember({ workspaceId, userId: ownerId, role: "owner", createdBy: ownerId });
  await syncWorkspaceMember({ workspaceId, userId: agentId, role: "agent", createdBy: ownerId });

  await syncWorkspaceTalent({ workspaceId, talentUserId: talent1Id, invitedBy: ownerId });
  await syncWorkspaceTalent({ workspaceId, talentUserId: talent2Id, invitedBy: ownerId });
  await syncWorkspaceTalent({ workspaceId, talentUserId: talent3Id, invitedBy: ownerId });

  await upsertJobs([
    {
      agency_id: ownerId,
      workspace_id: null,
      created_by_user_id: ownerId,
      title: "Social Media Campaign",
      description: "Campanha digital para conteudo short-form e stills de marca de beleza.",
      category: "Publicidade",
      budget: 2400,
      deadline: "2026-06-20",
      job_date: "2026-06-28",
      job_time: "10:00",
      location: "Sao Paulo, SP",
      status: "open",
      visibility: "public",
      number_of_talents_required: 2,
      talents_needed: 2,
      gender: null,
      age_min: 20,
      age_max: 35,
      application_requirements: [],
      invite_only: false,
    },
    {
      agency_id: ownerId,
      workspace_id: workspaceId,
      created_by_user_id: ownerId,
      title: "Fashion Editorial",
      description: "Editorial de moda com fotografia em estudio e takes de movimento.",
      category: "Moda",
      budget: 3200,
      deadline: "2026-06-22",
      job_date: "2026-07-02",
      job_time: "09:00",
      location: "Sao Paulo, SP",
      status: "open",
      visibility: "workspace_only",
      number_of_talents_required: 1,
      talents_needed: 1,
      gender: "female",
      age_min: 21,
      age_max: 32,
      application_requirements: [],
      invite_only: false,
    },
    {
      agency_id: ownerId,
      workspace_id: workspaceId,
      created_by_user_id: agentId,
      title: "TV Commercial",
      description: "Comercial de TV para varejo com captações internas e externas.",
      category: "Comercial",
      budget: 4500,
      deadline: "2026-06-24",
      job_date: "2026-07-05",
      job_time: "07:30",
      location: "Campinas, SP",
      status: "open",
      visibility: "workspace_only",
      number_of_talents_required: 2,
      talents_needed: 2,
      gender: null,
      age_min: 20,
      age_max: 38,
      application_requirements: [],
      invite_only: false,
    },
    {
      agency_id: ownerId,
      workspace_id: workspaceId,
      created_by_user_id: ownerId,
      title: "Beauty Campaign Hold",
      description: "Campanha de beleza pausada para replanejamento de cronograma.",
      category: "Beleza",
      budget: 2800,
      deadline: "2026-06-30",
      job_date: "2026-07-10",
      job_time: "11:00",
      location: "Sao Paulo, SP",
      status: "paused",
      visibility: "workspace_only",
      number_of_talents_required: 1,
      talents_needed: 1,
      gender: null,
      age_min: 22,
      age_max: 35,
      application_requirements: [],
      invite_only: false,
    },
  ]);

  console.log("Seed complete.");
  console.log(`  owner:  ${SEED_EMAILS[0]} / ${DEMO_PASSWORD}`);
  console.log(`  agent:  ${SEED_EMAILS[1]} / ${DEMO_PASSWORD}`);
  console.log(`  talent: ${SEED_EMAILS[2]} / ${DEMO_PASSWORD}`);
  console.log(`  talent: ${SEED_EMAILS[3]} / ${DEMO_PASSWORD}`);
  console.log(`  talent: ${SEED_EMAILS[4]} / ${DEMO_PASSWORD}\n`);
}

async function main() {
  if (mode === "seed") {
    await seedDemoData();
    return;
  }

  await resetDemoData();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nreset-demo-data failed: ${message}\n`);
  process.exit(1);
});
