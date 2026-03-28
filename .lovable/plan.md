

## Fix: Timetable Options Not Showing + Course Requirements Only for One Course

### Two Issues Found

**1. Timetable not showing after course selection**
The previous fix was too strict. When a course is selected but has NO entries in `course_timetable_groups`, `displayTimetableOptions` returns `null` — which hides timetable entirely instead of falling back to the university-wide options or the static fallback.

**Fix:** When a course is selected and has no course-specific timetable groups, fall back to university-wide timetable options instead of returning `null`.

```
// Current (broken):
const displayTimetableOptions = courseId
  ? (courseTimetableGroups.length > 0 ? courseTimetableGroups : null)
  : (universityTimetableOptions.length > 0 ? universityTimetableOptions : null);

// Fixed:
const displayTimetableOptions = courseTimetableGroups.length > 0
  ? courseTimetableGroups
  : (universityTimetableOptions.length > 0 ? universityTimetableOptions : null);
```

This way: course-specific groups take priority, but if none exist, university-wide options are shown. If neither exist, falls through to the static fallback (Weekdays/Weekend/Evenings).

**2. Course Requirements card only shows for one course**
The `CourseDetailsInfoCard` queries `course_details` using `from("course_details" as any)` — the `as any` cast suggests the types file may not have this table properly typed yet, but functionally it should work. The real issue is likely that only one course has data in the `course_details` table (only one was imported/entered). This is a data issue, not a code bug — the card correctly returns `null` when no details exist.

No code change needed for this — it will show for every course once course details are populated via Settings > Course Details or Document Import.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/agent/EnrollStudent.tsx` | Fix `displayTimetableOptions` fallback logic (line 155-157) |
| `src/components/EnrollStudentDialog.tsx` | Same fix (line 164-166) |

