

## Plan: Fix Apply Navigation + Inline Course Details

### Problem 1: Apply button → 404
The Apply button navigates to `/${role}/enroll-student?...` but the route is `/${role}/enroll`. Also, the `EnrollStudent` page doesn't read URL query params to pre-select university/course.

### Problem 2: Details opens dialog
Currently "Details" opens a dialog. User wants it to expand inline below the course card instead.

---

### Changes

**1. Fix Apply button URL (`UniversitiesCoursesPage.tsx`)**
- Change `enroll-student` → `enroll` in the navigate call

**2. Pre-select university & course in EnrollStudent (`EnrollStudent.tsx`)**
- Import `useSearchParams` from react-router-dom
- Read `university` and `course` params on mount
- Set `universityId` and `courseId` state from URL params as initial values

**3. Replace Details dialog with inline expand (`UniversitiesCoursesPage.tsx`)**
- Remove the `Dialog` for course details
- Change `detailsCourseId` to toggle: clicking "Details" on a card expands/collapses that card to show `CourseDetailsInfoCard` directly below the card's content
- Use a simple conditional render inside the card — when `detailsCourseId === course.id`, show the details section below the buttons with a smooth transition

### Files to Edit
| File | Change |
|------|--------|
| `src/pages/shared/UniversitiesCoursesPage.tsx` | Fix navigate URL; replace dialog with inline expand |
| `src/pages/agent/EnrollStudent.tsx` | Read `useSearchParams` and pre-fill university + course |

