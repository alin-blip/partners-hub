

## Task Management — Kanban Board

### Overview
Build a task management system with a Kanban board where owners and admins can create tasks, assign them to agents, set deadlines, and track status (To Do, In Progress, Done). Agents can view and update their own tasks.

### 1. Database

**New table: `tasks`**
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| title | text | — | Required |
| description | text | null | Optional |
| status | text | 'todo' | 'todo', 'in_progress', 'done' |
| priority | text | 'medium' | 'low', 'medium', 'high' |
| assigned_to | uuid | null | References profiles(id) — the agent |
| created_by | uuid | — | The owner/admin who created it |
| deadline | timestamptz | null | Optional due date |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

**RLS policies:**
- Owner: full access (ALL)
- Admin: SELECT/INSERT/UPDATE on tasks where `assigned_to` is self or one of their agents; also tasks they created
- Agent: SELECT/UPDATE own tasks (`assigned_to = auth.uid()`)

**Trigger:** `update_updated_at_column` on UPDATE (already exists as a function).

### 2. Frontend — New Page

**File: `src/pages/shared/TasksPage.tsx`**

Kanban board with 3 columns: **To Do**, **In Progress**, **Done**

Each task card shows:
- Title, priority badge (color-coded)
- Assigned agent name (avatar or initials)
- Deadline (with overdue highlighting in red)
- Click to open detail dialog

**Create Task Dialog** (owner/admin only):
- Title (required), Description (textarea), Priority (select), Assigned To (select from agents list), Deadline (date picker)

**Task Detail Dialog:**
- View/edit all fields
- Owner/admin can edit everything; agent can only change status (drag or dropdown)

**Drag-and-drop:** Use native HTML drag & drop for moving cards between columns (no extra library needed).

### 3. Routing & Sidebar

- Add route `/owner/tasks`, `/admin/tasks`, `/agent/tasks` → `<TasksPage />`
- Add "Tasks" item to sidebar `mainItems` array with `ListTodo` icon (from lucide-react), visible to all roles

### 4. Technical Details

- React Query for data fetching with `queryKey: ["tasks"]`
- Mutations for create, update status, update details
- Agent dropdown populated from `profiles` table filtered by role
- Date picker using Shadcn Popover + Calendar pattern with `pointer-events-auto`
- No additional dependencies needed

