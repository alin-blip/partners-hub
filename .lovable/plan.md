

## Task Management Improvements

### Problems to solve
1. Agent sees "Manage and track team tasks" — wrong wording for agents
2. Agents cannot create their own tasks (personal to-dos)
3. Notes like "document_request", "action_required", "info_request" from StudentNotesTab don't appear as tasks — easy to miss
4. Need clear visual distinction between assigned tasks (from owner/admin) and self-created tasks

### Changes

#### 1. Database: Add `source` column + allow agent INSERT

**Migration:**
- Add `source` column to `tasks` table: `text NOT NULL DEFAULT 'manual'` (values: `manual`, `student_note`)
- Add `student_id` column: `uuid REFERENCES profiles(id) ON DELETE SET NULL` — links task to a student when auto-created from notes
- Add RLS policy: **Agent inserts own tasks** — `WITH CHECK (created_by = auth.uid() AND assigned_to = auth.uid())` — agents can only create tasks assigned to themselves
- Add RLS policy: **Agent deletes own created tasks** — agents can delete tasks they created themselves (not ones assigned by admin/owner)

#### 2. Auto-create tasks from Student Notes

In `StudentNotesTab.tsx`, when an admin/owner adds a note of type `document_request`, `info_request`, or `action_required`:
- After inserting the note, also insert a task into the `tasks` table:
  - `title`: auto-generated from note type + student name (e.g. "Document Request: John Smith")
  - `description`: the note content
  - `assigned_to`: the student's `agent_id`
  - `created_by`: the admin/owner user id
  - `source`: `"student_note"`
  - `student_id`: the student's id
  - `priority`: `"high"` if urgent, `"medium"` otherwise

This guarantees every actionable request appears in the agent's Tasks board.

#### 3. TasksPage UI changes

**Header text:**
- Owner/Admin: "Manage and track team tasks"
- Agent: "Your tasks and to-dos"

**Agent can create tasks:**
- Show "New Task" button for agents too
- Agent create form: simpler — no "Assigned To" dropdown (auto-assigns to self)
- Agent-created tasks get `source: 'manual'`

**Visual distinction on task cards:**
- Tasks with `source === 'student_note'` show a small badge/icon (e.g. `GraduationCap` icon + student name link)
- Tasks created by the agent themselves show a "Personal" badge
- Tasks assigned by admin/owner show "Assigned" badge with creator name

**Task card enhancement:**
- If `student_id` is set, show student name and make it clickable (navigates to student detail)

#### 4. Places where admin/owner can trigger tasks for agents

| Location | Trigger | How it creates a task |
|----------|---------|----------------------|
| **Student Notes Tab** | Adding `document_request`, `info_request`, `action_required` note | Auto-inserts task assigned to student's agent |
| **Tasks Page** | Manual "New Task" creation | Owner/admin picks agent from dropdown |

These are the two entry points. The StudentNotesTab auto-creation ensures nothing is missed.

### Technical details

- New migration: `ALTER TABLE tasks ADD COLUMN source text NOT NULL DEFAULT 'manual'`, `ADD COLUMN student_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL`
- New RLS: agent INSERT policy with `created_by = auth.uid() AND assigned_to = auth.uid()`
- New RLS: agent DELETE policy with `created_by = auth.uid()`
- `StudentNotesTab.tsx`: after `addNote` mutation succeeds for actionable types, call `supabase.from("tasks").insert(...)` to create the linked task
- `TasksPage.tsx`: fetch `profiles` for all roles (not just canManage) to show names; adjust header/subtitle; add source badges; allow agent to create tasks

### Files to modify
- **Migration**: new SQL migration
- `src/pages/shared/TasksPage.tsx` — UI changes, agent create, source badges
- `src/components/student-detail/StudentNotesTab.tsx` — auto-create task on actionable notes

