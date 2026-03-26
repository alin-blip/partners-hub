

## Plan: AI Document Processor for Settings

### Overview
Add a document upload + AI processing feature to Platform Settings. The owner uploads a document (PDF, Excel, image) received from a university, selects the data type (Courses, Timetable Options, Campuses, Intakes), and the AI extracts structured data. The owner then reviews, edits, and confirms before saving to the database.

### Architecture

```text
Upload Doc → Edge Function (parse + AI extract) → Preview Table → Owner confirms → Save to DB
```

### 1. New Edge Function: `process-settings-document`

- Accepts: file (base64 or form-data), `document_type` (courses/timetable/campuses/intakes), `university_id`
- Uses Lovable AI (gemini-2.5-flash) to extract structured data based on document type
- For PDFs: extract text content, send to AI for structured parsing
- Returns JSON array of extracted items with fields matching the target table schema

**AI prompt per type:**
- **Courses**: extract `name`, `level`, `study_mode`
- **Timetable Options**: extract `label` (group/pattern names with times)
- **Campuses**: extract `name`, `city`
- **Intakes**: extract `label`, `start_date`, `application_deadline`

### 2. New Component: `DocumentProcessorDialog.tsx`

A dialog with a multi-step flow:

**Step 1 - Upload**
- File input (PDF, XLSX, images, DOCX)
- Select document type (Courses, Timetable, Campuses, Intakes)
- Select university
- "Process" button

**Step 2 - Review**
- Table showing extracted items with editable fields
- Checkboxes to select/deselect individual items
- Highlight duplicates (items that already exist in DB)
- Edit inline before confirming

**Step 3 - Confirm**
- "Add Selected" button inserts checked items into the appropriate table
- Toast with count of items added
- Invalidate relevant queries

### 3. Integration in SettingsPage

- Add an "Import from Document" button (with Upload icon) at the top of the Settings page, next to the page title
- Opens `DocumentProcessorDialog` with the current active tab pre-selected as document type

### 4. File Handling

- Read file client-side, convert to base64
- Send to edge function for AI processing
- No permanent file storage needed (temporary processing only)
- Support: PDF, XLSX, DOCX, JPG/PNG (for scanned timetables)

### Technical Details

**Edge function** (`supabase/functions/process-settings-document/index.ts`):
- Uses `pdf-parse` approach: receive base64 content + file type
- For images/PDFs: send as content to Gemini with vision capabilities
- System prompt tailored per document_type to extract the right schema
- Returns `{ success: true, items: [...] }` with extracted data

**Files to create:**
- `supabase/functions/process-settings-document/index.ts`
- `src/components/DocumentProcessorDialog.tsx`

**Files to modify:**
- `src/pages/owner/SettingsPage.tsx` (add import button)

