

## Global Course Search + Dashboard Search Card

### What We're Building
1. **"All" tab on Universities & Courses page** — an extra tab before university-specific tabs that shows courses from all universities, with search across course name, university name, study mode, level, etc.
2. **Search card on Agent Dashboard** (and Owner/Admin dashboards) — a prominent search input that searches courses globally and shows inline results, linking to the Universities page or directly to enrollment.

### File Changes

**1. `src/pages/shared/UniversitiesCoursesPage.tsx`**
- Change `selectedUniId` default to `"all"` instead of auto-selecting first university
- Add an "All" button before the university tabs with total course count badge
- When `effectiveUniId === "all"`, skip the `university_id` filter so all courses show
- Expand search to match against: course name, university name (via lookup), study mode, level, duration
- Show university name on each course card when in "All" mode (small badge or subtitle)
- Hide "Scan Details" button when "All" is selected

**2. `src/components/DashboardSearchCard.tsx`** (new file)
- A reusable card with a search input
- Queries `courses` + `universities` tables, filters client-side by search term across course name, university name, level, study mode
- Shows up to 6 matching results as compact list items (course name, university, level badge)
- Each result has an "Apply" button navigating to enroll page and a click to go to Universities page with that university pre-selected
- Empty state: "Search courses, universities, study modes..."

**3. `src/pages/agent/AgentDashboard.tsx`**
- Import and render `<DashboardSearchCard />` near the top, after promo/commission sections

**4. `src/pages/owner/OwnerDashboard.tsx`**
- Import and render `<DashboardSearchCard />` in the dashboard

**5. `src/pages/admin/AdminDashboard.tsx`**
- Import and render `<DashboardSearchCard />` in the dashboard

### Technical Notes
- Search is client-side since course data is already fetched via React Query with the same query keys
- The dashboard search card will use its own small `useQuery` for courses + universities (cached by React Query)
- Navigation from dashboard search results uses `navigate(`/${role}/universities?search=...`)` or direct enroll link

