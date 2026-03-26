

## Plan: Email Notifications for Urgent Notes + Urgent Notes Indicator on Students List

### Two features

**1. Email notification to the agent** when an owner/admin adds an urgent or action_required note on their student. After inserting the note, call the `send-transactional-email` edge function with the agent's email and note details.

**2. Urgent notes count badge** on the Students list table — a small orange badge next to each student's name showing the count of unresolved urgent/action_required notes.

---

### Prerequisites — Email Infrastructure

The project has a verified email domain (`notify.agents-eduforyou.co.uk`) but no transactional email infrastructure yet. Before wiring up notifications:

1. Call `setup_email_infra` to create pgmq queues, RPC wrappers, cron job
2. Call `scaffold_transactional_email` to create the `send-transactional-email` edge function and template structure
3. Create a `note-notification` email template
4. Deploy edge functions

### Implementation

**Database**: No schema changes needed. We'll query `student_notes` for urgent counts.

**New email template** (`supabase/functions/_shared/transactional-email-templates/note-notification.tsx`):
- Shows student name, note type (Urgent / Action Required / etc.), note content, and a link to the student detail page
- Styled with the existing brand (navy + orange accent)

**`src/components/student-detail/StudentNotesTab.tsx`**:
- After successfully inserting an urgent or action_required note, look up the student's `agent_id`, fetch the agent's email from `profiles`, and invoke `send-transactional-email` with:
  - `templateName: 'note-notification'`
  - `recipientEmail: agentEmail`
  - `templateData: { studentName, noteType, content }`
  - `idempotencyKey: 'note-{noteId}'`

**`src/pages/shared/StudentsPage.tsx`**:
- Add a second query to fetch urgent note counts grouped by student_id: `SELECT student_id, count(*) FROM student_notes WHERE (is_urgent = true OR note_type IN ('action_required', 'info_request')) GROUP BY student_id`
- Display a small orange `Badge` with a flame icon + count next to the student name in the table when count > 0

### Files to modify/create
- Email infrastructure setup (tools — no code files)
- `supabase/functions/_shared/transactional-email-templates/note-notification.tsx` — new template
- `supabase/functions/_shared/transactional-email-templates/registry.ts` — register template
- `src/components/student-detail/StudentNotesTab.tsx` — send email after note insert
- `src/pages/shared/StudentsPage.tsx` — fetch urgent counts, show badge

