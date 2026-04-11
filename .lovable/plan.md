

# Add FSB September Courses, Course Details, and Knowledge Base Entries

## Current State
- **FSB (Fairfield School of Business)** exists with university ID `e7182c37-...`
- **3 existing courses**: BA Business Management (BSU), BSc Business Management (RUL), BSc Health & Social Care (BSU)
- **1 intake**: May Intake only
- **4 campuses**: Digbeth (Birmingham), Sheffield, Croydon, Leicester
- **1 course_details** record exists (for the BSU Business Management course)
- **No timetable options** mapped
- **No knowledge base entries** for FSB

## What We Need To Do

### Step 1: Parse the uploaded files
- Parse `FSB_May_and_June_26_and_September_26_1.xlsx` using Python/pandas to extract September course data, timetables, and details
- Parse `RUL.pdf` to extract RUL-specific course details and requirements

### Step 2: Add September intake
- Insert a new intake record for September 2026 under FSB

### Step 3: Add new September courses
- Only add courses that appear in the September section of the spreadsheet and don't already exist in the database
- Map them to the correct campuses and study modes

### Step 4: Add/update course details
- Upsert `course_details` records for all FSB courses with entry requirements, documents required, admission test info, interview info, etc. extracted from both files

### Step 5: Map timetable options
- If the spreadsheet contains timetable/schedule data, create `timetable_options` and `course_timetable_groups` mappings

### Step 6: Add to Knowledge Base
- Create `ai_knowledge_base` entries for FSB covering:
  - University overview and campuses
  - Per-course admission details
  - Entry requirements (Standard vs Non-Standard routes)
  - September intake specifics

## Technical approach
All data operations will use the Supabase insert tool (for data) and migration tool (only if schema changes are needed, which is unlikely). The files will be parsed with Python pandas/openpyxl (xlsx) and a PDF parser (pdf) in exec mode.

