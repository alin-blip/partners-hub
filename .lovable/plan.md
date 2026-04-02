

# Fix Owner Lookup, Remove Consent Step, Block Status, Make Fields Required

## Problems Identified

1. **Admin can't find owner** when hitting duplicate — the `user_roles` table RLS only allows users to read their own role (`user_id = auth.uid()`). When an admin queries `user_roles` for `role = 'owner'`, it returns empty. This affects `handleContactAdmin` in all 3 files (LeadsPage, EnrollStudentDialog, EnrollStudent).

2. **Consent form step** should be removed from enrollment forms — consent is sent automatically via email after enrollment.

3. **Enrollment status** should not progress past "applied" until consent form is signed.

4. **Fields should be mandatory** in the new student enrollment form.

---

## Changes

### 1. Database: Add RLS policy so authenticated users can find owner role
- Add a new SELECT policy on `user_roles`: *"Authenticated can find owner"* — `role = 'owner'` for all authenticated users. This allows admins/agents to look up who the owner is without exposing other roles.

### 2. Fix `handleContactAdmin` — all 3 files
Files: `src/pages/shared/LeadsPage.tsx`, `src/components/EnrollStudentDialog.tsx`, `src/pages/agent/EnrollStudent.tsx`
- The owner lookup logic already works correctly in code — the fix is purely the RLS policy above. No code changes needed for this issue.

### 3. Remove consent step from enrollment forms (6 steps → 5 steps)
Files: `src/components/EnrollStudentDialog.tsx`, `src/pages/agent/EnrollStudent.tsx`
- Remove Step 5 (Consent Form) entirely — all consent state variables, UI, and the `generateAndUploadConsentPdf` call from the submit mutation
- Renumber Step 6 (Review) → Step 5; update `totalSteps` from 6 to 5
- Remove consent-related imports (SignatureCanvas, consent-clauses, signature-utils)
- Remove the "Consent form signed by" section from the Review step
- Keep the auto-send consent email logic in `onSuccess` (already exists in EnrollStudent.tsx)
- Add auto-send consent email in `EnrollStudentDialog.tsx` onSuccess (same pattern as EnrollStudent.tsx)

### 4. Block enrollment status change past "applied" without signed consent
File: `src/components/student-detail/StudentEnrollmentsTab.tsx`
- Fetch `consent_signing_tokens` for the student to check if any token has `status = 'signed'`
- When rendering the status dropdown, if consent is not signed, filter STATUSES to only show "applied" (or show a tooltip/warning explaining why)
- Show an info message: "Consent form must be signed before the status can progress beyond Applied."

### 5. Make all fields mandatory in enrollment form
Files: `src/components/EnrollStudentDialog.tsx`, `src/pages/agent/EnrollStudent.tsx`
- Update `canProceedStep2` validation to require: firstName, lastName, nationality, gender, dob, email, phone, fullAddress, immigrationStatus
- Update labels to show `*` for all required fields
- Next of Kin (Step 3): make nokName, nokPhone, nokRelationship required — add validation gate

### Files to modify
1. **Migration** — new RLS policy on `user_roles`
2. `src/components/EnrollStudentDialog.tsx` — remove consent step, make fields required, add auto-send consent email
3. `src/pages/agent/EnrollStudent.tsx` — remove consent step, make fields required
4. `src/components/student-detail/StudentEnrollmentsTab.tsx` — block status past "applied" without signed consent

