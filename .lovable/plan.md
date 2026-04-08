

# Plan: Audit and fix notification isolation + read state

## Current Issues Found

### 1. Leads — Admin has no filter
Line 148: only agents get `agent_id = user.id` filter. Admins have no explicit filter. RLS on `leads` table has no admin SELECT policy, so admins get 0 results — but this is fragile. If an admin policy is added later, they'd see all team leads as notifications.
**Fix**: Add explicit `agent_id = user.id` filter for admin too (admins who are also lead owners see only their own).

### 2. Enrollments — No scoping beyond RLS
The enrollment notifications query (line 119) fetches all visible enrollments from last 7 days. For agents, RLS limits to own students — correct. For admins, RLS shows own + team enrollments — this is fine since admins should see team activity. No change needed.

### 3. Messages — Already correct
RLS on `direct_conversations` ensures users only see their own conversations. The query further filters `sender_id != user.id`. No change needed.

### 4. Read state (dot disappearing)
Current implementation uses localStorage (`read-notification-ids`). The mechanism works: click notification → `markAsRead(id)` → `setReadIds(getReadIds())` → dot disappears and background changes.

**Potential issue**: The notification IDs are stable (e.g., `msg-{uuid}`, `task-{uuid}`), so once read they stay read. However, if the user reads a message via the Messages page directly (not via notification click), the notification still shows as "unread" in the bell because localStorage wasn't updated. For messages specifically, we should cross-check against `read_at` on `direct_messages` — if `read_at` is set, don't show the notification at all (it's already filtered by `is("read_at", null)`, so this is already handled).

**No bugs found** in the read/unread dot mechanism itself.

### 5. Tasks, Social, Invoices — Already correct
All filtered by `user.id` explicitly. No cross-user leakage.

---

## Changes

### `src/components/NotificationBell.tsx`
- **Leads section** (line 148): Change condition from `if (role === "agent")` to `if (role !== "owner")` so both agents AND admins get the `agent_id = user.id` filter. This ensures an admin only sees leads they personally own, not their team's leads as notifications.
- **Add `user.id` to localStorage key**: Change `STORAGE_KEY` to include user ID (`read-notification-ids-${userId}`) so different users on the same browser don't share read state. This prevents the edge case where two users on the same device see each other's read/unread state.

### Summary
- 1 file modified: `NotificationBell.tsx`
- 2 small changes: leads filter + per-user localStorage key
- Zero DB changes needed — RLS already enforces isolation correctly
- Zero risk to existing functionality

