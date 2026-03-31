

## Improve Course Details Text Formatting

### Problem
The `formatDetailText` function in `CourseDetailsInfoCard.tsx` doesn't handle the actual data patterns. Real data uses:
- **Semicolons** as list separators (e.g., entry requirements with `;` between items)
- **Long sentences with periods** that should be split into separate bullet points
- **Colons followed by content** that acts as sub-section headers (e.g., "Applicants Aged 21+: We welcome...")
- **Mixed patterns** — some fields are comma-separated, others are semicolon-separated, others are paragraph-style

Current comma-split logic works for `documents_required` but fails for `entry_requirements`, `interview_info`, and `admission_test_info`.

### Solution
Enhance `formatDetailText` in `src/components/CourseDetailsInfoCard.tsx` to:

1. **Detect semicolon-separated lists** — split on `;` when 2+ items exist, render as bullet points
2. **Detect sentence-based content** — when text has 2+ sentences (`. ` followed by uppercase), split into individual bullet points
3. **Sub-section headers** — detect patterns like "Label:" at the start of a bullet and render the label bold
4. **Smarter paragraph detection** — for long single blocks without clear delimiters, split on `. ` to create scannable items
5. **Priority order**: newlines first → semicolons → commas → sentence splitting

### File Changes
**`src/components/CourseDetailsInfoCard.tsx`** — Update the `formatDetailText` function:
- Add semicolon splitting: `line.split(/;\s*/)` when 2+ segments, each rendered as `<li>`
- Add sentence splitting: for lines >150 chars with no other delimiters, split on `. ` (followed by uppercase letter) into bullets
- Keep existing comma, dash, and numbered list detection
- Keep existing bold-before-colon logic

No database changes. No other files affected.

