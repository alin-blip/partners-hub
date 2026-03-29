

## Plan: Fix Consent PDF + Add Preview + Add Consent Indicator

### Problem Analysis

The PDF generator has a **critical bug**: the PDF `Td` operator uses **relative** positioning (offset from last text position), but the code treats coordinates as absolute. After the first `Td` sets position, subsequent `Td` calls move by the *difference* rather than jumping to absolute coordinates. This is why only "EDUFORYOU UK" appears — all other text lands off-page or at wrong positions.

Additionally, the code resets position with `0 0 Td` after each line, which doesn't help because Td is cumulative within BT/ET blocks.

### Changes

#### 1. Fix PDF Generator (Critical Bug)

**File**: `supabase/functions/generate-consent-pdf/index.ts`

Replace the `buildPdf` content stream logic to use absolute positioning correctly. Instead of `Td` (relative), track the last position and compute deltas, OR use `Tm` (text matrix) which sets absolute position:

```
BT
/F1 10 Tf
1 0 0 1 50 790 Tm   <-- absolute position via text matrix
(EDUFORYOU UK) Tj
1 0 0 1 50 770 Tm   <-- next absolute position
(Student Enrollment Consent Form) Tj
...
ET
```

This ensures every line renders at the correct absolute coordinate.

#### 2. Add PDF Preview Before Save

**File**: `src/components/student-detail/StudentDocumentsTab.tsx`

- Add a "Preview" button alongside "Generate & Save" in the consent dialog
- On click, call the same `generate-consent-pdf` edge function
- Convert the returned base64 to a blob URL and display it in an `<iframe>` within the dialog
- User can then choose to "Save" or "Cancel"
- Same preview capability added to enrollment flow consent step

#### 3. Add Consent Form Indicator on Student Detail Page

**File**: `src/pages/shared/StudentDetailPage.tsx`

- Query `student_documents` for a record with `doc_type = 'Consent Form'` for the current student
- Display a badge next to the student name:
  - Green `ShieldCheck` icon + "Consent Signed" if found
  - Orange `ShieldAlert` icon + "No Consent" if missing

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/generate-consent-pdf/index.ts` | Fix Td→Tm for absolute positioning so all text renders correctly |
| `src/components/student-detail/StudentDocumentsTab.tsx` | Add preview iframe + preview button in consent dialog |
| `src/pages/shared/StudentDetailPage.tsx` | Add consent form indicator badge |
| `src/pages/agent/EnrollStudent.tsx` | Add preview button on Step 5 consent |
| `src/components/EnrollStudentDialog.tsx` | Add preview button on consent step |

