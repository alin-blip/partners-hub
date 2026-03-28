

## Course Details: Store and Use University Document Information

### Problem
Each university/course has specific requirements (personal statement guidelines, admission tests, interview process, entry requirements) documented in PDFs. Currently this information is not stored in the platform, so agents must reference external documents, and the AI personal statement generator has no course-specific guidance.

### What the Documents Contain (from CECOS examples)

| Section | Example Content |
|---------|----------------|
| **Personal Statement** | "150 words, cover: why this course, long-term goals, relevant experience, suitability, career development" |
| **Admission Test** | "Tests at 10:30 AM and 2:00 PM, 3 chances to pass" |
| **Interview** | "On campus, online only in exceptional cases, students complete Interview Availability Form" |
| **Entry Requirements** | "Level 3 qualification, or Level 2 + 1 year work experience for 21+, 2 years work experience for non-standard route" |
| **Documents Required** | "Passport, CV (3 years work exp), NINO, Proof of address, Share Code..." |
| **Additional Info** | "Max 1.5/2 hours travel time from postcode to campus, DBS check required" |

### Solution

**Step 1: New `course_details` table** to store rich text per course:

```text
course_details
├── id (uuid, PK)
├── course_id (uuid, FK → courses)
├── personal_statement_guidelines (text) — word count, what to cover
├── admission_test_info (text) — test schedule, attempts, format
├── interview_info (text) — on-campus/online, preparation, process
├── entry_requirements (text) — qualifications, work experience, age
├── documents_required (text) — list of required documents
├── additional_info (text) — travel time limits, DBS, SFE, etc.
├── created_at, updated_at
```

RLS: same pattern (owner manages all, authenticated can read).

**Step 2: New "Course Details" tab in Settings** to view/edit per-course details. Add/edit form with the 6 text fields. Filter by university.

**Step 3: New document type `course_details` in Document Processor** so you can upload a PDF like the CECOS ones and the AI extracts all 6 fields automatically per course.

**Step 4: Update `generate-student-document` edge function** — when generating a personal statement, fetch `course_details.personal_statement_guidelines` for the student's enrolled course and inject it into the AI prompt so the output matches the university's exact requirements (word count, topics to cover).

**Step 5: Show course details on the enrollment card** — in `EnrollStudent.tsx` and `EnrollStudentDialog.tsx`, after selecting a course, display an info card showing admission test, interview, entry requirements, and documents required so the agent knows what to expect.

**Step 6: Show course details on Student Detail page** — add course requirements info to the Overview or Enrollments tab so agents can reference it anytime.

### Files to create/modify

| File | Action |
|------|--------|
| Migration SQL | Create `course_details` table with RLS |
| `src/pages/owner/SettingsPage.tsx` | Add "Course Details" tab with CRUD + filter by university |
| `supabase/functions/process-settings-document/index.ts` | Add `course_details` schema for AI extraction |
| `src/components/DocumentProcessorDialog.tsx` | Add `course_details` doc type + save logic |
| `supabase/functions/generate-student-document/index.ts` | Fetch and use personal statement guidelines |
| `src/pages/agent/EnrollStudent.tsx` | Show course requirements info card after course selection |
| `src/components/EnrollStudentDialog.tsx` | Same info card in dialog enrollment |
| `src/components/student-detail/StudentEnrollmentsTab.tsx` | Show course details on enrolled courses |

### Technical detail

New document processor schema for `course_details`:
```
Return a JSON array of objects with: course_name (string), 
personal_statement_guidelines (string or null), 
admission_test_info (string or null), interview_info (string or null),
entry_requirements (string or null), documents_required (string or null),
additional_info (string or null).
Extract ALL sections from the document, preserving details like word counts, 
specific topics to cover, test schedules, travel time limits, etc.
```

The edge function prompt update (simplified):
```
// Fetch course_details for this student's enrollment
const { data: courseDetails } = await adminClient
  .from("course_details")
  .select("personal_statement_guidelines")
  .eq("course_id", enrollment.course_id)
  .single();

// Inject into system prompt
if (courseDetails?.personal_statement_guidelines) {
  systemPrompt += `\n\nIMPORTANT - Follow these specific guidelines:\n${courseDetails.personal_statement_guidelines}`;
}
```

