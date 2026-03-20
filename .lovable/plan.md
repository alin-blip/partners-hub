

# Admin Agent Management

Currently, only the Owner can create and manage users (admins + agents) via `/owner/agents`. Admins have no way to add or manage their own agents.

## Changes

### 1. New page: `src/pages/admin/AdminAgentsPage.tsx`
- Similar to the Owner's AgentsPage but scoped to the admin's team
- Shows only agents assigned to the current admin (`admin_id = auth.uid()`)
- "Add Agent" dialog that creates an agent user via the `create-owner` edge function (repurposed to be a generic user creation function) or via `supabase.auth.signUp` + role insert
- Automatically sets `admin_id` to the current admin's user ID
- Can only create agents (not admins or owners)
- Toggle active/inactive for their agents

### 2. Update Edge Function: `supabase/functions/create-owner/index.ts`
- Rename/generalize to handle any role creation (agent, admin, owner)
- Accept `role` and `admin_id` parameters
- Validate that only authorized callers can create users (check caller's role)

### 3. Update Sidebar: `src/components/AppSidebar.tsx`
- Add "My Agents" nav item for admin role pointing to `/admin/agents`

### 4. Update Routes: `src/App.tsx`
- Add route `/admin/agents` → `AdminAgentsPage`

### 5. RLS consideration
- Admins already have SELECT on profiles where `admin_id = auth.uid()`
- The edge function uses the service role key, so it bypasses RLS for user creation
- Profile update for `admin_id` will be done by the edge function with service role

### Technical details
- The edge function approach is necessary because `supabase.auth.signUp` from the client would log out the current admin (it switches the session to the new user)
- The edge function will accept `{ email, password, full_name, role, admin_id }` and use `auth.admin.createUser` to avoid session issues

