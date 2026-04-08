

# Role-Based Status Change Permissions + Assessment Booking

## What Changes

### 1. Agent Permissions — Restricted Status Changes
Agents can ONLY do two things:
- **Set "Assessment Booked"** — but must pick a date and time (calendar + time picker dialog)
- **Request "Cancelled"** — does NOT change status immediately; sends an approval request to their Admin (or Owner if no admin)

All other status changes are blocked for agents.

### 2. Admin Permissions
Admins can change any status (except commission statuses, per the previous visibility plan) for students belonging to their team agents.

### 3. Owner Permissions
Full control — can change any status on any enrollment.

### 4. Assessment Booking Dialog
When an agent selects "Assessment Booked":
- A dialog opens with a **date picker** (Calendar component) and **time picker**
- The date/time is saved to new columns `assessment_date` and `assessment_time` on the `enrollments` table
- Only after confirming does the status change

### 5. Cancellation Approval Flow
When an agent clicks "Cancel":
- A confirmation dialog appears explaining approval is needed
- An entry is created in a new `cancellation_requests` table (enrollment_id, requested_by, status: pending)
- The admin (or owner) sees pending requests and can approve/reject
- Only on approval does the enrollment status change to `cancelled`

## Database Changes

```sql
-- Add assessment fields to enrollments
ALTER TABLE public.enrollments 
  ADD COLUMN assessment_date date,
  ADD COLUMN assessment_time time;

-- Cancellation approval requests
CREATE TABLE public.cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES public.enrollments(id) ON DELETE CASCADE NOT NULL,
  requested_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;

-- Agent can see/create their own requests
CREATE POLICY "Agent manages own cancellation requests" ON public.cancellation_requests
  FOR ALL TO authenticated
  USING (requested_by = auth.uid())
  WITH CHECK (requested_by = auth.uid());

-- Admin sees team requests
CREATE POLICY "Admin views team cancellation requests" ON public.cancellation_requests
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND requested_by IN (
    SELECT id FROM public.profiles WHERE admin_id = auth.uid()
  ));

-- Admin can update (approve/reject) team requests
CREATE POLICY "Admin updates team cancellation requests" ON public.cancellation_requests
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND requested_by IN (
    SELECT id FROM public.profiles WHERE admin_id = auth.uid()
  ));

-- Owner full access
CREATE POLICY "Owner full access cancellation requests" ON public.cancellation_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role));
```

## Frontend Changes

### Files to modify:

1. **`src/components/student-detail/StudentEnrollmentsTab.tsx`**
   - Replace the status `<Select>` for agents with two buttons: "Book Assessment" and "Request Cancel"
   - "Book Assessment" only shown when status is before `assessment_booked`
   - "Request Cancel" shows a confirmation dialog, creates a `cancellation_requests` row
   - Admin/Owner keep the full dropdown (admin excludes commission statuses per visibility plan)

2. **New: `src/components/student-detail/AssessmentBookingDialog.tsx`**
   - Dialog with Calendar date picker + time input
   - On confirm: updates enrollment status to `assessment_booked` + saves `assessment_date`/`assessment_time`

3. **`src/pages/shared/EnrollmentsPage.tsx`**
   - For agents: remove status dropdown, show read-only StatusBadge
   - Keep status dropdown for admin (filtered) and owner (full)

4. **`src/pages/admin/AdminDashboard.tsx`** — Add a "Pending Cancellations" section showing requests from team agents needing approval

5. **`src/pages/owner/OwnerDashboard.tsx`** — Add "Pending Cancellations" section for all requests

## Permission Summary

```text
ACTION                    AGENT    ADMIN    OWNER
──────────────────────────────────────────────────
View all statuses          ✓*       ✓*       ✓
Change to assessment_booked ✓(dialog) ✓       ✓
Change to cancelled        Request   ✓       ✓
Change other statuses      ✗        ✓       ✓
Approve cancellations      ✗        ✓(team)  ✓
Commission statuses        Hidden   Hidden   ✓

* commission statuses shown as "Enrolled"
```

