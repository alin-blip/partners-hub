

# Plan: Fix location display + campus search fallback

## Problem 1: Location display is inline (comma-separated)
Currently locations show as one truncated line. User wants bullet points, one per line.

## Problem 2: UWTSD campus search doesn't work
UWTSD has 4 campuses in `campuses` table but **zero entries** in `course_timetable_groups` linking courses to campuses. The current logic only builds `courseCampusMap` from `course_timetable_groups`, so UWTSD courses have no campus data.

## Solution

### File: `src/pages/shared/UniversitiesCoursesPage.tsx`

**1. Fallback logic for campus mapping (lines 141-152)**
After building `courseCampusMap` from `course_timetable_groups`, add a fallback: for any course that has NO entries in the map, inherit all campuses from its university. This way UWTSD courses (and any others without timetable groups) will show their university's campuses.

**2. Location display as bullet list (lines 382-394)**
Replace the single-line `<span className="truncate">` with a vertical list:
- Icon `MapPin` aligned to top
- Each location on its own line as a bullet point
- No truncation, show all locations

### File: `src/components/DashboardSearchCard.tsx`
Apply the same fallback logic for campus mapping so search works there too.

