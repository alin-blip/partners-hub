

## Plan: Universities & Courses Page (Read-Only for All Roles)

### What We're Building
A new **Universities & Courses** page accessible from the sidebar for all roles (Owner, Admin, Agent). This is a read-only reference page where users can browse all university/campus/course/intake/timetable data with full details. No CRUD — management stays in Owner Settings.

### Data Sources (existing tables)
- `universities` — name, is_active, timetable_available, timetable_message
- `campuses` — name, city, university_id
- `courses` — name, level, study_mode, university_id
- `course_details` — entry_requirements, admission_test_info, interview_info, documents_required, personal_statement_guidelines, additional_info
- `intakes` — label, start_date, application_deadline, university_id
- `timetable_options` — label, university_id
- `course_timetable_groups` — links courses to timetable_options per campus

All these tables already have RLS policies allowing authenticated users to SELECT.

### Page Design

**Layout**: Accordion-based, one section per university. Each university expands to show:

1. **University Header** — Name, active status badge, number of campuses/courses
2. **Campuses** — Table with name and city
3. **Courses** — Table with name, level, study_mode. Each course row is expandable (collapsible) to show:
   - Course Details card (reuse `CourseDetailsInfoCard` component)
   - Linked timetable options for that course
4. **Intakes** — Table with label, start date, application deadline
5. **Timetable Options** — List of available timetables for the university

**Features**:
- Search bar to filter universities by name
- Filter by active/inactive status
- Course count summary per university

### Files to Create/Edit

1. **Create `src/pages/shared/UniversitiesCoursesPage.tsx`**
   - Fetch all universities, campuses, courses, course_details, intakes, timetable_options
   - Render accordion per university with sub-sections
   - Search + filter controls
   - Reuse `CourseDetailsInfoCard` for course requirement details

2. **Edit `src/App.tsx`**
   - Add route `/:role/universities` for owner, admin, and agent

3. **Edit `src/components/AppSidebar.tsx`**
   - Add "Universities & Courses" nav item with `GraduationCap` or `School` icon in the Main group, visible to all roles

### Technical Details

- All queries use existing RLS (all tables allow authenticated SELECT)
- No database changes needed — all tables and policies exist
- Use `Accordion` from shadcn for university sections
- Use `Collapsible` for expandable course rows showing details
- Use React Query with proper query keys for caching
- Badge components for status indicators (active/inactive, level, study_mode)

