

# Restructure Enrollment Statuses

## Current vs New Status Mapping

```text
OLD STATUS              →  NEW STATUS (db value)         →  LABEL
──────────────────────────────────────────────────────────────────────
applied                 →  new_application               →  New Application
documents_pending       →  REMOVED
documents_submitted     →  REMOVED
processing              →  processing                    →  Processing
(new)                   →  assessment_booked             →  Assessment Booked
(new)                   →  pass                          →  Pass
(new)                   →  fail                          →  Fail
offer_received          →  REMOVED
accepted                →  REMOVED
funding                 →  REMOVED
(new)                   →  additional_requirements       →  Additional Requirements
(new)                   →  final_offer                   →  Final Offer
enrolled                →  enrolled                      →  Enrolled
active                  →  REMOVED
paid_by_university      →  REMOVED
(new)                   →  commission_25_ready           →  Commission 25% Ready
(new)                   →  commission_paid               →  Commission Paid
rejected                →  REMOVED (replaced by fail)
withdrawn               →  withdrawn                     →  Withdrawn
cancelled               →  cancelled                     →  Cancelled
transferred             →  transferred                   →  Transferred (kept for history)
```

## Critical Dependencies Found (13 files, 1 DB trigger, 1 DB constraint)

### 1. Database Constraint
- `enrollments_status_check` CHECK constraint — must be replaced with new values

### 2. Commission Trigger (`create_commission_snapshot`)
- Currently triggers snapshot on: `funding, enrolled, active, paid_by_university`
- **New logic**: Trigger on `final_offer` (creates snapshot, 25% commission eligible)
- Cancel on: `withdrawn, cancelled, fail`
- `commission_paid` status → release full payment (replaces `paid_by_university`)

### 3. Frontend Files to Update

| File | What references statuses |
|------|--------------------------|
| `StatusBadge.tsx` | All status labels + colors |
| `StudentEnrollmentsTab.tsx` | `STATUSES` array, consent gate text ("Applied" → "New Application") |
| `EnrollmentsPage.tsx` | `STATUSES` array, filter dropdown |
| `OwnerDashboard.tsx` | `PIPELINE_STATUSES`, `STATUS_LABELS` |
| `AgentDashboard.tsx` | Status display in tables |
| `AdminDashboard.tsx` | Status display in tables |
| `CommissionsPage.tsx` | snapshot status labels (unchanged), but enrollment status references |
| `PromoBanner.tsx` | `QUALIFYING_STATUSES` — update to new equivalents |
| `EnrollStudent.tsx` | Initial insert `status: "applied"` → `"new_application"` |
| `EnrollStudentDialog.tsx` | Initial insert `status: "applied"` → `"new_application"` |
| `LeadsPage.tsx` | Convert lead → enrollment uses `"applied"` |
| `NotificationBell.tsx` | Enrollment change notifications (uses dynamic status, OK) |
| `enrollment-emails.ts` | Dynamic `formatStatus()`, OK — just reads status values |

### 4. Edge Functions
| Function | Reference |
|----------|-----------|
| `verify-transfer-code` | Inserts `status: "applied"` → change to `"new_application"` |
| `elevenlabs-agent-token` | Prompt text mentions old statuses — update prompt |
| `submit-public-application` | May insert with default status — verify |

### 5. Existing Data Migration
- All existing `applied` rows → `new_application`
- All `documents_pending`, `documents_submitted` → `processing`
- All `offer_received`, `accepted` → `final_offer`
- All `funding` → `final_offer`
- All `active` → `enrolled`
- All `paid_by_university` → `commission_paid`
- All `rejected` → `fail`

## Implementation Steps

### Step 1: Database Migration
- Data migration: remap old status values to new ones
- Drop old constraint, add new `enrollments_status_check`
- Rewrite `create_commission_snapshot()` trigger:
  - Snapshot creation on `final_offer` (instead of funding/enrolled/active/paid_by_university)
  - Full release on `commission_paid` (instead of `paid_by_university`)
  - Cancel on `withdrawn, cancelled, fail`

### Step 2: Update StatusBadge.tsx
- Replace all old entries with new status config (labels + colors)

### Step 3: Update all STATUSES arrays
- `StudentEnrollmentsTab.tsx`, `EnrollmentsPage.tsx` — new ordered list
- Update consent gate message ("New Application" instead of "Applied")

### Step 4: Update dashboards
- `OwnerDashboard.tsx` — `PIPELINE_STATUSES` and `STATUS_LABELS`
- `PromoBanner.tsx` — `QUALIFYING_STATUSES` → `["final_offer", "enrolled", "commission_25_ready", "commission_paid"]`

### Step 5: Update all insert points
- 5 files that insert `status: "applied"` → `"new_application"`

### Step 6: Update edge functions
- `verify-transfer-code` — change insert status
- `elevenlabs-agent-token` — update prompt text

### Step 7: Commission logic
- `commission_25_ready` is an owner-controlled status (owner manually sets it when ready, e.g., after 5 students or at will)
- `commission_paid` triggers full release + marks the enrollment as commission-complete
- Owner can choose 1 or 2 tranches when setting `commission_paid` — add a `commission_tranches` field (1 or 2) to enrollments or commission_snapshots

## Risk Mitigation
- All data is migrated BEFORE the constraint is changed
- The trigger function is replaced in the same transaction
- No status value is left orphaned
- Email notifications use `formatStatus()` which auto-formats any snake_case — no breakage

