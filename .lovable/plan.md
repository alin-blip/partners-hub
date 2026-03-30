

## Plan: Student Finance Application Form in Funding Tab + Resource

### What You Want
1. In the student Funding tab, add a "Student Finance Application" section with 2 options:
   - **Fill in platform** — a full form matching the PDF fields, saved to the database permanently
   - **Upload completed PDF** — download the blank PDF, fill manually, upload the completed version
2. Add the PDF as a resource in the Resources page under category "guides" with title "Student Finance Doc"

### Database Changes

**New table: `student_finance_forms`**
- `id` (uuid, PK)
- `student_id` (uuid, references students)
- `enrollment_id` (uuid, nullable — ties to specific enrollment)
- `agent_id` (uuid — who filled it)
- `method` (text — `"platform"` or `"upload"`)
- `uploaded_file_path` (text, nullable — for uploaded PDF)
- All form fields from the PDF (see below)
- `created_at`, `updated_at`

**Form fields** (all text, nullable):
- `title`, `relationship_status`, `first_name`, `family_name`, `date_of_birth`, `nationality`, `town_of_birth`
- `email`, `phone`, `ni_number`, `current_address`, `applied_before`, `applied_before_details`
- `immigration_status`, `share_code`, `expiry_date`
- `worked_last_3_months`, `employment_type`, `job_title_company`
- `address_history_1`, `address_history_2`, `address_history_3`
- `university_name_address`, `course_name`, `course_length_start`, `year_tuition_fee`
- `uk_contact_1_name`, `uk_contact_1_relationship`, `uk_contact_1_phone`, `uk_contact_1_address`
- `uk_contact_2_name`, `uk_contact_2_relationship`, `uk_contact_2_phone`, `uk_contact_2_address`
- `crn`, `password`, `secret_answer`
- `spouse_marriage_date`, `spouse_full_name`, `spouse_dob`, `spouse_address`, `spouse_phone`, `spouse_email`, `spouse_ni_number`, `spouse_place_of_birth`, `spouse_employment_status`, `spouse_has_income`
- `dependants_info`
- `consent_full_name`, `consent_date`

RLS: Owner full access, agent/admin access via student ownership (same pattern as student_documents).

### File Changes

**1. Migration** — Create `student_finance_forms` table + RLS policies

**2. Copy PDF to `public/`** — The blank PDF goes to `public/EduForYou_Student_Finance_Form.pdf` for download

**3. `src/components/student-detail/StudentFundingTab.tsx`** — Major update:
- Add a new "Student Finance Application" card below the enrollment funding cards
- Two buttons: "Fill in Platform" and "Upload Completed Form"
- "Fill in Platform" opens a dialog/accordion with all form sections matching the PDF:
  - Personal Details, Contact Details, Immigration Status, Employment, Address History, University/Course, UK Contacts, CRN/Password, Financial Details (spouse), Dependants, Consent
- Pre-fill from student data where possible (name, DOB, nationality, email, phone, NI number, address, share code)
- Save button persists to `student_finance_forms`
- "Upload" option: file input to upload PDF, stored in `student-documents` bucket
- Show completed forms with view/download options
- Badge showing "Completed" or "Not Started"

**4. `src/pages/shared/ResourcesPage.tsx`** — Insert the PDF as a resource record in the DB (handled via migration INSERT or manual upload by owner)

### How It Works
- Agent opens student > Funding tab
- Sees enrollment funding cards (existing) + new "Student Finance Application" section
- Clicks "Fill in Platform" → multi-section form pre-filled with student data → saves permanently
- Or clicks "Download Blank Form" → gets PDF → student fills → agent uploads completed form
- Both methods are saved and visible with status indicator
- The blank PDF is also available in Resources for easy access

### Files Changed
- **Migration**: `student_finance_forms` table + RLS + insert resource record
- **`public/EduForYou_Student_Finance_Form.pdf`**: Blank form for download
- **`src/components/student-detail/StudentFundingTab.tsx`**: Add finance form section with fill/upload options
- **`src/components/student-detail/StudentFinanceFormDialog.tsx`** (new): Full form dialog matching PDF structure

