

# Agent Tier Auto-Progression + Admin Tiers

## What's Missing Today

1. **Agent tier progression** works at snapshot-creation time (the trigger picks the right tier based on student count), but there's **no approval workflow** — the owner never gets a notification or approval prompt when an agent moves up a tier.

2. **Admin commission** is a **flat rate** per admin (`admin_commission_settings.rate_per_student`). There are no tiers for admins at all.

---

## What We'll Build

### 1. Admin Commission Tiers Table

Replace the single flat-rate `admin_commission_settings` with a tiered system, similar to agent `commission_tiers`:

New table: `admin_commission_tiers`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| admin_id | uuid | Nullable — NULL = global admin tiers |
| tier_name | text | e.g. "Starter", "Silver", "Gold" |
| min_students | integer | e.g. 0, 30, 50 |
| max_students | integer | Nullable |
| rate_per_student | numeric | e.g. 100, 150, 200 |

Keep `admin_commission_settings` for any admin-specific overrides, but add tiers as the primary mechanism.

### 2. Tier Upgrade Approval Workflow

New table: `tier_upgrade_requests`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | Agent or Admin requesting upgrade |
| user_role | text | 'agent' / 'admin' |
| current_tier_name | text | e.g. "Silver" |
| new_tier_name | text | e.g. "Gold" |
| current_rate | numeric | |
| new_rate | numeric | |
| student_count | integer | Count that triggered upgrade |
| status | text | 'pending' → 'approved' / 'rejected' |
| created_at | timestamptz | |
| reviewed_at | timestamptz | |
| reviewed_by | uuid | Owner who approved |

**How it works:**
- The snapshot trigger detects when an agent/admin qualifies for a higher tier
- Instead of auto-applying, it creates a `tier_upgrade_request` with status `pending`
- The snapshot still uses the **current (lower) tier rate** until approved
- Owner sees pending requests on the Commissions page with "Approve / Reject" buttons
- On approval: future snapshots use the new tier rate; optionally backfill existing pending snapshots

### 3. Database Trigger Update

Modify `create_commission_snapshot()` to:
- After resolving the agent rate, check if it's higher than the agent's last snapshot rate
- If higher → insert a row into `tier_upgrade_requests` and use the **previous rate** for the snapshot
- Same logic for admin rate using the new `admin_commission_tiers`

### 4. UI Changes

**Owner Commissions Page** — new section at top:
- "Pending Tier Upgrades" alert/card with approve/reject buttons
- Shows: agent/admin name, current tier → new tier, student count, rate change

**Settings Page**:
- Replace flat admin rate input with a tiers table (same CRUD as agent commission tiers)
- Add/edit/delete admin tiers with min/max students and rate

**Notifications**:
- Owner gets an in-app notification when a tier upgrade is pending

---

## Implementation Steps

1. **Migration**: Create `admin_commission_tiers` table with RLS + seed default tiers (0-29: £100, 30-49: £150, 50+: £200)
2. **Migration**: Create `tier_upgrade_requests` table with RLS (Owner ALL, Agent/Admin SELECT own)
3. **Migration**: Update `create_commission_snapshot()` trigger to check for tier jumps and create upgrade requests instead of auto-applying
4. **Update `SettingsPage.tsx`**: Replace `AdminCommissionSettingsSection` with tiered CRUD (like agent tiers)
5. **Update `CommissionsPage.tsx`**: Add "Pending Upgrades" section with approve/reject
6. **Update `NotificationBell.tsx`**: Include pending upgrade requests in notifications query

