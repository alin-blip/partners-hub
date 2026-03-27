

## Enhanced Import Summary + Knowledge Base Save Option

### What changes
Replace the current simple "Import Complete" step (step 3) with a detailed summary and action buttons.

### Step 3 redesign

After saving, show:

1. **Summary breakdown** — list each type saved with counts (e.g. "✓ 12 Courses, ✓ 3 Campuses, ✓ 5 Intakes")
2. **University name** displayed for context
3. **"Save to Knowledge Base" button** — inserts the imported data into `ai_knowledge_base` table so the AI chat can reference it (same pattern as `bulk-import-university` edge function)
4. **"Done" button** — closes without KB save

### Knowledge Base save logic

When user clicks "Save to Knowledge Base":
- For each type that was imported, create one `ai_knowledge_base` entry per type:
  - Title: `"{University Name} — {Type}s"` (e.g. "Oxford — Courses")
  - Content: formatted list of all saved items with their details
  - Category: `"courses"` / `"campuses"` / etc.
- Show a toast on success, then close dialog

### State tracking

- Store `savedSummary` (record of type → count) after handleSave succeeds
- Store `universityName` (looked up from `universities` prop) for display
- Add `savingToKB` loading state for the KB button

### File to modify
- `src/components/DocumentProcessorDialog.tsx` — expand step 3 UI, add KB save handler

