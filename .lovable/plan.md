

# Commission System — Updated Plan

## Business Rules (Updated)

### Commission Eligibility Flow

```text
Enrollment Status Flow:
applied → ... → enrolled → active → funded → paid_by_university
                                       │              │
                              25% monthly payout    Remaining 75%
                              starts here           released here

Funding Status Flow (on enrollment):
not_started → application_submitted → approved → disbursed
                                         │
                                   "Student Finance Done"
                                   = triggers snapshot creation
```

### Key Rules

1. **25% eligibility** triggers when `funding_status = "approved"` (Student Finance Application Done). Agent must have 5+ enrollments at this stage.
2. **Remaining 75%** released when enrollment status = `"paid_by_university"` (new status). Agent sees **"Commission Ready to be Paid"**.
3. Rates are **locked at snapshot time** — future tier changes do not affect existing snapshots.
4. Owner can manually override any snapshot.

### Admin Commission
- Configurable rate per admin (default £100/student from their agents' enrollments).
- Same eligibility triggers as agent commission.

---

## Database Changes

### Migration 1: `commission_snapshots` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| enrollment_id | uuid | FK, unique — one snapshot per enrollment |
| agent_id | uuid | Agent who owns the student |
| admin_id | uuid | Nullable — admin of the agent |
| university_id | uuid | Reference |
| agent_rate | numeric | Locked £/student for agent |
| admin_rate | numeric | Locked £/student for admin |
| rate_source | text | e.g. "Global: Gold", "Custom" |
| snapshot_status | text | `pending_25` → `paying_25` → `ready_full` → `paid` |
| eligible_at | timestamptz | When funding_status hit "approved" |
| full_release_at | timestamptz | When status hit "paid_by_university" |
| created_at | timestamptz | |

RLS: Owner ALL; Admin SELECT team; Agent SELECT own.

### Migration 2: `commission_payments` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| snapshot_id | uuid | FK |
| recipient_id | uuid | Agent or Admin |
| recipient_role | text | 'agent' / 'admin' |
| amount | numeric | |
| payment_type | text | '25_percent_monthly' / 'remaining_75' / 'manual' |
| period_label | text | e.g. "April 2026" |
| paid_at | timestamptz | |
| paid_by | uuid | Owner who recorded |
| notes | text | |

RLS: Owner ALL; Admin SELECT team; Agent SELECT own.

### Migration 3: `admin_commission_settings` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| admin_id | uuid | Unique per admin |
| rate_per_student | numeric | Default 100 |
| updated_at | timestamptz | |

RLS: Owner ALL; Admin SELECT own.

### Migration 4: Add new enrollment status + funding status

- Add `"paid_by_university"` to the STATUSES arrays in UI code (EnrollmentsPage, StudentEnrollmentsTab, StudentNotesTab).
- Add `"commission_ready"` display label in StatusBadge for agent view.

---

## Snapshot Auto-Creation Logic

A database trigger on `enrollments` UPDATE:
- When `funding_status` changes to `"approved"` → create a `commission_snapshot` row with:
  - Current agent rate (resolved from tiers/university_commissions)
  - Current admin rate (from `admin_commission_settings`)
  - `snapshot_status = 'pending_25'`

When enrollment `status` changes to `"paid_by_university"`:
- Update snapshot: `snapshot_status = 'ready_full'`, set `full_release_at = now()`

---

## UI Changes

### Owner Commissions Page (redesign)
- **Summary cards**: Total Owed, Total Paid, Remaining, Eligible Agents
- **Agent table**: Per-agent with eligible students, total commission, 25% paid, remaining, "Record Payment" button
- **Expand row**: Per-enrollment breakdown with locked rate, snapshot status, payment history
- **Admin section**: Admin commission summary aggregated from their team
- **Payment history tab**: Full ledger of all payments

### Agent Dashboard
- Commission card: "£X total | £Y paid | £Z remaining"
- 25% eligibility: "3/5 students — 2 more to qualify" progress indicator
- Per-enrollment: status badge showing "Funded — 25% eligible" or "Paid by Uni — Ready for full payment"

### Admin Dashboard
- Team commission overview with per-agent breakdown
- Admin's own commission (£100 × eligible students from team)

### Settings Page
- Admin commission rate configuration section (owner only)

---

## Code Changes Summary

1. **4 SQL migrations** (3 new tables + trigger for auto-snapshot)
2. **Update `src/lib/commissions.ts`** — add snapshot-based calculation helpers
3. **Redesign `CommissionsPage.tsx`** — payment tracking UI with "Record Payment" dialog
4. **Update `AgentDashboard.tsx`** — commission summary + eligibility progress
5. **Update `AdminDashboard.tsx`** — team commission view (create if needed)
6. **Update `SettingsPage.tsx`** — admin commission rate config
7. **Update status arrays** in EnrollmentsPage, StudentEnrollmentsTab, StudentNotesTab, StatusBadge — add `paid_by_university`
8. **Update `StudentFundingTab.tsx`** — funding_status options remain as-is (`approved` = "done")

---

## Post-Sprint: Invoicing Feature (noted for next sprint)

- Agent/Admin can generate an invoice from within the app for their commission
- Owner sees invoice with statuses: `submitted` → `received` → `in_review` → `paid`
- New `commission_invoices` table with PDF generation
- Will be planned in detail after this commission sprint is complete

