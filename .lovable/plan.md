

# Fix: Online Status Shows "Never" for All Users

## Root Causes

### 1. Stale `is_online` flag — users never go offline
The `sendBeacon` on tab close (line 73-78 of `usePresence.ts`) sends a REST API request **without** the required `apikey` and `Authorization` headers. Supabase rejects it silently, so `is_online` stays `true` forever. Some users show `is_online: true` with `last_seen_at` from hours ago.

### 2. "Never" for all users — presenceMap may be empty
Some newly created users have no `user_presence` row at all, and the fetch may be returning data but the map lookup fails, or the query returns empty due to a runtime issue with the `as any` cast.

### 3. No offline cleanup mechanism
There's no server-side or client-side logic to mark users as offline when their heartbeat stops (last_seen_at > 2 minutes ago).

## Solution

### 1. Fix `usePresence.ts` — derive online status from `last_seen_at`
Instead of trusting `is_online` (which is broken), compute online status client-side:
- A user is "online" if `last_seen_at` is within the last 2 minutes
- Remove `as any` casts since `user_presence` is in the types
- Fix `sendBeacon` to include required headers (apikey + auth token)

### 2. Fix `AgentsPage.tsx` — improve display logic
Update the Online column to use the derived status:
- Show green dot + "Online" if `last_seen_at` < 2 min ago
- Show gray dot + relative time ("5 min ago", "2 hours ago") otherwise
- Show "Never" only if there's truly no presence row

### 3. Fix `AdminAgentsPage.tsx` — same pattern
Apply the same fix to the admin view.

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/usePresence.ts` | Remove `as any`, fix sendBeacon headers, derive `is_online` from `last_seen_at` |
| `src/pages/owner/AgentsPage.tsx` | Update Online column to use time-based online detection |
| `src/pages/admin/AdminAgentsPage.tsx` | Same fix for admin view |

