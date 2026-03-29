

## Plan: Remove Ask33 References + Add Consent Form to Enrollment

### Part 1: Remove "Ask33" from Database

Replace all occurrences of "Ask33 Consent Form" with "EduForYou Consent Form" in:

1. **`ai_knowledge_base`** — 3 rows (Ulster, Solent, Northumbria overviews) contain "Ask33 Consent Form" in `content`
2. **`course_details`** — ~90 rows have "Ask33 Consent Form" in `documents_required` field

Use UPDATE statements via the data insert tool to do text replacement.

### Part 2: Add Consent Form Step to Enrollment

Add a consent form step between the current Step 4 (Documents) and Step 5 (Review), making it a 6-step wizard. The consent form will be generated as a PDF and saved to the student's documents.

**Consent Form Content** (UK university enrollment, GDPR-compliant):
- Student full name, date of birth, nationality, address
- Selected university and course
- Agent/company name (EduForYou UK)
- Consent clauses:
  1. Data processing consent — personal data shared with university for enrollment
  2. Document sharing consent — uploaded documents forwarded to university
  3. Communication consent — contact by EduForYou and university regarding application
  4. Student finance consent — data shared with SFE if applicable
  5. Declaration of accuracy — all information provided is true and correct
- Checkbox for each clause (all required)
- Digital signature field (typed name as signature)
- Date auto-filled

**Technical Implementation:**

1. **New edge function `generate-consent-pdf`** — uses jsPDF (or similar Deno-compatible library) to create a branded PDF with all student details and consent declarations, returns the PDF as base64
2. **New Step 5 in `EnrollStudent.tsx`** — displays consent form with checkboxes for each clause and a typed signature field. All checkboxes + signature required to proceed.
3. **On submit** — the consent PDF is generated via the edge function, uploaded to `student-documents` storage, and a `student_documents` record is created with `doc_type: "Consent Form"`
4. **Same changes in `EnrollStudentDialog.tsx`** — mirror the consent step in the dialog version
5. **Step count increases from 5 to 6** in both enrollment flows

### Files Changed

| File | Change |
|------|--------|
| `ai_knowledge_base` (DB data) | Replace "Ask33" with "EduForYou" in 3 rows |
| `course_details` (DB data) | Replace "Ask33" with "EduForYou" in ~90 rows |
| `supabase/functions/generate-consent-pdf/index.ts` | New edge function to generate consent PDF |
| `src/pages/agent/EnrollStudent.tsx` | Add consent step (Step 5), shift Review to Step 6 |
| `src/components/EnrollStudentDialog.tsx` | Same consent step addition |

