

# Plan: Role switching (Agent ↔ Admin) for Owner

## What it does
Owner can change a user's role between agent and admin directly from the Manage Users table. Students stay assigned to the user regardless of role change.

## Changes

### 1. Edge function: `create-owner/index.ts`
Add a new action `change_role` alongside the existing create flow:
- Accept `{ action: "change_role", user_id, new_role }` in the request body
- Verify caller is owner
- Update `user_roles` table: `UPDATE user_roles SET role = new_role WHERE user_id = target_user_id`
- If changing agent → admin: clear `admin_id` on their profile (they're no longer under an admin)
- If changing admin → agent: optionally set `admin_id`; also clear `admin_id` on any agents that were under this admin (reassign to null)
- Students table uses `agent_id` which references the user's profile ID — this doesn't change, so students remain assigned

### 2. Frontend: `AgentsPage.tsx`
- Add a role-change dropdown/select in the Actions column (or a separate dialog)
- For each non-owner user row, show a Select with "Agent" / "Admin" options
- On change, call the edge function with `action: "change_role"`
- Invalidate queries on success
- Don't allow changing owner's role

## Technical details
- `user_roles` has a UNIQUE constraint on `(user_id, role)` — we UPDATE the existing row, not insert a new one
- `students.agent_id` is just a UUID reference to profiles — no schema change needed, students stay put
- When admin becomes agent, their former team agents get `admin_id = null` (unassigned) — owner can reassign them later
- Only the owner role can perform this action (enforced server-side)

## Files modified
1. **`supabase/functions/create-owner/index.ts`** — add `change_role` action branch
2. **`src/pages/owner/AgentsPage.tsx`** — add role Select in table + mutation

