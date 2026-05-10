<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# BrisaHub Architecture Rules

These rules are permanent. Every future code change must follow them.

---

## Financial Data — Source of Truth

The database is the single source of truth for all financial values.
**Never recalculate financial values that are already stored.**

### Contracts table — stored facts, never recalculate

| Column | Meaning | Rule |
|---|---|---|
| `payment_amount` | Gross value agreed at booking | Read only. Never recalculate. |
| `commission_amount` | Platform commission locked at contract creation | Read only. Never recalculate from current plan. |
| `commission_percent` | Commission rate at time of contract | Read only. |
| `net_amount` | Talent's share locked at contract creation | Read only. Never recalculate. |
| `status` | Contract lifecycle stage | See lifecycle below. |
| `paid_at` | Timestamp when agency released payment | Set once by backend. |

### Commission and net_amount — write path only

`calculateCommission()` and `calculateNetAmount()` from `lib/plans.ts` are used **only when creating a new contract** to compute and store `commission_amount` and `net_amount`. They must never be called to re-derive historical amounts for display or reporting.

### Wallet transactions — stored facts

`wallet_transactions` is the source of truth for all actual money movement (deposits, payouts, withdrawals, referral commissions). Do not infer money movement from contract status alone.

---

## Contract Lifecycle

```
sent → signed → confirmed (escrowed) → paid → [cancelled | rejected]
```

| `contracts.status` | Meaning |
|---|---|
| `sent` | Contract sent to talent, awaiting signature |
| `signed` | Talent signed, awaiting agency deposit/confirmation |
| `confirmed` | Agency deposited — funds held in escrow |
| `paid` | Agency released payment — talent wallet credited — **contract is complete** |
| `cancelled` | Cancelled at any stage |
| `rejected` | Rejected by talent |

**`status = "paid"` means the contract lifecycle is finished.** The talent's BrisaHub wallet has been credited. This is a contract-level fact.

---

## Contract Status Display — Always Use `lib/contractStatus.ts`

Every page or component that displays contract status or financial amounts **must** use the shared utilities in `lib/contractStatus.ts`. Never inline status labels or badge colors.

```typescript
import {
  getContractPaymentStatus,
  contractStatusLabel,
  contractStatusTone,
  resolveContractAmounts,
} from "@/lib/contractStatus";

const ps    = getContractPaymentStatus(contract);   // semantic key
const label = contractStatusLabel(ps);              // "Pago ao talento", "Em custódia", etc.
const tone  = contractStatusTone(ps);               // Tailwind badge classes
const { gross, commission, net, commissionPct } = resolveContractAmounts(contract);
```

**Status labels (Portuguese canonical)**

| Status | Label | Badge color |
|---|---|---|
| `paid_to_wallet` | Pago ao talento | Emerald |
| `escrow` | Em custódia | Indigo |
| `signed` | Aguardando depósito | Amber |
| `pending` | Aguardando talento | Zinc |
| `cancelled` | Cancelado | Zinc |
| `rejected` | Rejeitado | Red |

---

## Contract Payment vs. PIX Withdrawal — They Are Separate

These are two different events. **Never conflate them.**

| Event | Table | Field |
|---|---|---|
| Agency pays talent wallet | `contracts` | `status = "paid"`, `paid_at` |
| Talent withdraws to PIX | `wallet_transactions` | `type = "withdrawal"` |

**`contracts.withdrawn_at` is unreliable and must not be used** for determining whether a talent has withdrawn. It was never consistently set when withdrawals happened via `wallet_transactions`.

- Contract tabs/sections → show contract payment lifecycle only
- Withdrawal tabs/sections → read from `wallet_transactions` only

---

## Talent Earnings Display — Priority Chain

When displaying how much a talent earned from a contract:

```
1. wallet_transactions.amount WHERE type = "payout" AND reference_id = contract.id
2. contracts.net_amount  (stored at contract creation)
3. contracts.payment_amount - contracts.commission_amount  (derived from stored values)
4. payment_amount * TALENT_RATE  (last resort only — legacy rows without any stored values)
```

**Never use `TALENT_RATE = 0.85` as the primary calculation.** It is only correct for the Free plan (20% commission). Pro/Premium plans have 10% commission (net = 90%). Always prefer stored `net_amount`.

