

## Plan: Enhanced Enrollment Flow, Student Hub with Tabs, Notes & Role Permissions

### Overview
Redesign the student journey into a clear pipeline: **Create Application → Upload Documents → Status Updates (owner/admin only) → Funding → Enrolled**. Consolidate everything about a student into one tabbed page. Add internal notes/messaging system.

### Current Problems
- No document upload step during enrollment
- Student detail page is flat (no tabs, hard to navigate)
- No notes/messaging system for internal communication
- Agents can change enrollment status (should be owner/admin only)
- No funding tracking
- No notification when owner/admin requests something from agent

### Changes

#### 1. Database: New `student_notes` table + `funding_status` column on enrollments

```sql
-- Notes/activity log per student
CREATE TABLE public.student_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  enrollment_id uuid,
  user_id uuid NOT NULL,
  content text NOT NULL,
  note_type text NOT NULL DEFAULT 'note', -- 'note', 'status_change', 'document_request', 'funding_update'
  is_agent_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add funding fields to enrollments
ALTER TABLE public.enrollments 
  ADD COLUMN funding_status text DEFAULT 'not_started',
  ADD COLUMN funding_type text,
  ADD COLUMN funding_reference text,
  ADD COLUMN funding_notes text;
```

Update enrollment statuses to: `applied`, `documents_pending`, `documents_submitted`, `processing`, `offer_received`, `accepted`, `funding`, `enrolled`, `active`, `rejected`, `withdrawn`

#### 2. EnrollStudent.tsx — Add Step 5: Document Upload

Change the wizard from 4 steps to 5:
1. Institution & Course (existing)
2. Applicant Details (existing)
3. Next of Kin (existing)
4. Document Upload (NEW) — Upload Passport/ID, Proof of Address, Other docs
5. Review & Submit (existing step 4, moved to 5)

After submit, navigate to the new student detail page instead of dashboard.

#### 3. StudentDetailPage.tsx — Full Redesign with Tabs

Replace the flat layout with a tabbed interface:
- **Overview** — Student info summary + current enrollment status timeline
- **Documents** — Upload/view/delete documents (existing functionality, moved to tab)
- **Enrollments** — Enrollment history with status (owner/admin can change status, agent read-only)
- **Funding** — SFE/funding tracking per enrollment (funding_status, type, reference, notes)
- **Notes** — Internal notes/activity log; owner/admin can post notes, flag "document request" type that alerts the agent

#### 4. Role-Based Permissions

| Action | Owner | Admin | Agent |
|---|---|---|---|
| View student details | All students | Own + team students | Own students |
| Edit student info | Yes | Yes | Yes (own only) |
| Upload documents | Yes | Yes | Yes (own only) |
| Change enrollment status | Yes | Yes | No (read-only) |
| Change funding status | Yes | Yes | No |
| Add notes | Yes | Yes | Yes (own students) |
| Send document request | Yes | Yes | No |

#### 5. StatusBadge — Add new statuses

Add: `documents_pending`, `offer_received`, `funding`, `withdrawn`, `not_started` (for funding)

#### 6. EnrollmentsPage — Enforce read-only for agents

Already partially done (`canEdit = role === "owner" || role === "admin"`), just ensure consistency.

### Files to Create
- `supabase/migrations/xxx_student_notes_funding.sql` (new table + enrollments columns)

### Files to Modify
- `src/pages/agent/EnrollStudent.tsx` — Add step 5 (document upload)
- `src/pages/shared/StudentDetailPage.tsx` — Full rewrite with tabs
- `src/components/StatusBadge.tsx` — Add new status colors
- `src/components/EnrollStudentDialog.tsx` — Add document upload step
- `src/integrations/supabase/types.ts` — Auto-updated

### Technical Details

**Student Notes RLS:**
- Owner: ALL on all notes
- Admin: SELECT/INSERT on notes for team students
- Agent: SELECT on notes where `is_agent_visible = true` for own students; INSERT own notes

**Funding statuses:** `not_started`, `application_submitted`, `approved`, `rejected`, `disbursed`

**Document upload in enrollment wizard:** Uses existing `student-documents` storage bucket. After the student record is created in step 5's submit, upload files and insert `student_documents` rows, then navigate to the student detail page.

