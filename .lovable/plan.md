

## Plan: Dynamic Tier Linking for University Commissions

### Current Problem
When you assign a tier to a university, the system copies the `commission_per_student` value at save time. It's static — changing the tier later doesn't update the university rate. Also, adding more tiers doesn't conflict, but the UI doesn't make this clear.

### What Changes

**1. Make university commissions dynamically linked to tiers**
- When a university has a `tier_id` set, the commission calculation should look up the tier's current rate at calculation time, not use the stored `commission_per_student`
- The `commission_per_student` field becomes a fallback only used for "Custom" (no tier selected)

**2. Update `calcCommissionByEnrollments` in `src/lib/commissions.ts`**
- Accept university commissions with `tier_id` included
- When a uni commission has a `tier_id`, look up the current tier rate from the tiers array
- When no `tier_id`, use the stored `commission_per_student` (custom rate)

**3. Update Settings UI (`src/pages/owner/SettingsPage.tsx`)**
- In the university commissions table, show the **current** tier rate (from the linked tier), not the stored value
- Add a visual indicator: "Linked to Gold tier" vs "Custom £600"
- When saving with a tier selected, still store `commission_per_student` as a snapshot but the calculation will use live tier data

**4. Update CommissionsPage and dashboards**
- Pass full tier data alongside university commissions so the dynamic lookup works

### Files Changed
- `src/lib/commissions.ts` — update `UniversityCommission` interface + `calcCommissionByEnrollments` to use live tier rates
- `src/pages/owner/SettingsPage.tsx` — show live tier rate in table, clarify UI
- `src/pages/owner/CommissionsPage.tsx` — pass tier data for dynamic lookup
- `src/components/CommissionOfferCards.tsx` — use live tier rate for display

### How It Works After
- Owner sets LSC → Gold tier (£600/student)
- Later, owner updates Gold tier to £650/student
- LSC commission automatically becomes £650 — no need to re-edit each university
- Universities with "Custom" rate stay at whatever was manually entered
- Global tiers still apply as fallback for universities without any specific commission set

