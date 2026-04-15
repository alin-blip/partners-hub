

# Plan: Agent Password Visibility & Reset for Admins/Owners

## What We're Building
A feature that lets Admins see and change passwords for their own agents, and Owners see and change passwords for all users. The last-set password will be stored so it can be viewed.

## Database Changes

### New table: `user_passwords`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid NOT NULL UNIQUE | References the user |
| password_plaintext | text NOT NULL | Last-set password |
| set_by | uuid | Who set it |
| updated_at | timestamptz | |

### RLS Policies
- **Owner SELECT/UPDATE**: `has_role(auth.uid(), 'owner')` — sees all
- **Admin SELECT**: Admin can see passwords only for agents where `profiles.admin_id = auth.uid()`
- **INSERT/UPDATE**: Only via service_role (edge function)
- No agent access, no DELETE

## Edge Function: `reset-user-password`
- Accepts `{ user_id, new_password }`
- Validates caller is owner (any user) or admin (only their agents via `profiles.admin_id`)
- Calls `supabaseAdmin.auth.admin.updateUser(user_id, { password: new_password })`
- Upserts into `user_passwords` table
- Returns success/error

## Backfill
- Update `create-owner` edge function to also insert into `user_passwords` when creating a new user, so passwords are tracked from creation

## UI Changes

### `src/pages/owner/AgentsPage.tsx`
- Add a "Password" column or an action button per row
- Click opens a dialog showing the current stored password + input to set a new one
- Calls `reset-user-password` edge function

### `src/pages/admin/AdminAgentsPage.tsx`
- Same pattern but only for the admin's own agents (already filtered by `admin_id`)

## Files to Create/Modify

| File | Change |
|------|--------|
| Migration | Create `user_passwords` table with RLS |
| `supabase/functions/reset-user-password/index.ts` | New edge function |
| `supabase/functions/create-owner/index.ts` | Add upsert to `user_passwords` on user creation |
| `src/pages/owner/AgentsPage.tsx` | Add view/reset password UI |
| `src/pages/admin/AdminAgentsPage.tsx` | Add view/reset password UI |

## Security Notes
- Plaintext password storage is intentional per the user's request (admin visibility)
- RLS ensures admins only see their own agents' passwords
- The edge function double-checks authorization before resetting

