

# Enhanced Duplicate Student Detection with Admin Notification

## What changes

When an agent tries to enroll a student whose **email** or **phone** already exists in the system, the enrollment is blocked with a clear message and a "Contact Admin" button. Clicking that button automatically sends a direct message to the agent's admin (or owner if no admin) saying the agent has a duplicate student and needs assistance.

## Technical plan

### 1. Add phone to duplicate checks (both enrollment forms)

Currently duplicates only check email and name+DOB. Add a phone check:
- If `phone` is non-empty, query `students` where `phone = phone.trim()`
- If found, throw a special error (e.g. prefix with `DUPLICATE:`) so the UI can distinguish it from regular errors

**Files**: `src/components/EnrollStudentDialog.tsx` (lines ~260-269), `src/pages/agent/EnrollStudent.tsx` (lines ~253-262)

### 2. Custom duplicate error UI with "Contact Admin" button

In both `EnrollStudentDialog` and `EnrollStudent`:
- Add a `duplicateError` state (`string | null`)
- In the mutation's `onError`, check if `error.message` starts with `DUPLICATE:` — if so, set `duplicateError` instead of just showing a toast
- Render an alert/card when `duplicateError` is set, showing the message + a "Contact Admin" button
- The button triggers a function that:
  1. Fetches the agent's `admin_id` from `profiles` table
  2. If no `admin_id`, fetches the owner (from `user_roles` where `role = 'owner'`)
  3. Creates or finds existing `direct_conversations` between agent and admin/owner
  4. Inserts a `direct_messages` record: *"This agent has a student that shows as duplicate. Please check and contact the agent."*
  5. Shows a success toast: "Message sent to admin"

### 3. Files to modify

1. **`src/components/EnrollStudentDialog.tsx`** — add phone duplicate check, `duplicateError` state, alert UI with Contact Admin button
2. **`src/pages/agent/EnrollStudent.tsx`** — same changes for the full-page enrollment form

No database or edge function changes needed — uses existing `direct_conversations` and `direct_messages` tables with existing RLS policies.

