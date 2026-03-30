

## Plan: Commission Stages + University-Specific Tier Sets

### 1. Commission Stages on CommissionsPage

Currently the page only shows commissions for `active` enrollments. You want two categories:

- **Possible Commission** — enrollments in offer stage (`offer_received`, `accepted`) — money that could come in
- **Generated Commission** — enrollments in `active` stage — confirmed commission

**Changes to `CommissionsPage.tsx`:**
- Fetch enrollments with status IN (`offer_received`, `accepted`, `active`) instead of only `active`
- Split into two groups: `possibleEnrollments` (offer_received + accepted) and `generatedEnrollments` (active)
- Add two new MetricCards: "Possible Commission" and "Generated Commission" (replacing or alongside current "Total Commission")
- In the agent breakdown table, show two commission columns: "Possible" and "Generated"
- The per-university breakdown also splits by stage

### 2. University-Specific Commission Tiers

Currently `commission_tiers` is a single global set. You want the ability to create tier sets per university (e.g., "Premium" tiers for University X with different ranges/rates).

**Database migration:**
- Add `university_id` column (uuid, nullable, references universities) to `commission_tiers` table
- NULL = global tier (current behavior), set = university-specific tier

**Changes to `SettingsPage.tsx` (CommissionTiersSection):**
- Add a "University" dropdown (optional) when creating/editing a tier — leave empty for global
- Group tiers visually: "Global Tiers" section + per-university tier sections
- Show university name badge next to university-specific tiers

**Changes to commission calculation (`commissions.ts`):**
- Update `calcCommissionByEnrollments` logic:
  1. For each enrollment, check if there are university-specific tiers for that university
  2. If yes, match the agent's student count **at that university** against those uni-specific tiers
  3. If no uni-specific tiers exist, check for a `university_commissions` entry (custom/linked tier)
  4. Fallback to global tiers

**Changes to `CommissionsPage.tsx`:**
- Pass university-specific tiers to breakdown calculation
- Show tier source correctly (e.g., "Uni Tier: Premium Gold" vs "Global: Gold")

### Files Changed
- **Migration**: Add `university_id` to `commission_tiers`
- **`src/lib/commissions.ts`**: Update calculation to support uni-specific tiers + stage splitting
- **`src/pages/owner/CommissionsPage.tsx`**: Two-stage metrics, split breakdown, uni tier awareness
- **`src/pages/owner/SettingsPage.tsx`**: University selector in tier CRUD, grouped display

### Technical Detail

```text
commission_tiers
├── Global (university_id = NULL)
│   ├── Bronze: 1-5 students → £400
│   ├── Silver: 6-10 → £500
│   └── Gold: 11+ → £600
└── University X (university_id = 'xxx')
    ├── Premium Bronze: 1-3 → £700
    ├── Premium Silver: 4-8 → £800
    └── Premium Gold: 9+ → £900

Priority order per enrollment:
1. University-specific tiers (matched by agent's count at that uni)
2. University commission (custom rate or linked global tier)
3. Global tiers (matched by total count)
```

