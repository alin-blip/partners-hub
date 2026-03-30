

## Plan: University-Level Commission Settings + Dashboard Offer Cards

### What You Want
1. **Set commission per university** — instead of only global tiers, assign a specific commission rate (or starting tier) to each university (e.g., LSC = £600/student)
2. **Dashboard offer cards** — small promotional cards visible to agents/admins showing "Enroll at [University]: £[amount]/student"

### Database Changes

**New table: `university_commissions`**
- `id` (uuid, PK)
- `university_id` (uuid, references universities)
- `commission_per_student` (numeric, e.g. 600)
- `label` (text, optional — e.g. "Growth" or custom label)
- `is_highlighted` (boolean, default false — controls if it shows as a dashboard offer card)
- `highlight_text` (text, optional — e.g. "Inscrie studenti la LSC!")
- `created_at`, `updated_at`

RLS: owner full access, authenticated can read.

### UI Changes

**1. Settings > Commissions tab — University Commission Section**
- Below the existing global tiers, add a new section: "University Commission Rates"
- Table listing each university with a dropdown/input to set `commission_per_student` and a toggle for "Show on Dashboard"
- Owner can set a custom rate per university, or leave blank to use the global tier system

**2. Commission calculation logic update (`src/lib/commissions.ts`)**
- Update `calcCommission` to accept an optional `universityCommissions` map
- When calculating per-enrollment commission: if a university-specific rate exists, use it; otherwise fall back to the global tier system
- The CommissionsPage will aggregate per-agent totals using per-enrollment university rates

**3. CommissionsPage update**
- Fetch `university_commissions` and enrollments with `university_id`
- Calculate per-agent commission by summing each enrollment's university-specific rate (or global tier fallback)
- Show university breakdown per agent

**4. Dashboard offer cards**
- New component `CommissionOfferCards` — fetches `university_commissions` where `is_highlighted = true`, joined with university name
- Renders small colored cards: university name + "£X/student" + optional highlight text
- Placed on Agent Dashboard and Admin Dashboard (above or beside existing metrics)

### Files Changed
- **Migration**: Create `university_commissions` table with RLS
- **`src/pages/owner/SettingsPage.tsx`**: Add University Commission Rates section in Commissions tab
- **`src/lib/commissions.ts`**: Add per-university commission lookup
- **`src/pages/owner/CommissionsPage.tsx`**: Use per-university rates in calculations
- **`src/components/CommissionOfferCards.tsx`** (new): Dashboard offer card component
- **`src/pages/agent/AgentDashboard.tsx`**: Add `CommissionOfferCards`
- **`src/pages/admin/AdminDashboard.tsx`**: Add `CommissionOfferCards`

### How It Works (Summary)
- Owner goes to Settings > Commissions, sees universities listed, sets £600 for LSC, £500 for another, toggles "Show on Dashboard" for LSC
- Agent opens dashboard, sees a card: "LSC — £600/student"
- Commission calculations now use per-university rates instead of (or alongside) global tiers

