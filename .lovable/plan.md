

# Plan: Show Campus in Tables + Owner/Admin Date+Time Booking

## What's wrong now

1. **Campus missing in tables**: The Students table and the Enrollments table don't show the campus where the student applied. The data IS in the database (`enrollments.campus_id`), it's just not selected/rendered.
2. **Booking dialog only for agents**: When Owner/Admin set status to `assessment_booked` via the dropdown, no dialog appears — they can't pick a date/time. Only agents get the `AssessmentBookingDialog` (which already supports date + time correctly).

## Changes (additive only — no functional regressions)

### 1. `src/pages/shared/StudentsPage.tsx` — add Campus column
- Extend the students query to also fetch the latest enrollment's campus per student. Approach: a second lightweight query for `enrollments` filtered by the visible student IDs, joining `campuses(name, city)` and `courses(name)`, take the most recent per student into a map.
- Add columns: **Course** and **Campus** (with city) — hidden on mobile (`hidden md:table-cell`) to keep the layout clean. Show "—" if no enrollment yet.
- Update CSV export to include those two columns.

### 2. `src/pages/shared/EnrollmentsPage.tsx` — add Campus column
- Extend the existing `enrollments` select to also pull `campuses(name, city)` (left join — campus is nullable).
- Add a **Campus** column right after "Course". Show "—" when null.
- Add Campus to CSV export.

### 3. `src/components/student-detail/StudentEnrollmentsTab.tsx` — Owner/Admin booking dialog
- When Owner or Admin picks `assessment_booked` from the status dropdown, instead of writing the status directly, open the existing `AssessmentBookingDialog` so they can pick **date + time** (same UX as agents).
- After confirm, run the same DB update agents already run (`status: "assessment_booked", assessment_date, assessment_time`).
- Any other status change keeps current behavior (direct mutation).
- Also add a small **"Assessment: <date> at <time>"** line under the row when those fields are set, so it's visible without re-opening the dialog.

### 4. `src/components/student-detail/StudentEnrollmentsTab.tsx` — show campus per row
- Extend the enrollments select to include `campuses(name, city)` and add a Campus column to the per-student enrollment history table.

## What stays the same
- `AssessmentBookingDialog` already supports date + time — no changes needed.
- All RLS, statuses, agent permissions, transfer flow, cancellation flow.
- Booking writes the same fields (`assessment_date`, `assessment_time`) already used by agents — no schema change.
- No migrations.

## Files modified
| File | Change |
|------|--------|
| `src/pages/shared/StudentsPage.tsx` | + Course & Campus columns, + CSV columns |
| `src/pages/shared/EnrollmentsPage.tsx` | + Campus column, + CSV column |
| `src/components/student-detail/StudentEnrollmentsTab.tsx` | + Campus column, route Owner/Admin "assessment_booked" through the existing booking dialog, show booked date/time inline |

