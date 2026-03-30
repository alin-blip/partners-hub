

## Plan: Improve Course Details Visual Design

The current inline details section uses a generic card with plain text blocks — hard to scan and visually flat against the dark course card background.

### Changes

**File: `src/components/CourseDetailsInfoCard.tsx`**

Redesign the compact mode (used inside course cards) with:

1. **Remove the wrapping Card** in compact mode — it creates a card-inside-a-card that clashes with the dark slate background. Use a simple `div` instead.
2. **Section headers as colored badges/pills** — each section label (Entry Requirements, Admission Test, etc.) rendered as a small accent-colored badge instead of plain bold text.
3. **Better spacing and visual hierarchy** — each section gets a subtle left border accent line (like a quote block) for scanability.
4. **Improved text contrast** — use `text-slate-200` for labels and `text-slate-400` for content text to work with the dark card background.
5. **Accordion-style collapsible sections** — use the existing `Accordion` component so users can expand/collapse individual requirement sections, reducing visual noise when there are many sections.

**File: `src/pages/shared/UniversitiesCoursesPage.tsx`**

- Add a smooth expand animation on the details container (animate height with CSS transition class).

### Visual Result

```text
┌─────────────────────────────────┐
│ BA (Hons) Business Management   │
│ [Undergraduate] [Full-Time]     │
│ 📅 May 2026, May 2025          │
│                                 │
│  [Hide]  [Apply →]             │
│ ─────────────────────────────── │
│  ▸ Entry Requirements           │
│  ▸ Admission Test               │
│  ▸ Interview                    │
│  ▸ Documents Required           │
│  ▸ Personal Statement           │
└─────────────────────────────────┘
```

Each section expands on click to show the content with an accent left-border.

### Files to Edit
| File | Change |
|------|--------|
| `src/components/CourseDetailsInfoCard.tsx` | Redesign compact mode: accordion sections, accent borders, better dark-theme colors |
| `src/pages/shared/UniversitiesCoursesPage.tsx` | Add smooth expand animation on details wrapper |

