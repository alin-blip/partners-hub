
The user is asking where to set the assessment test date.

Based on the previous implementation:
- The booking dialog (`AssessmentBookingDialog`) is triggered from inside the **Student Detail page → Enrollments tab**, by changing an enrollment's status to "Assessment Booked".
- It's NOT available directly from the `/owner/enrollments` list page (where the user currently is).

Let me give a clear answer on where to find it, and offer to add a shortcut.

# Where to Set the Assessment Test Date

## Current location (already working)

The date + time picker for the assessment test lives inside each student's detail page:

```text
Enrollments page (/owner/enrollments)
        │
        │ click on a student row / "View" button
        ▼
Student Detail page → "Enrollments" tab
        │
        │ in the enrollment row, open the Status dropdown
        ▼
Select "Assessment Booked"
        │
        ▼
📅 Dialog opens → pick Date + Time → Confirm
```

After confirming, the row shows: **"Assessment: 22 Apr 2026 at 10:00"** inline.

This works for Owner, Admin, and Agent (same dialog for all roles since the last update).

## Optional improvement — quicker access from `/owner/enrollments`

Right now you have to click into the student first. If you want, I can add a **calendar icon button** directly in each row of the Enrollments table that opens the same date+time dialog — no need to open the student detail. It would:

- Appear next to the status badge on every enrollment row
- Open the same `AssessmentBookingDialog` (date + time)
- On confirm, set status → `assessment_booked` and save the date/time
- If a date is already set, the icon would show the booked date as a tooltip

Nothing else changes — same dialog, same DB fields, same permissions.

## Files that would change (only if you want the shortcut)

| File | Change |
|------|--------|
| `src/pages/shared/EnrollmentsPage.tsx` | + small calendar button per row, + reuse `AssessmentBookingDialog` |

No DB migration. Fully additive.

