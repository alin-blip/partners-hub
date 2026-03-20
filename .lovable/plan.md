

# Commission System Implementation

## What exists now
- `commission_tiers` table with `tier_name`, `min_students`, `max_students`, `commission_per_student`
- Agent dashboard shows "Commission Tier: —" (hardcoded placeholder)
- Owner dashboard shows "Est. Revenue" with hardcoded `agents * 500`
- No commission tracking page exists

## Plan

### 1. New page: `src/pages/owner/CommissionsPage.tsx`
Owner-only page showing:
- **Summary cards**: Total commission owed this month, total active students, average per agent
- **Agent commission table**: Each agent with their student count (active enrollments), matched tier, commission amount, admin they belong to
- **Monthly filter**: Select month/year to view historical data
- Commission is calculated client-side by counting each agent's active enrollments and matching against `commission_tiers`

### 2. Add "Commission Tiers" tab to Settings
- Add a new tab in `src/pages/owner/SettingsPage.tsx` for managing `commission_tiers` (CRUD)
- Fields: tier name, min students, max students, commission per student (£)

### 3. Update Agent Dashboard commission display
- In `src/pages/agent/AgentDashboard.tsx`, fetch `commission_tiers` and calculate the agent's current tier based on their active enrollment count
- Replace the "—" placeholder with actual tier name and earned commission amount

### 4. Update Owner Dashboard revenue metric
- In `src/pages/owner/OwnerDashboard.tsx`, calculate real revenue by summing commission across all agents based on their student counts and tiers

### 5. Add route and sidebar link
- New route `/owner/commissions` → `CommissionsPage`
- Add "Commissions" nav item with `PoundSterling` icon in `AppSidebar.tsx` for owner role

### Technical approach
- No database changes needed — `commission_tiers` table already exists
- Commission calculation: count agent's students with `status = 'active'` in enrollments, find matching tier where `count >= min_students AND (max_students IS NULL OR count <= max_students)`, multiply by `commission_per_student`
- All calculations done client-side with existing RLS policies

