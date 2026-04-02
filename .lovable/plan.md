

# Restructure Lead Visibility by Role

## Summary
Currently admins can see all their team's lead details. The new rules:
- **Agent**: sees only own leads (no change)
- **Admin**: sees only own leads + a summary showing lead COUNT per agent (no details)
- **Owner**: sees own leads separately + a full "All Leads" view with agent/admin attribution

## Changes

### 1. Database: Remove admin team lead access
**Migration**: Drop two RLS policies on `leads`:
- `Admin reads team leads` (SELECT)
- `Admin updates team leads` (UPDATE)

Admins will now only see their own leads via the existing `Agent reads own leads` policy (which checks `agent_id = auth.uid()`).

### 2. Database: Create function for admin lead counts
A `SECURITY DEFINER` function so admins can see how many leads each of their agents has, without reading the actual lead rows:

```sql
CREATE FUNCTION get_team_lead_counts(_admin_id uuid)
RETURNS TABLE(agent_id uuid, agent_name text, lead_count bigint)
SECURITY DEFINER
```

This queries `leads` joined with `profiles` where `profiles.admin_id = _admin_id`, grouped by agent.

### 3. UI: Restructure `src/pages/shared/LeadsPage.tsx`

**For Agent** (no change): Shows own leads table as before.

**For Admin**: 
- Top section: "Team Lead Summary" card grid showing each agent's name + lead count (from the new RPC function). No clickable details.
- Below: "My Leads" table showing only the admin's own leads (same table as before).

**For Owner**:
- Tabs: **"My Leads"** | **"All Leads"**
- "My Leads" tab: leads where `agent_id = user.id`
- "All Leads" tab: full table with extra columns for Agent and Admin. Fetches agent profiles with `admin_id` to resolve the admin name. Same search/filter/actions as before.

### Files to modify
1. **Migration** — drop 2 RLS policies + create `get_team_lead_counts` function
2. `src/pages/shared/LeadsPage.tsx` — role-based UI restructuring with tabs for owner, summary cards for admin

