

# Add Duplicate Detection to Lead Conversion

## Problem
The LeadsPage "Convert" flow inserts a student directly without checking for duplicates. The enrollment dialog already has this check, but the lead conversion does not.

## Changes

### `src/pages/shared/LeadsPage.tsx`

1. **Add duplicate check before insert** in `convertToStudent` mutation:
   - Query `students` by email (case-insensitive) and phone before inserting
   - If duplicate found, throw `DUPLICATE:` prefixed error with the existing student's agent info

2. **Add `duplicateError` state and `contactingAdmin` state**

3. **Replace convert dialog** to show a duplicate alert when detected:
   - Show: "This student already exists in the database and belongs to another agent."
   - Show a "Contact Admin" button

4. **Add `handleContactAdmin` function** (same pattern as EnrollStudentDialog):
   - Find agent's `admin_id` from profiles, or fall back to owner
   - Create/find direct conversation
   - Send message: `"⚠️ Duplicate student detected: I tried to enrol [Student Name] ([email], [phone]) but they appear as a duplicate. Please guide me. — [Agent Name]"`
   - Show success toast and clear the duplicate error

5. **Handle the `onError`** of `convertToStudent` to detect `DUPLICATE:` prefix and show the popup instead of a generic toast

No database changes needed.
