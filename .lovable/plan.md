

## Plan: Simplify Sidebar Navigation

### Current State
Three separate sidebar items: Students, Enrollments, Documents — plus each student detail page already has tabs for Enrollments, Documents, Funding, Notes.

### Analysis
- **Students page**: Essential — entry point to all student data
- **Enrollments page**: Useful as a global pipeline view (all enrollments across students, filterable by status). Owner/admin use this to see the big picture without clicking into each student.
- **Documents page**: Owner/admin-only global view of all uploaded documents across students.

### Options

**Option A — Keep all 3 (recommended)**
Students = student list, Enrollments = global pipeline/status tracker, Documents = global doc overview. Each serves a different cross-cutting purpose. No changes needed.

**Option B — Merge Enrollments into Students, remove Documents**
Remove Enrollments and Documents from sidebar. Add status filter columns directly to the Students table. Remove `/owner/documents` and `/[role]/enrollments` routes. Simpler navigation but loses the global pipeline view.

**Option C — Keep Students + Enrollments, remove Documents**
Documents page is the least useful since docs are always tied to a student. Remove only the Documents sidebar item and route. Keep Enrollments as the global pipeline tracker.

### Recommendation
**Option C** — Remove Documents from sidebar (it's accessible per-student in the detail tabs). Keep Enrollments as it serves as a valuable pipeline/status dashboard for owner/admin to track all applications at a glance.

### Changes (if Option C approved)
1. **AppSidebar.tsx** — Remove Documents nav item (lines 79-81)
2. **App.tsx** — Optionally keep route but remove from navigation
3. No database changes needed

