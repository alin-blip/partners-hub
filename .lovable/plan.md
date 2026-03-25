

# Plan: Scrape GBS Website & Bulk Import Courses + Knowledge Base

## Overview
Use Firecrawl to scrape www.globalbanking.ac.uk, extract all courses, campuses/locations, and course details, then:
1. Bulk insert into `universities`, `campuses`, `courses` tables
2. Auto-generate Knowledge Base entries per university and per course

## Steps

### 1. Connect Firecrawl
Link the existing Firecrawl connection to this project so edge functions can use `FIRECRAWL_API_KEY`.

### 2. Create Edge Function `scrape-university`
A new edge function that:
- Accepts a URL (e.g. `www.globalbanking.ac.uk`)
- Uses Firecrawl **map** to discover all course/programme pages
- Uses Firecrawl **scrape** (with JSON schema extraction) on each course page to extract structured data: course name, level (undergraduate/postgraduate), study mode, campus/location, duration, entry requirements, description
- Returns the structured data

### 3. Create Edge Function `bulk-import-university`
Accepts the scraped structured data and:
- Creates/finds the university in `universities` table ("Global Banking School")
- Creates/finds campuses from locations found
- Inserts all courses linked to the university
- Creates Knowledge Base entries:
  - One overview entry per university (category: "courses")
  - One entry per course with full details (category: "courses")
- Returns a summary of what was imported

### 4. New UI: "Import from Website" button on Settings or Knowledge Base page
- Owner clicks "Import from Website"
- Enters university website URL
- System scrapes, shows preview of found courses/locations
- Owner confirms → bulk import runs
- Shows success summary with counts

## Files to create/modify

| File | Action |
|------|--------|
| `supabase/functions/scrape-university/index.ts` | New — Firecrawl scrape + extract |
| `supabase/functions/bulk-import-university/index.ts` | New — DB inserts |
| `src/pages/owner/KnowledgeBasePage.tsx` | Add "Import from Website" button + dialog |
| `src/App.tsx` | No change needed |

## Knowledge Base structure per university
- **"GBS — Overview"** (category: courses): General info, all locations, programme list
- **"GBS — BSc Banking & Finance"** (category: courses): Full course details, entry requirements, duration, study modes
- One entry per course found

## Technical details

### Firecrawl flow
1. `map(url)` → get all URLs on the site
2. Filter URLs containing `/courses/`, `/programmes/`, or similar patterns
3. `scrape(url, { formats: [{ type: 'json', schema: courseSchema }] })` on each course URL
4. Aggregate results

### Course schema for extraction
```json
{
  "name": "string",
  "level": "string (undergraduate/postgraduate/foundation)",
  "study_mode": "string (full-time/part-time/blended)",
  "duration": "string",
  "campus_locations": ["string"],
  "entry_requirements": "string",
  "description": "string"
}
```

### Security
- Edge functions validate JWT (owner only)
- Rate limited: one scrape at a time
- Preview before import (no auto-insert)