---

## Plan Rates — Current vs. Historical

`lib/plans.ts` commission rates reflect the **current** plan configuration.

- Use them **only** when creating new contracts (writing `commission_amount`, `net_amount` to DB).
- **Never** use current plan rates to report or recalculate historical contracts. Old contracts locked in their rates at creation time via stored columns.

---

## Support System

Tables: `support_conversations`, `support_messages`

- User identity (name, email, role) must always be resolved via `lib/resolveSupportUsers.ts`.
- `profiles.email` does not exist — email comes from `supabase.auth.admin.getUserById()`.
- Agency names come from `agencies.company_name` (join via `agencies.user_id`).
- Talent names come from `talent_profiles.full_name` (join via `talent_profiles.id` or `talent_profiles.user_id`).
- Never use `sender_role` from `support_messages` as the user's role.

---

## Shared Status Helpers — Single Source of Truth

Every domain has exactly one file that owns its status labels and badge colors. Never define a local STATUS_LABEL or STATUS_CLS map in a feature file.

| Domain | Helper | Functions |
|---|---|---|
| Contract payment lifecycle | `lib/contractStatus.ts` | `getContractPaymentStatus()`, `contractStatusLabel()`, `contractStatusTone()`, `resolveContractAmounts()` |
| Booking/unified status | `lib/bookingStatus.ts` | `getUnifiedBookingStatus()`, `unifiedStatusInfo()`, `statusInfo()`, `normaliseStatus()` |
| Job status | `lib/jobStatus.ts` | `jobStatusLabel()`, `jobStatusTone()` |
| Submission status | `lib/submissionStatus.ts` | `submissionStatusLabel()`, `submissionStatusTone()` |
| Withdrawal status | `lib/withdrawalStatus.ts` | `withdrawalStatusLabel()`, `withdrawalStatusTone()` |

**Contract status canonical labels (Portuguese)**

| Status key | Label |
|---|---|
| `paid_to_wallet` | Pago ao talento |
| `escrow` | Em custódia |
| `signed` | Aguardando depósito |
| `pending` | Aguardando talento |
| `cancelled` | Cancelado |
| `rejected` | Rejeitado |

**Translation keys** in `lib/translations/pt.ts` must match these canonical labels (used by AgencyContracts via i18n).

---

## Currency Formatting — Single Source of Truth

Always import `brl()` from `lib/brl.ts`. Never define a local `brl()` function in feature or page files.

```typescript
import { brl } from "@/lib/brl";
```

---

## Admin Audit Logging

Any admin API route that mutates important state (plan changes, user deletion, contract deletion, broadcast notifications, withdrawal cancellation) must call `logAdminAction()` from `lib/auditLog.ts`.

```typescript
import { logAdminAction } from "@/lib/auditLog";

await logAdminAction({
  adminId: auth.userId,
  action: "plan_settings_changed",
  entityType: "plan_settings",
  entityId: planKey,
  before: previousRow,
  after: updatedRow,
});
```

Failures are swallowed internally — never block the main action on audit log writes. Table: `admin_audit_logs`.

---

## Plan Rates in UI — Always from PLAN_DEFINITIONS

Never hardcode commission percentages or plan prices as strings in UI components. Always derive from `PLAN_DEFINITIONS` in `lib/plans.ts`:

```typescript
import { PLAN_DEFINITIONS } from "@/lib/plans";

commission: `${PLAN_DEFINITIONS.pro.commissionLabel} de comissao`  // "10% de comissao"
```

---

## Navigation — Sidebar and Topbar

- All sidebar nav keys must have a matching entry in `lib/translations/pt.ts`.
- All new routes must have a `pageMeta` entry in `components/layout/Topbar.tsx`.
- Role nav arrays in `components/layout/Sidebar.tsx`: `AGENCY_NAV`, `TALENT_NAV`, `ADMIN_NAV`.

---

## What Not to Touch Without Explicit Instruction

- Asaas integration (deposits, subscriptions, PIX transfers)
- Wallet balance mutations (`wallet_transactions` inserts/updates)
- Escrow lock/release logic
- `calculateCommission` / `calculateNetAmount` in `lib/plans.ts` — these are correct; only their misuse in display was fixed
- Supabase RLS policies
- Auth flow and onboarding
