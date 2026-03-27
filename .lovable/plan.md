

## Email Automations — Enrollment Status Change Triggers

### What this does
When an admin/owner changes an enrollment status, the system automatically sends an email notification to the student's agent informing them of the change. This ensures agents are always aware of status updates on their students' enrollments.

### Status change locations (all 3 must be wired)
1. **StudentEnrollmentsTab** — status dropdown on student detail page
2. **EnrollmentsPage** — status dropdown on the enrollments list page
3. **StudentNotesTab** — "Quick Status Update" section

### Changes

#### 1. New email template: `enrollment-status-change`

Create `supabase/functions/_shared/transactional-email-templates/enrollment-status-change.tsx`:
- Props: `studentName`, `universityName`, `courseName`, `oldStatus`, `newStatus`, `changedBy`
- Subject: dynamic — "Status Update: [Student Name] → [New Status]"
- Styled consistently with existing `note-notification` template (same colors, layout, branding)
- Register in `registry.ts`

#### 2. Helper function for sending the email

Create a shared helper (e.g. in a new `src/lib/enrollment-emails.ts`) that:
- Takes `enrollmentId`, `newStatus`, `oldStatus`
- Fetches the enrollment's student info (name, agent_id) and agent's email
- Calls `supabase.functions.invoke('send-transactional-email', ...)` with the template data
- Uses idempotency key: `enrollment-status-${enrollmentId}-${newStatus}-${timestamp}`

#### 3. Wire up all 3 status change locations

**StudentEnrollmentsTab.tsx** — in `updateStatus` mutation `onSuccess`:
- Call the helper with enrollment id, new status, and old status (capture old status before mutation)

**EnrollmentsPage.tsx** — in `updateStatus` mutation `onSuccess`:
- Same pattern: call the helper after successful status change

**StudentNotesTab.tsx** — in `updateStatusAndLog` mutation `onSuccess`:
- Same pattern: call the helper (already has enrollment context)

#### 4. Deploy edge functions

Redeploy `send-transactional-email` after adding the new template to the registry.

### Files to create/modify
- **Create**: `supabase/functions/_shared/transactional-email-templates/enrollment-status-change.tsx`
- **Edit**: `supabase/functions/_shared/transactional-email-templates/registry.ts` — add new template
- **Create**: `src/lib/enrollment-emails.ts` — shared helper
- **Edit**: `src/components/student-detail/StudentEnrollmentsTab.tsx` — wire email on status change
- **Edit**: `src/pages/shared/EnrollmentsPage.tsx` — wire email on status change
- **Edit**: `src/components/student-detail/StudentNotesTab.tsx` — wire email on status change

### Technical details
- No database changes needed — uses existing `send-transactional-email` edge function and email infrastructure
- Emails go to the student's agent (looked up via `students.agent_id` → `profiles.email`)
- Old status is captured before the mutation fires so the email can show "changed from X to Y"
- Idempotency keys prevent duplicate emails on retries

