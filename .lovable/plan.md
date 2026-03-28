

## Audit: "Import from Document" — Issues Found

### Critical Issues

**1. XLSX/DOCX files produce garbage data**
The edge function (`process-settings-document`) handles XLSX and DOCX by decoding base64 to bytes and running `TextDecoder` on them. But XLSX and DOCX are ZIP-based binary formats — decoding them as UTF-8 text produces unreadable garbage that the AI model cannot parse. Only PDF and image formats will work correctly.

**Fix:** Either:
- (A) Parse XLSX/DOCX server-side using a Deno library (e.g. `xlsx` for spreadsheets, or a DOCX parser), then send the extracted text to the AI model.
- (B) Remove XLSX/DOCX from accepted file types and inform the user to convert to PDF first. This is simpler and more reliable.

**Recommendation:** Option B (remove XLSX/DOCX support, keep PDF + images). This avoids adding heavy dependencies to the edge function and PDF is universally supported.

**2. Course Details review table shows only 3 of 7 fields**
In `DocumentProcessorDialog.tsx` line 46, the COLUMNS for `course_details` are:
```
["course_name", "entry_requirements", "admission_test_info"]
```
The remaining 4 fields (`interview_info`, `documents_required`, `personal_statement_guidelines`, `additional_info`) are extracted by the AI but invisible during review. Users can't verify or edit them before saving.

**Fix:** Add the missing columns to the review table, or show a more compact expandable view per row since 7 columns would be wide.

**3. No duplicate prevention on re-import**
Courses, timetable options, campuses, and intakes all use plain `.insert()` without checking for existing records. Re-importing the same document creates duplicate rows.

**Fix:** Before inserting, check for existing records by name+university_id (for courses/campuses/timetable) or label+university_id (for intakes). Skip or upsert duplicates.

### Minor Issues

**4. `course_details` upsert uses `as any` cast**
Line 348: `supabase.from("course_details" as any).upsert(...)` — this works at runtime since the table exists, but the `as any` indicates the types file doesn't include `course_details`. This is cosmetic (auto-generated types may not have synced yet) but worth noting.

**5. Knowledge Base category mismatch**
When saving `course_details` to KB, the category is set to `"course_details"` — but the KB categories defined in `KnowledgeBasePage.tsx` may not include this value, making the entry hard to find.

**6. `processProgress` initialization resets `course_details`**
Line 157: `newItemsByType` is rebuilt by spreading `EMPTY_ITEMS` then overwriting specific keys — `course_details` is inherited from the spread correctly, but the explicit list is inconsistent (missing `course_details`). Not a bug, but confusing.

---

### Proposed Changes

| # | File | Change |
|---|------|--------|
| 1 | `src/components/DocumentProcessorDialog.tsx` | Remove XLSX/DOCX from `ACCEPTED` types, update help text to "PDF, JPG, PNG" |
| 2 | `src/components/DocumentProcessorDialog.tsx` | Add missing `course_details` columns to review table (use expandable rows or show all 7 fields) |
| 3 | `src/components/DocumentProcessorDialog.tsx` | Add duplicate checking before insert for courses, campuses, timetable, intakes (skip existing by name+university_id) |
| 4 | `src/components/DocumentProcessorDialog.tsx` | Fix `newItemsByType` initialization to explicitly include `course_details: []` |

