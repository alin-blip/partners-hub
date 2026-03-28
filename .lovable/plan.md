

## Fix: Show University Timetable Options as Fallback

### Problem
When enrolling a student, the "Study Pattern / Timetable Group" section shows hardcoded static values ("Weekdays", "Weekend", "Evenings") instead of the timetable options you've configured in Settings for each university.

**Root cause**: The `course_timetable_groups` table is empty (no mappings imported yet), so it falls back to static values. The fallback should instead show the `timetable_options` from the selected university.

### Fix

Change the fallback logic in both enrollment forms:

```text
Current flow:
  1. Check course_timetable_groups → empty
  2. Show static ["Weekdays", "Weekend", "Evenings"]  ← wrong

Fixed flow:
  1. Check course_timetable_groups → if found, show those
  2. Else check timetable_options for university → if found, show those
  3. Else show static fallback (last resort only)
```

### Changes

**1. `src/components/EnrollStudentDialog.tsx`**
- Add a query for `timetable_options` filtered by `universityId`
- Update the fallback: if `courseTimetableGroups` is empty but `universityTimetableOptions` has data, show those instead of static values

**2. `src/pages/agent/EnrollStudent.tsx`**
- Same change: add university timetable options query and update fallback logic

**3. `src/components/student-detail/StudentOverviewTab.tsx`**
- Same pattern for the edit view

### Technical detail

Add this query to each file:
```typescript
const { data: universityTimetableOptions = [] } = useQuery({
  queryKey: ["timetable-options", universityId],
  queryFn: async () => {
    const { data } = await supabase
      .from("timetable_options")
      .select("id, label")
      .eq("university_id", universityId)
      .order("label");
    return data || [];
  },
  enabled: !!universityId,
});
```

Then update the rendering logic:
```
courseTimetableGroups.length > 0  → show course-specific groups
universityTimetableOptions.length > 0  → show university-level options
else → show static fallback
```

