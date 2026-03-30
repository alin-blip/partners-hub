

## Plan: Redesign Universities & Courses Page + Course Active/Inactive Toggle

### What Changes

**1. Database Migration — Add fields to `courses` table**
- `is_active` (boolean, default true) — toggle courses open/closed in Settings
- `duration` (text, nullable) — e.g. "4 years"  
- `fees` (text, nullable) — e.g. "£9,535/year"

**2. Redesign Universities & Courses Page**

Replace the current accordion layout with a new design inspired by the screenshot:

- **Top header**: University selector tabs/buttons (horizontal scrollable). Click a university to filter courses below.
- **Course grid**: 3-column responsive grid of dark-themed cards. Each card shows:
  - Course name (bold, white text)
  - Duration (clock icon)
  - Intakes for that university (calendar icon, comma-separated labels)
  - Fees (currency icon)
  - "Începe Pregătirea" / "Start Application" button linking to the enrollment page with course pre-selected
- Only active courses shown by default; "Show inactive" toggle for admin/owner
- Search bar to filter courses by name
- Course details (entry requirements, etc.) shown on card click via a dialog or expandable section

**3. Settings Page — Course Active/Inactive Toggle**

In the existing Courses section of SettingsPage, add:
- An `is_active` switch per course row (same pattern as universities)
- Editable `duration` and `fees` fields when adding/editing courses

### Files to Change

| File | Change |
|------|--------|
| **Migration** | Add `is_active`, `duration`, `fees` columns to `courses` |
| `src/pages/shared/UniversitiesCoursesPage.tsx` | Full redesign: university tabs at top, course card grid below, apply button |
| `src/pages/owner/SettingsPage.tsx` | Add is_active switch, duration & fees fields to course CRUD |
| `src/components/CourseDetailsInfoCard.tsx` | Minor: ensure it works in dialog context |

### Technical Details

- Apply button navigates to `/${role}/enroll-student?university=${uniId}&course=${courseId}` (pre-fills enrollment form)
- Card styling: dark background (`bg-slate-800`), orange/primary accent for the apply button, white text
- University tabs use existing `universities` data, show active count badge
- Intakes mapped per university from existing `intakes` table
- Fees and duration are new text fields on `courses` — free-form to handle complex pricing like "£5,760 first year then £9,535/year"

