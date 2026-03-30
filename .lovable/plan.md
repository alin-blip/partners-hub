

## Plan: Extract Missing Course Details for CECOS and Regent

### Current Status

| University | Total Courses | With Details | Missing |
|-----------|--------------|-------------|---------|
| Global Banking School | 21 | 21 | 0 |
| QA (all) | 65 | 65 | 0 |
| LSC | 2 | 2 | 0 |
| UWTSD | 3 | 3 | 0 |
| MLA College | 1 | 1 | 0 |
| **CECOS** | 5 | 2 | **3** |
| **Regent** | 40 | 31 | **9** |

### Courses Missing Details

**CECOS (3):**
- BA Top Up in Business Management
- Human Resource Management
- Leadership Principles in Health & Social Care

**Regent (9):**
- BEng (Hons) Electrical and Electronic Engineering (UOB)
- BEng (Hons) Software Engineering (UOB)
- BSc (Hons) Computing with FY
- BSc (Hons) Health and Social Care - Top-Up
- HNC Digital Technologies
- HNC Engineering
- HNC in Business Management
- HNC in Health Care Practice (Integrated Health and Social Care)
- MSc Psychology

### Extraction Plan

1. **Regent** — Use the existing `scrape-course-details` edge function with `https://www.rcl.ac.uk/`. The function will search for course pages via Firecrawl, extract details with AI, and upsert into `course_details`. This should work since Regent is already in the URL mapping.

2. **CECOS** — CECOS is NOT in the current `UNIVERSITY_URLS` mapping. We need to:
   - Add CECOS URL to the mapping (need to identify their website)
   - Or manually scrape their site if they have one
   - Or populate manually if no public course pages exist

### Implementation

| Step | Action |
|------|--------|
| 1 | Run `scrape-course-details` for Regent (9 courses) via the edge function |
| 2 | Identify CECOS website URL and add to `UNIVERSITY_URLS` mapping |
| 3 | Run `scrape-course-details` for CECOS (3 courses) |
| 4 | For any courses the scraper misses, populate manually based on available info |

### Files to Edit

| File | Change |
|------|--------|
| `src/pages/shared/UniversitiesCoursesPage.tsx` | Add CECOS to `UNIVERSITY_URLS` mapping |

The edge function is already deployed and ready. We just need to trigger it for the two universities with missing data and add CECOS to the URL map.

