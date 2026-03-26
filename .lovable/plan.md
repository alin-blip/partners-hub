

## Plan: Admin Team Promo Banner

### What changes
Add support for **admin-level promotions** — team-based targets (e.g., "20 enrollments from your team = £1000 bonus"). The `PromoBanner` will work for both agents (personal target) and admins (team target).

### Database

**Add columns to `promotions` table:**
- `target_role` (text, default `'agent'`) — determines if promo is for agents or admins
- When `target_role = 'admin'`, the target counts team enrollments instead of personal ones

**Extend `agent_promotions` table** to also work for admins (the table name stays, but admins can also have records — the `agent_id` column works for any user ID).

No new tables needed — reuse existing `promotions` + `agent_promotions`.

### Migration SQL
```sql
ALTER TABLE public.promotions 
  ADD COLUMN target_role text NOT NULL DEFAULT 'agent';
```

### PromoBanner.tsx changes

1. **Remove `if (role !== "agent") return null`** — allow both agent and admin
2. **Fetch TWO promos** — one where `target_role = role` (agent gets agent promos, admin gets admin promos)
3. **For admin qualifying count**: count enrollments from the admin's team agents (students where `agent_id` is in the admin's team), not just their own
4. **Auto-create `agent_promotions` record** for admins too (same 30-day personal deadline logic)
5. Keep the same visual design — progress bar, countdown, congratulations state

### Admin enrollment counting logic
```typescript
// For admin: get team agent IDs first, then count enrollments for their students
const { data: teamAgents } = await supabase
  .from("profiles")
  .select("id")
  .eq("admin_id", user.id);

const agentIds = teamAgents?.map(a => a.id) || [];

const { count } = await supabase
  .from("enrollments")
  .select("id, students!inner(agent_id)", { count: "exact", head: true })
  .in("students.agent_id", agentIds)
  .in("status", QUALIFYING_STATUSES)
  .gte("created_at", agentPromo.started_at)
  .lte("created_at", agentPromo.personal_deadline);
```

### Owner Settings page
The existing `PromotionsSection` in `SettingsPage.tsx` needs a new field to select `target_role` (agent or admin) when creating/editing a promotion.

### Files to modify
- New migration — add `target_role` column to `promotions`
- `src/components/PromoBanner.tsx` — support both roles, team counting for admin
- `src/pages/owner/SettingsPage.tsx` — add `target_role` dropdown in promotions CRUD

