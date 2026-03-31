

## Improve Course Details Formatting

The current `CourseDetailsInfoCard` displays raw text from the database using `whitespace-pre-line`, which results in long, unformatted paragraphs (as seen in the screenshot for "Documents Required"). The goal is to parse and format this content with proper bullet points, sections, and visual hierarchy.

### Current Problem
- Content like "Documents Required" is stored as plain text with commas, dashes, and line breaks
- Displayed as a single block of text — hard to scan

### Approach
Update `CourseDetailsInfoCard.tsx` to add a **text formatting helper** that:

1. **Splits text into bullet points** — detects comma-separated lists, dash/bullet prefixed lines, and numbered items
2. **Highlights key terms** — bolds text before colons (e.g., "Passport/ID:" becomes **Passport/ID:**)
3. **Groups related items** — recognizes sub-sections (e.g., "Additional Documentation for EU applicants only:")

### Technical Details

**File: `src/components/CourseDetailsInfoCard.tsx`**

- Add a `formatDetailText(text: string)` helper function that:
  - Splits on newlines first
  - For lines containing comma-separated lists of document names, splits into individual bullet items
  - Detects patterns like `- item`, `• item`, `1. item` and renders as `<li>`
  - Bolds text before a colon (section headers within content)
  - Returns JSX with `<ul>` lists and proper spacing

- Replace the plain `<p>` rendering in both compact and full views with the formatted output
- Style bullets with small dot markers, proper indentation, and consistent `text-xs`/`text-sm` sizing
- Keep the existing accordion structure and colored borders unchanged

### Result
- Each detail section will show clean, scannable bullet points
- Key terms bolded for quick reference
- Sub-sections visually separated
- No database changes needed — purely a frontend formatting improvement

