# BrisaHub Demo Environment

A realistic, premium demo environment for investor demos, videos, Acquire listings, and testing.

## Quick Start

```bash
node scripts/seed-demo.mjs   # seed demo data (idempotent — safe to re-run)
node scripts/reset-demo.mjs  # wipe all demo data
```

Or via npm:

```bash
npm run demo:seed
npm run demo:reset
```

## Demo Credentials

All demo accounts share the same password: **`BrisaDemo@2026`**

| Email | Role | Plan | Name / Company | Notes |
|---|---|---|---|---|
| `demo-owner@brisahub.com` | Agency | Premium | Aurora Casting | Workspace owner, R$15,750 balance |
| `demo-agent@brisahub.com` | Agency | Free | Agente Demo | Private workspace agent, R$10k spending limit |
| `demo-talent-portal@brisahub.com` | Talent | Free | Sofia Andrade | Portal-only talent (not in open marketplace) |
| `demo-talent-mkt@brisahub.com` | Talent | Free | Beatriz Santos | Marketplace talent |
| `demo-talent@brisahub.com` | Talent | Free | Lucas Mendes | Marketplace talent |
| `demo-agency@brisahub.com` | Agency | Free | Creative Studio BR | External agency |

## Demo Architecture

### Workspace
- **Name:** Aurora Casting
- **Slug:** `aurora-casting`
- **Brand:** Violet (`#7C3AED` / `#A855F7`)
- **Members:** demo-owner (owner) + demo-agent (agent, R$10k spending limit)
- **Portal talents:** Sofia Andrade + Beatriz Santos

### Jobs (4)

| Title | Status | Visibility | Budget |
|---|---|---|---|
| Campanha Editorial Inverno 2026 | Open | private_invite | R$8,500 |
| Catálogo Verão Riachuelo 2027 | Open | workspace_only | R$12,000 |
| Comercial TV Banco Itaú — Família | Closed | private_invite | R$25,000 |
| Ensaio Book Feminino SP — Verão | Open | public | R$1,800 |

### Contracts (3)

| Job | Talent | Status | Value |
|---|---|---|---|
| Comercial TV Banco Itaú | Sofia Andrade | **Paid** | R$25,000 (net R$22,500) |
| Campanha Editorial Inverno 2026 | Beatriz Santos | **In Escrow** | R$8,500 (net R$7,650) |
| Catálogo Verão Riachuelo 2027 | Sofia Andrade | **Sent** | R$12,000 (net R$10,800) |

### Agent Wallet Ledger
- Allocation: R$50,000 (owner → agent, Q2 2026)
- Job Commitment: R$25,000 (Comercial Itaú)
- Job Settlement: R$25,000 (Comercial Itaú — paid, consumed)
- **Available balance:** R$25,000 (not yet committed to Catálogo/Editorial)

### Talent Wallet
- Sofia Andrade: R$4,320 wallet balance (includes Itaú payout of R$22,500 minus prior withdrawals)
- Beatriz Santos: R$850 wallet balance

### Submissions (4)
- Sofia → Editorial Inverno (pending)
- Lucas → Editorial Inverno (pending)
- Beatriz → Catálogo Verão (approved)
- Beatriz → Book Feminino (pending)

### Notifications (9 total)
Distributed across demo users covering paid contracts, escrow, signatures, applications, and new jobs.

## Identifying Demo Data

All demo users have:
- Emails matching `demo-*@brisahub.com`
- `user_metadata.is_demo = true` in auth

To find all demo users in the DB:
```sql
select id, email from auth.users
where email like 'demo-%@brisahub.com'
order by email;
```

## Notes

- The seed script is **fully idempotent** — safe to run multiple times. It skips rows that already exist.
- Reset deletes all demo data via `reset-demo.mjs`, then you can re-seed.
- No production logic is touched — demo data is identified solely by email naming convention.
- `premium_agent_wallet_transactions` uses internal accounting only; no real money moves.
- All commission rates are 10% (Premium plan rate locked at contract creation).
