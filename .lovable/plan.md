

# Platform Gap Analysis & Enhancement Plan

## Current State Summary
The platform has solid foundations: role-based auth (Owner/Admin/Agent), student enrollment workflow, commission tracking, hierarchical dashboards, and settings management. Here's what's missing to make it a competitive, production-ready agent management platform.

---

## Priority 1 — Critical Missing Features

### 1. Student Detail Page with Document Upload
**Problem**: No way to view/edit a student after creation. No document management (passports, transcripts, offer letters).
- New page: `/[role]/students/:id` — full student profile with edit capability
- File storage bucket for student documents (passport, qualifications, visa docs)
- Document upload/download with status tracking per document type
- Activity timeline showing enrollment status changes

### 2. Search, Filter & Pagination
**Problem**: All list pages (Students, Enrollments, Users) show raw lists with no search or filtering. Breaks with scale.
- Add search bar to Students, Enrollments, and Users pages
- Filter by: status, university, agent, date range, immigration status
- Server-side pagination (currently fetches all rows)

### 3. Notifications System
**Problem**: No way for Admins/Owners to communicate status changes to agents. Agents don't know when enrollment status changes.
- New `notifications` table (user_id, title, message, read, created_at)
- Bell icon in header with unread count
- Auto-notify agent when their enrollment status changes (database trigger)
- Notifications dropdown/page

### 4. Password Reset / Profile Management
**Problem**: No way to change password or update own profile. No "forgot password" flow.
- Add profile edit page (name, phone, password change)
- Add "Forgot password" link on login page using auth reset flow

---

## Priority 2 — Operational Improvements

### 5. Enrollment Notes & Timeline
**Problem**: No audit trail of who changed what on an enrollment. Notes field exists but no UI to use it.
- New `enrollment_timeline` table (enrollment_id, user_id, action, note, created_at)
- Show timeline on enrollment detail view
- Auto-log status changes with user and timestamp

### 6. Dashboard Date Range Filters
**Problem**: Owner/Admin dashboards show all-time data with no period filtering.
- Add date range picker to dashboards
- Filter metrics and charts by selected period

### 7. Admin Dashboard Enhancements
**Problem**: Admin dashboard is sparse — no commission view, no agent performance comparison.
- Add commission tracking for the admin's team
- Add agent performance bar chart (same style as owner dashboard)

### 8. Bulk Actions & CSV Import
**Problem**: Each student must be enrolled individually. No bulk operations.
- CSV import for students (template download + upload)
- Bulk status update for enrollments (select multiple, change status)

---

## Priority 3 — Polish & UX

### 9. Responsive Mobile Experience
**Problem**: Tables and charts don't work well on mobile.
- Card-based list view for mobile (instead of tables)
- Responsive chart sizing

### 10. Dark Mode Support
- Toggle in header or sidebar
- Already using CSS variables so mostly theme layer changes

### 11. Loading States & Error Boundaries
**Problem**: Pages show blank or "Loading..." with no skeleton states.
- Add skeleton loaders to all data tables and metric cards
- Add error boundary components with retry

### 12. Data Export Enhancements
**Problem**: Only Students page has CSV export. Owner needs enrollment and commission reports.
- Add CSV/PDF export to Enrollments page
- Add CSV/PDF export to Commissions page

---

## Recommended Implementation Order

| Phase | Features | Effort |
|-------|----------|--------|
| Phase 1 | Student Detail + Documents, Search/Filter, Password Reset | ~8 steps |
| Phase 2 | Notifications, Enrollment Timeline, Admin Dashboard upgrade | ~6 steps |
| Phase 3 | Bulk Import, Export enhancements, Date filters | ~4 steps |
| Phase 4 | Mobile polish, Dark mode, Skeletons | ~4 steps |

---

## Technical Notes
- Document storage requires a new storage bucket with RLS policies per role
- Notifications table needs RLS (users see only their own) + realtime subscription
- Enrollment timeline requires a database trigger to auto-log status changes
- Search/filter should use Supabase `.ilike()` and `.range()` for server-side pagination
- Password reset uses `supabase.auth.resetPasswordForEmail()`

