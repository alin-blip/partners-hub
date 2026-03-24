

# Plan: Owner & Admin Can Enroll Students Directly

## Problem
Currently only agents can enroll students (`/agent/enroll`). The `EnrollStudent` component is hardcoded with `allowedRoles={["agent"]}` and uses `agent_id: user!.id`. Owner and Admin need the same capability.

## Current RLS constraints
- `students` table: Agent inserts with `agent_id = auth.uid()`. Owner has full access via `has_role('owner')`. **Admin has NO insert policy** — only SELECT on team students.
- `enrollments` table: Agent inserts where student belongs to them. Owner has full access. **Admin has NO insert policy**.

## Changes needed

### 1. Database migration — Add RLS insert policies for Admin
- Add INSERT policy on `students` for admin: `has_role(auth.uid(), 'admin') AND agent_id = auth.uid()` — admin's personal students use their own ID as agent_id
- Add INSERT policy on `enrollments` for admin: similar to agent policy but checking admin role

### 2. Refactor `EnrollStudent.tsx`
- Change `allowedRoles` to `["agent", "admin", "owner"]`
- `agent_id` in student insert already uses `user!.id` — this works for all roles (owner/admin enrolling personally)
- After success, navigate to `${prefix}/dashboard` instead of hardcoded `/agent/dashboard`
- Invalidate queries more broadly (not just `agent-*` keys)

### 3. Add routes in `App.tsx`
- Add `/owner/enroll` and `/admin/enroll` routes pointing to the same `EnrollStudent` component

### 4. Add "Enroll Student" to sidebar for Owner & Admin
- In `AppSidebar.tsx`, add the enroll link with `UserPlus` icon for all roles (currently only agent has it via dashboard button)

### Technical details
- The `students.agent_id` column serves as "created_by" — works for any role
- Owner already has ALL policy so no new RLS needed for owner
- Admin needs 2 new INSERT policies (students + enrollments)

