/**
 * BrisaHub Demo Reset
 *
 * Deletes all demo data created by seed-demo.mjs.
 * Cascade-deletes via auth.users (contracts, bookings, wallet_transactions,
 * submissions, notifications, profiles, agencies, talent_profiles all cascade
 * from auth.users or agency/talent FK chains).
 *
 * Run: node scripts/reset-demo.mjs
 * Re-seed: node scripts/seed-demo.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, svcKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAILS = [
  "demo-owner@brisahub.com",
  "demo-agent@brisahub.com",
  "demo-talent-portal@brisahub.com",
  "demo-talent-mkt@brisahub.com",
  "demo-talent@brisahub.com",
  "demo-agency@brisahub.com",
];

console.log("\nResetting BrisaHub demo data…\n");

const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
const demoUsers = (list?.users ?? []).filter((u) => DEMO_EMAILS.includes(u.email));

if (demoUsers.length === 0) {
  console.log("No demo users found — nothing to reset.");
  process.exit(0);
}

// 1. Delete workspace (cascades to members, talents, agent_wallet_transactions, jobs with workspace_id)
//    Find via owner
const ownerUser = demoUsers.find((u) => u.email === "demo-owner@brisahub.com");
if (ownerUser) {
  const { data: ws } = await sb
    .from("premium_workspaces")
    .select("id")
    .eq("owner_user_id", ownerUser.id)
    .maybeSingle();

  if (ws) {
    // Cascade: members, talents, agent_wallet_transactions, job workspace_id FK
    // Set workspace_id = null on jobs before deleting workspace so non-cascading jobs don't error
    await sb.from("jobs").update({ workspace_id: null }).eq("workspace_id", ws.id);

    const { error } = await sb.from("premium_workspaces").delete().eq("id", ws.id);
    if (error) console.warn(`  warn: workspace delete: ${error.message}`);
    else console.log(`  ✓ deleted workspace ${ws.id}`);
  }
}

// 2. Delete submissions by demo talent users
for (const u of demoUsers) {
  await sb.from("submissions").delete().eq("talent_user_id", u.id);
}
console.log("  ✓ submissions deleted");

// 3. Delete contracts + bookings by demo users (cascade from booking to contract only if FK is set)
for (const u of demoUsers) {
  await sb.from("contracts").delete().eq("agency_id", u.id);
  await sb.from("contracts").delete().eq("talent_user_id", u.id);
  await sb.from("bookings").delete().eq("agency_id", u.id);
  await sb.from("bookings").delete().eq("talent_user_id", u.id);
}
console.log("  ✓ contracts + bookings deleted");

// 4. Delete wallet_transactions
for (const u of demoUsers) {
  await sb.from("wallet_transactions").delete().eq("user_id", u.id);
}
console.log("  ✓ wallet_transactions deleted");

// 5. Delete jobs by demo users
for (const u of demoUsers) {
  await sb.from("jobs").delete().eq("created_by_user_id", u.id);
  await sb.from("jobs").delete().eq("agency_id", u.id);
}
console.log("  ✓ jobs deleted");

// 6. Delete notifications
for (const u of demoUsers) {
  await sb.from("notifications").delete().eq("user_id", u.id);
}
console.log("  ✓ notifications deleted");

// 7. Delete auth users (cascades to profiles via auth.users FK)
for (const u of demoUsers) {
  const { error } = await sb.auth.admin.deleteUser(u.id);
  if (error) console.warn(`  warn: delete user ${u.email}: ${error.message}`);
  else console.log(`  ✓ deleted auth user: ${u.email}`);
}

console.log("\nDemo reset complete. Run `node scripts/seed-demo.mjs` to re-seed.\n");
