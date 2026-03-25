

## Plan: Revamp Enrollment Form + Fix GBS Campus Names

Two main changes: (1) update GBS campus data, (2) expand the students table and enrollment form with new fields.

---

### 1. Fix GBS Campus Names

Update the campuses table data for Global Banking School to use specific campus names:
- "London - Stratford" instead of "London"
- "London - Greenford" instead of generic London entry

This is a data update (using insert/update tool, not migration).

---

### 2. Add New Fields to Students Table

**Database migration** to add these columns to `students`:

| Column | Type | Nullable |
|--------|------|----------|
| `title` | text | yes |
| `nationality` | text | yes |
| `gender` | text | yes |
| `full_address` | text | yes |
| `uk_entry_date` | date | yes |
| `share_code` | text | yes |
| `ni_number` | text | yes |
| `previous_funding_years` | integer | yes |
| `study_pattern` | text | yes |
| `next_of_kin_name` | text | yes |
| `next_of_kin_phone` | text | yes |
| `next_of_kin_relationship` | text | yes |

---

### 3. Revamp EnrollStudentDialog

Expand from 3 steps to 4 steps:

**Step 1 — Institution & Course** (same as now)
- University, Campus, Course, Intake, Study Pattern (Weekdays/Weekend/Evenings)

**Step 2 — Applicant Details** (expanded)
- Title, First Name, Last Name, Nationality, Gender
- Date of Birth, Email, Mobile
- Full UK Address
- UK Entry Date
- Immigration Status, Share Code, NI Number
- Previous Funding (how many years)

**Step 3 — Next of Kin**
- Full Name, Phone, Relationship

**Step 4 — Review & Submit**
- Summary of all fields, submit button

Documents are NOT required at enrollment (can be added later from student detail page, as currently works).

---

### 4. Update EnrollStudent Page

The standalone `/agent/enroll` page (`src/pages/agent/EnrollStudent.tsx`) has the same form — it will receive the same field additions.

---

### Technical Details

- Migration adds 12 nullable columns to `students` table (no breaking changes)
- `EnrollStudentDialog.tsx` — add state for all new fields, restructure steps
- `EnrollStudent.tsx` — mirror the same changes
- `StudentDetailPage.tsx` — display new fields in the detail view and edit form
- Campus data update via SQL UPDATE on campuses table for GBS entries

