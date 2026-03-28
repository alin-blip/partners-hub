

## Cascading Flow: University → Campus → Course → Timetable

### Problem
Currently, selecting a university loads ALL courses for that university regardless of campus. The user wants courses filtered by the selected campus, and timetable options filtered by the selected course+campus.

### Solution

Use the existing `course_timetable_groups` table to drive the cascade. This table already links `course_id + campus_id + timetable_option_id`. The flow becomes:

```text
University  →  Campus  →  Course (filtered by campus via course_timetable_groups)  →  Timetable (filtered by course+campus)
```

**When campus is selected AND course_timetable_groups has data for that campus:**
- Query distinct `course_id` from `course_timetable_groups` where `campus_id = selected` to get available courses
- Show only those courses in the Course dropdown
- After course is selected, show only the timetable options linked to that course+campus

**Fallback (no course_timetable_groups data for this campus):**
- Show all university courses as before
- Show university-wide timetable options

### Changes

**Files to modify (3):**

1. **`src/pages/agent/EnrollStudent.tsx`**
   - Add query for courses filtered by campus via `course_timetable_groups`
   - Use filtered courses when available, fall back to all university courses
   - Reset courseId when campusId changes
   - Timetable already filters by course+campus (no change needed there)

2. **`src/components/EnrollStudentDialog.tsx`**
   - Same cascading logic as above

3. **`src/components/student-detail/StudentOverviewTab.tsx`**
   - Same cascading logic for the edit view

### Technical detail

New query added to each file:
```typescript
const { data: campusCourseIds = [] } = useQuery({
  queryKey: ["campus-courses", campusId],
  queryFn: async () => {
    const { data } = await supabase
      .from("course_timetable_groups")
      .select("course_id")
      .eq("campus_id", campusId);
    // Get unique course IDs
    return [...new Set((data || []).map(r => r.course_id))];
  },
  enabled: !!campusId,
});

// Filter courses: if campus has mapped courses, show only those; otherwise show all
const filteredCourses = campusCourseIds.length > 0
  ? courses.filter(c => campusCourseIds.includes(c.id))
  : courses;
```

When `campusId` changes → reset `courseId`. When `courseId` changes → reset `studyPattern`.

