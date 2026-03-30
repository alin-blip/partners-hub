

## Plan: Scrape Course Details from University Websites

Create a new edge function `scrape-course-details` that, for each university:
1. Queries the DB for courses that DON'T have a `course_details` entry yet
2. Uses Firecrawl to map + scrape course pages from the university website
3. Uses AI to match scraped content to existing course names and extract details
4. Upserts results into `course_details` table

Then add a UI trigger on the Universities page (or Settings) to run this per-university.

### Edge Function: `supabase/functions/scrape-course-details/index.ts`

**Input:** `{ university_id: string, university_url: string }`

**Flow:**
1. Auth check (owner/admin only)
2. Query `courses` for the given `university_id` where no matching `course_details` row exists (LEFT JOIN)
3. If no courses missing details, return early
4. Use Firecrawl `/v1/map` to discover course page URLs on the university site
5. For each course without details, try to find a matching URL from the map results (fuzzy match course name in URL)
6. Scrape matched URLs in batches of 5 using Firecrawl `/v1/scrape`
7. Send all scraped content + list of course names to the AI (Gemini Flash) with a prompt to extract structured details per course:
   - `entry_requirements`, `admission_test_info`, `interview_info`, `documents_required`, `personal_statement_guidelines`, `additional_info`
8. Upsert results into `course_details` table
9. Return summary of how many courses got details

### UI: Add button on `UniversitiesCoursesPage.tsx`

- Add a "Scan Course Details" button (visible to owner/admin) per university tab
- Shows a loading state while scanning
- On completion, shows a toast with summary and refreshes the course details query
- University URL mapping is hardcoded in the frontend:
  ```typescript
  const UNIVERSITY_URLS: Record<string, string> = {
    "Global Banking School": "https://globalbanking.ac.uk/",
    "QA": "https://qahighereducation.com/",
    "Regent": "https://www.rcl.ac.uk/",
    "Arden": "https://arden.ac.uk/",
    "LSC": "https://www.lsclondon.co.uk/",
    "UWTSD": "https://www.uwtsd.ac.uk/",
  };
  ```

### Files to Create/Edit

| File | Change |
|------|--------|
| `supabase/functions/scrape-course-details/index.ts` | New edge function: map site → scrape → AI extract → upsert course_details |
| `src/pages/shared/UniversitiesCoursesPage.tsx` | Add "Scan Details" button per university for owner/admin |

### Technical Details

- The AI prompt instructs Gemini to return a JSON array where each object has `course_name` (must match exactly one of the provided names) plus the 6 detail fields
- Courses that the AI can't find info for are skipped (no empty rows inserted)
- Uses service role key for DB operations in the edge function
- Firecrawl map search query uses the course names to find relevant pages
- Scrapes up to 30 pages per university to stay within reasonable limits

