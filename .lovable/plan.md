

## Course–Timetable Groups & Enhanced Document Extraction

### Problem
1. **Study Pattern** on students only offers static options ("Weekdays", "Weekend", "Evenings") instead of the actual timetable groups (A, B, C, E, K, N etc.) defined in settings.
2. There is no relationship between courses and which timetable groups are available for each course per campus.
3. The document processor does not extract the course–timetable–campus matrix from uploaded documents (like the image you shared).

### Solution

#### 1. New junction table: `course_timetable_groups`

Links courses to their available timetable groups per campus.

```text
course_timetable_groups
├── id (uuid, PK)
├── course_id (uuid → courses)
├── campus_id (uuid → campuses, nullable)
├── timetable_option_id (uuid → timetable_options)
├── university_id (uuid)
└── created_at (timestamptz)
```

RLS: Owner manages all, authenticated can read.

#### 2. New document extraction type: `course_timetable_matrix`

Add a new extraction schema to `process-settings-document` edge function that extracts a matrix like:
```json
[
  {
    "course_name": "BSc (Hons) Computing with Foundation Year",
    "campus": "East London",
    "groups": ["A", "K", "N"]
  }
]
```

This maps the uploaded documents (like the spreadsheet image) into structured data linking courses → campuses → timetable groups.

#### 3. Update Study Pattern selection in EnrollStudent

Replace the static checkboxes with a dynamic dropdown/multi-select that:
- Fetches `course_timetable_groups` for the selected course + campus
- Shows the available timetable group labels (e.g. "Group A – Monday 09:45-14:45")
- Falls back to current static options if no groups are configured

Similarly update `StudentOverviewTab` to use the same dynamic selection.

#### 4. Update DocumentProcessorDialog

- Add `"course_timetable"` as a new DocType option
- In the review step, show course name + campus + available groups
- On save, match course/campus names to existing IDs, then insert into `course_timetable_groups`
- Auto-save extracted data to Knowledge Base when that option is selected

#### 5. Save uploaded documents to Knowledge Base

Parse all uploaded documents and save their content to `ai_knowledge_base` so the AI chat can reference them.

### Files to modify/create

| File | Change |
|------|--------|
| DB migration | Create `course_timetable_groups` table with RLS |
| `supabase/functions/process-settings-document/index.ts` | Add `course_timetable` schema |
| `src/components/DocumentProcessorDialog.tsx` | Add new doc type, review UI, save logic |
| `src/pages/agent/EnrollStudent.tsx` | Replace static study patterns with dynamic timetable groups |
| `src/components/student-detail/StudentOverviewTab.tsx` | Same dynamic selection for editing |
| `src/pages/owner/SettingsPage.tsx` | Optional: UI to manage course–timetable assignments |

### Implementation order
1. Create migration for `course_timetable_groups`
2. Update edge function with new extraction schema
3. Update DocumentProcessorDialog with new type + save logic
4. Update EnrollStudent and StudentOverviewTab for dynamic timetable selection
5. Save documents to Knowledge Base

