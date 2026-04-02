

# Plan: Online/Last-Seen Status (Messenger-style)

## What it does
Owner and Admin can see which users are currently online (green dot) or when they were last active ("Active 5 min ago"), displayed in the Messages page conversation list, chat header, and Agents management page.

## Changes

### 1. Database: new `user_presence` table + migration
```sql
CREATE TABLE public.user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_online boolean NOT NULL DEFAULT false
);
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
```
RLS policies:
- Owner/Admin can SELECT all rows
- Agents can SELECT rows of users they have conversations with
- Users can UPDATE/INSERT their own row (upsert on heartbeat)

Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;`

### 2. Presence hook: `src/hooks/usePresence.ts`
- On mount: upsert `user_presence` row with `is_online = true, last_seen_at = now()`
- Heartbeat every 60 seconds: update `last_seen_at`
- On `beforeunload` / unmount: set `is_online = false`
- Subscribe to realtime changes on `user_presence` for live updates
- Export a map of `userId -> { is_online, last_seen_at }`

### 3. DashboardLayout integration
- Call `usePresence()` in `DashboardLayout` so heartbeat runs on every authenticated page
- Pass presence data via context or direct hook usage in child pages

### 4. MessagesPage UI updates
- Conversation list: green dot on avatar when online, "Active X ago" subtitle when offline
- Chat header: show online/last-seen next to the user's name
- Use `formatDistanceToNow` for relative time display

### 5. AgentsPage UI updates
- Add an "Status" column showing green dot + "Online" or gray dot + "Last seen X ago"

## Files modified
1. **Database migration** — create `user_presence` table, RLS, realtime
2. **`src/hooks/usePresence.ts`** — new hook for heartbeat + realtime subscription
3. **`src/components/DashboardLayout.tsx`** — mount the presence hook
4. **`src/pages/shared/MessagesPage.tsx`** — green dots + last-seen text
5. **`src/pages/owner/AgentsPage.tsx`** — online status column

