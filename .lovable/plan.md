

# Plan: Enhanced Export Dialog with Category Selection and Format Choice

## What changes

Replace the current "Download All" button with an "Export Data" button that opens a dialog where the owner can:
1. **Select categories** via checkboxes (Universities, Campuses, Courses, Course Details, Intakes, Timetable Options + Groups, Commission Tiers, Brand Settings, Promotions)
2. **Choose format**: JSON, CSV, or TXT summary
3. Download a ZIP containing only the selected categories in the chosen format

## Missing data in current export
- `course_details` (entry requirements, documents required, personal statement guidelines, etc.)
- `course_timetable_groups` (which courses/campuses map to which timetable option)

Both will be added as selectable categories.

## Implementation

### File: `src/pages/owner/SettingsPage.tsx`

**Remove** the inline `downloadAllData` function and the simple "Download All" button.

**Add** an `ExportDialog` component (inline in the same file) containing:
- State: `exportOpen`, `selectedCategories` (Set of strings), `exportFormat` ("json" | "csv" | "txt")
- Checkboxes for each category with a "Select All / Deselect All" toggle
- Radio group or select for format (JSON, CSV, TXT Summary)
- "Export" button that:
  1. Fetches only the selected tables via `Promise.all` (conditionally)
  2. For **JSON**: bundles each selected category as `{category}.json` in a ZIP
  3. For **CSV**: converts each table to CSV (headers from keys, rows from values) and bundles as `{category}.csv`
  4. For **TXT**: generates the human-readable summary (existing logic, extended with course details and timetable data)
  5. Downloads the ZIP

**Categories map**:

| Checkbox label | Tables fetched |
|---|---|
| Universities | `universities` |
| Campuses | `campuses` + join universities(name) |
| Courses | `courses` + join universities(name) |
| Course Details | `course_details` + join courses(name, universities(name)) |
| Intakes | `intakes` + join universities(name) |
| Timetable Options | `timetable_options` + `course_timetable_groups` joined |
| Commission Tiers | `commission_tiers` + join universities(name) |
| Brand Settings | `brand_settings` |
| Promotions | `promotions` |

**CSV helper**: Simple function that takes an array of objects, extracts unique keys as headers, and writes comma-separated rows with proper escaping.

## Files modified
1. `src/pages/owner/SettingsPage.tsx` — replace download button + add ExportDialog with category checkboxes and format selector

## Files created
None.

## Technical details
- Uses existing `jszip` dependency for ZIP generation
- CSV conversion: flat fields only, nested objects (like `universities.name`) flattened to `university_name`
- Checkbox component already available from `@/components/ui/checkbox`
- RadioGroup from `@/components/ui/radio-group` for format selection
- No DB changes needed

