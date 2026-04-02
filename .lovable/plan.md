

# Enrollment Transfer with History Preservation and Approval Flow

## Current problem
The transfer overwrites the existing enrollment record (UPDATE in place), so the history of the previous university/course is lost.

## New behavior

### 1. Preserve history
Instead of updating the old enrollment, mark it with a new status `"transferred"` and **create a new enrollment** record for the destination university/course. Both records stay visible in the Enrollment History table, so you can always see the student was previously at Regent, for example.

### 2. Approval chain via email code
- **Agent** cannot transfer directly — they request a transfer, which sends a code to their **Admin** for approval
- **Admin** cannot transfer directly — they request a transfer, which sends a code to the **Owner** for approval
- **Owner** can transfer directly without a code

This reuses the existing `delete_confirmation_codes` table and `request-delete-code` / `verify-delete-code` edge functions pattern, generalized for transfer approvals.

---

## Technical changes

### Database migration
1. Add `"transferred"` to the known statuses displayed in the UI
2. Create a `transfer_requests` table to hold pending transfer requests:
   - `id`, `enrollment_id`, `requested_by`, `new_university_id`, `new_campus_id`, `new_course_id`, `new_intake_id`, `status` (pending/approved/rejected), `code` (6-char), `approver_id`, `created_at`, `approved_at`
   - RLS: requester can INSERT + SELECT own; approver can SELECT + UPDATE; owner can ALL
3. No need to reuse `delete_confirmation_codes` — a dedicated table is cleaner for this flow

### New Edge Function: `request-transfer-code`
- Called by agent or admin when they initiate a transfer
- Generates a 6-char code, stores in `transfer_requests`
- Sends email to the approver (admin for agent requests, owner for admin requests) using a new transactional email template `transfer-approval-code`
- Returns success

### New Edge Function: `verify-transfer-code`
- Called when the approver enters the code
- Validates code, marks `transfer_requests` as approved
- Executes the actual transfer: sets old enrollment to `"transferred"`, inserts new enrollment with status `"applied"`
- Returns success

### New email template: `transfer-approval-code`
- Similar to `admin-delete-code` template
- Shows: who requested, student name, from university/course → to university/course, the code

### UI changes (`StudentEnrollmentsTab.tsx`)
1. Transfer dialog gets a code verification step:
   - **Owner**: clicks Transfer → executes immediately (old enrollment → "transferred", new enrollment inserted)
   - **Admin**: clicks Transfer → calls `request-transfer-code` → shows "Code sent to owner, enter code" input → on submit calls `verify-transfer-code`
   - **Agent**: clicks Transfer → calls `request-transfer-code` → shows "Code sent to admin, enter code" input → on submit calls `verify-transfer-code`
   - Allow agents to also see the transfer button (currently `canTransfer` is owner+admin only) — agents should be able to initiate
2. "transferred" status gets a badge style (e.g., gray/neutral)
3. Old enrollment rows with status "transferred" show the history — no deletion

### Files to create
1. `supabase/migrations/...transfer_requests.sql` — new table + RLS
2. `supabase/functions/request-transfer-code/index.ts` — generate code + email
3. `supabase/functions/verify-transfer-code/index.ts` — verify + execute transfer
4. `supabase/functions/_shared/transactional-email-templates/transfer-approval-code.tsx` — email template
5. Update `supabase/functions/_shared/transactional-email-templates/registry.ts` — register template

### Files to modify
1. `src/components/student-detail/StudentEnrollmentsTab.tsx` — new approval flow UI, preserve history logic for owner
2. `src/components/StatusBadge.tsx` — add "transferred" badge style

