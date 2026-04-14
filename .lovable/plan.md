

# CV Generation with Questionnaire Flow

## Overview
Replace the current "click to generate" CV button with a multi-step questionnaire dialog. The user fills in work experience, education, and skills — then the AI generates a personalized CV from those answers. The course the student is applying to is used only to match relevant skills, never mentioned in the CV.

## UI Changes — `StudentAIDocumentsTab.tsx`

When "Generate" is clicked for CV, open a **Dialog** with 3 sections (accordion or stepper):

### Section 1: Work Experience (last 3 years)
- Repeatable form group (Add / Remove buttons)
- Fields per entry:
  - Job Title (text input)
  - Company Name (text input)
  - Company Address (text input)
  - Start Date (date picker)
  - End Date (date picker) OR checkbox "Present" (disables end date)
  - Responsibilities & Activities (textarea — AI will later match these to the course)

### Section 2: Education
- Repeatable form group
- Fields per entry:
  - Course / Programme studied (text input)
  - School / Institution name (text input)
  - Start Date — End Date
  - Status: Complete / Incomplete (radio or select)
  - Diploma: Available / Lost (radio or select)

### Section 3: Skills
- Textarea for the user to list skills freely
- A note: "AI will automatically match and enhance skills relevant to the student's course"

**Bottom of dialog**: "Generate CV" button that sends all questionnaire data to the edge function.

## Backend Changes — `generate-student-document/index.ts`

- Accept a new optional field `cv_questionnaire` in the request body containing `{ work_experience: [...], education: [...], skills: string }`
- When `cv_questionnaire` is provided, build the CV prompt from questionnaire data instead of the student profile
- Fetch the student's enrollment/course info only to do skills matching — instruct the AI to NEVER mention the university name
- Update the system prompt to:
  - Structure the CV from the provided work/education/skills data
  - Match responsibilities and skills to be relevant to the course field (without naming it)
  - Keep the student's personal details (name, contact) from the DB profile

## Files to modify

| File | Change |
|------|--------|
| `src/components/student-detail/StudentAIDocumentsTab.tsx` | Add CV questionnaire dialog with work/education/skills forms |
| `supabase/functions/generate-student-document/index.ts` | Accept `cv_questionnaire` data and build CV from it |

## Key rules enforced
- CV never includes the university being applied to
- Skills are AI-matched to be relevant to the course field without naming it
- All labels and questions in English
- Multiple work entries to cover 3 years
- Multiple education entries supported

