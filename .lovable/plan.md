
Goal: fix the timetable filter so it only shows options relevant to the selected course/campus, confirm persistence, and add the English notice above the timetable choices.

1. Fix the timetable filtering logic
- Update the timetable option logic in:
  - `src/pages/agent/EnrollStudent.tsx`
  - `src/components/EnrollStudentDialog.tsx`
  - `src/components/student-detail/StudentOverviewTab.tsx`
- Current issue:
  - the UI falls back to `timetable_options` for the whole university, which can surface labels that belong to other courses
- Planned behavior:
  - if a course is selected, show only timetable options mapped through `course_timetable_groups` for that course
  - if a campus is selected, also filter by that campus
  - if no mapped options exist for that selected course/campus, do not show unrelated university-wide options; use the normal fallback only when appropriate so the UI stays predictable

2. Keep the saved timetable behavior
- Yes: the selected timetable/study pattern is already being saved on the student record in `students.study_pattern`
- I will preserve that behavior exactly:
  - enrollment page saves `studyPattern.join(", ")`
  - enrollment dialog saves `studyPattern.join(", ")`
  - student overview edit screen also reads/writes `student.study_pattern`

3. Add the English helper text above the timetable selection
- Add this text directly above the timetable choices on the enrollment card(s):
  - “Classes currently available. Please note these may fill up, and you may be offered other options after the admission test.”
- Apply it in both places where the selection is shown:
  - full enrollment page
  - enrollment dialog
- If needed, I can also mirror the same helper text in the student edit view for consistency

4. Consistency check
- Make sure the same filtering rules are used everywhere timetable options appear, so:
  - new enrollment
  - quick-enroll dialog
  - student overview edit mode
  all behave the same way

Files to update
- `src/pages/agent/EnrollStudent.tsx`
- `src/components/EnrollStudentDialog.tsx`
- `src/components/student-detail/StudentOverviewTab.tsx`

Expected result
- Selecting a course will no longer show timetable labels from other courses
- The chosen timetable remains saved on the student record
- The warning/help text appears above the selectable timetable options in English
