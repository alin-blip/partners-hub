

# EduForYou UK — Agent Management Platform (MVP)

## Overview
A multi-role platform where **Agents** enroll students into UK universities, **Admins** manage agent teams, and the **Owner (Alin)** has full operational visibility. Built with Supabase for auth, database, and RLS.

## Design System
- **Navy sidebar/headers** (#0A1628), **Orange CTAs** (#F97316), white cards, light gray (#F3F4F6) backgrounds
- Inter font, 8px rounded corners, soft card shadows
- Collapsible sidebar with role-based menu items
- Professional, premium dashboard aesthetic

## Database (Supabase)
**Tables:**
1. `profiles` — extends auth.users: full_name, email, phone, admin_id (FK self-ref for agent→admin link), is_active
2. `user_roles` — separate role table (owner/admin/agent) with `has_role()` security definer function
3. `universities` — name, is_active
4. `campuses` — university_id FK, name, city
5. `courses` — university_id FK, name, study_mode, level
6. `intakes` — university_id FK, start_date, application_deadline, label
7. `students` — agent_id FK, first/last name, email, phone, dob, immigration_status, qualifications, notes
8. `enrollments` — student_id, university_id, campus_id, course_id, intake_id, status (applied→active/rejected), notes

**RLS:** Owner sees all; Admin sees their agents' data; Agent sees only own data. Uses `has_role()` security definer to avoid recursion.

## Pages & Features

### Authentication
- Email/password login (no public signup — Owner/Admin create users)
- Role-based redirect after login: `/owner/dashboard`, `/admin/dashboard`, `/agent/dashboard`
- Protected route layout wrapper

### Sidebar Navigation
- Dashboard, Students, Enrollments (all roles)
- Agents management (Owner only)
- Settings — CRUD for universities, campuses, courses, intakes (Owner only)

### Owner Dashboard
- 4 metric cards: Total Students, Active Agents, Pipeline Students, Estimated Revenue
- All Agents table with student counts and status
- Recent Enrollments table with colored status badges

### Admin Dashboard
- 3 metric cards: My Agents, Team Students, Team Enrollments
- My Agents table with performance metrics
- Team Students table with status badges

### Agent Dashboard
- 3 metric cards: My Students, Active Enrollments, Commission Tier
- Prominent "+ New Student Enrollment" orange button
- My Students table with status badges
- Monthly target progress bar

### Multi-Step Enrollment Form (Agent)
- **Step 1:** Cascading dropdowns — University → Campus → Course → Intake
- **Step 2:** Student details — name, email, phone, DOB, immigration status, qualifications
- **Step 3:** Review & submit — creates student + enrollment with status "applied"

### Student Pipeline / Enrollments View
- List view with colored status badges (Applied=blue, Documents Submitted=yellow, Processing=orange, Accepted=light green, Enrolled=green, Active=dark green, Rejected=red)
- Click to view details; Owner/Admin can update status

### Settings Page (Owner)
- CRUD tables for Universities, Campuses, Courses, and Intakes
- Add/edit/delete with simple table UI

### CSV Export
- Owner can export filtered student+enrollment data as CSV

