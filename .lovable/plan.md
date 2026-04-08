

# Fix: Stale Status Values in Two Locations

## Problem Found

The email **sending logic itself works correctly** — `formatStatus()` dynamically converts any snake_case status to Title Case (e.g., `new_application` → "New Application"). The raw DB values flow through properly.

However, there are **two places still using OLD status values**:

### 1. `StudentNotesTab.tsx` — Quick Status Update dropdown (lines 28-31)
Still has the OLD list:
```
"applied", "conditional_offer", "unconditional_offer",
"enrolled", "deferred", "rejected", "withdrawn"
```
This means the Quick Status Update card shows **wrong/outdated statuses** and would insert invalid values into the DB (violating the new constraint).

### 2. Email template `previewData` (cosmetic only)
`enrollment-status-change.tsx` line 90-91 has `oldStatus: 'applied'` and `newStatus: 'offer_received'` — these are only used for dashboard preview rendering, not actual emails. Minor but should be updated for consistency.

## Fix Plan

### File 1: `src/components/student-detail/StudentNotesTab.tsx`
- Replace `ENROLLMENT_STATUSES` array with the new status list from `status-utils.ts`
- Import `getVisibleStatuses` and `getAdminEditableStatuses` and use role-based filtering (same pattern as `StudentEnrollmentsTab.tsx`)
- This ensures the Quick Status Update dropdown only shows valid, role-appropriate statuses

### File 2: `supabase/functions/_shared/transactional-email-templates/enrollment-status-change.tsx`
- Update `previewData` to use new status values: `oldStatus: 'processing'`, `newStatus: 'final_offer'`
- Redeploy `send-transactional-email` edge function

No database changes needed. No other files affected — the actual email sending pipeline passes raw DB values correctly.

