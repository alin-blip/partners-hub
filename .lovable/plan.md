

## Plan: Personalized Promo Banner with Agent Progress

### What changes
The PromoBanner will show each agent's individual progress toward the promotion target — e.g., "2/5 students · Mai ai 3" — by counting their qualifying enrollments (status = `offer_received`, `accepted`, `enrolled`, `active`) created during the promo period.

### Database
**New table: `agent_promotions`** — tracks when each agent joins a promo (their personal 30-day timer starts then):

```sql
CREATE TABLE public.agent_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  personal_deadline timestamptz NOT NULL,
  UNIQUE(promotion_id, agent_id)
);
-- RLS: agents read own, owner/admin read all
```

When an agent first sees the promo, auto-insert a row with `personal_deadline = now() + 30 days`. The countdown timer uses this personal deadline instead of the global one.

### PromoBanner changes

1. **Fetch agent's personal promo record** — if none exists, auto-create one (upsert on first view)
2. **Count qualifying enrollments** — query enrollments for this agent's students created after `started_at` with status in (`offer_received`, `accepted`, `enrolled`, `active`)
3. **Show progress**: Replace the generic target text with:
   - Progress bar or fraction: `🎯 2/5 students · Mai ai 3`
   - Countdown uses `personal_deadline` instead of global `deadline`
4. **If target reached**, show a congratulations state instead

### Files to modify
- `src/components/PromoBanner.tsx` — add auth context, fetch personal promo + enrollment count, show progress
- New migration for `agent_promotions` table

### No other files affected
The banner is already used in `AgentDashboard.tsx`. Owner/admin dashboards don't show it (they don't have the agent role check).

