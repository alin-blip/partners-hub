

# Show Agent & Admin info on every student — across the platform

## Problem
Currently, the platform tracks `agent_id` on each student, but in many views:
- **Students list** — no agent or admin columns shown
- **Student detail page** — shows agent name but NOT the admin the agent belongs to
- **Enrollments list** — no agent or admin columns
- **Student Overview tab** — shows agent, no admin

The user wants to always see which agent owns a student AND which admin that agent reports to.

## Changes

### 1. Students list page (`src/pages/shared/StudentsPage.tsx`)
- Expand the query to also fetch `agent_id`
- Join agent profile to get agent name: query `students` with a nested select on `profiles` via `agent_id`
- For owner/admin views, also resolve the agent's `admin_id` → admin name
- Add **Agent** and **Admin** columns to the table (hidden on mobile)

### 2. Student detail page header (`src/pages/shared/StudentDetailPage.tsx`)
- Already fetches `agentProfile` — extend it to also fetch `admin_id` from the agent's profile
- If `admin_id` exists, fetch admin name too
- Display admin name alongside agent name in the page header or pass to Overview tab

### 3. Student Overview tab (`src/components/student-detail/StudentOverviewTab.tsx`)
- Add an **Admin** field below the existing Agent field in the read-only view
- Accept `adminName` as a new prop (fetched from parent)

### 4. Enrollments list page (`src/pages/shared/EnrollmentsPage.tsx`)
- Expand enrollment query to also join `students.agent_id` → `profiles(full_name, admin_id)`
- For admin info, do a separate lookup of admin profiles
- Add **Agent** column to the enrollments table (for owner/admin roles)

### 5. Duplicate contact message (already done)
- The message in `EnrollStudentDialog.tsx` and `EnrollStudent.tsx` already includes the agent name — no changes needed here.

## Files to modify
1. `src/pages/shared/StudentsPage.tsx` — add agent & admin columns
2. `src/pages/shared/StudentDetailPage.tsx` — fetch & pass admin name
3. `src/components/student-detail/StudentOverviewTab.tsx` — display admin name
4. `src/pages/shared/EnrollmentsPage.tsx` — add agent column

