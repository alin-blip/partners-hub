EduForYou UK Agent Management Platform - design system and architecture decisions

## Design System
- Primary (navy): hsl(220 60% 10%) — sidebar, headers
- Accent (orange): hsl(24 95% 53%) — CTAs, highlights, active states
- Background: hsl(220 20% 97%), Cards: white
- Font: Inter (Google Fonts import in index.css)
- Border radius: 0.5rem (--radius)

## Architecture
- Roles stored in separate `user_roles` table (NOT on profiles)
- `has_role()` and `get_user_role()` security definer functions
- RLS: Owner=all, Admin=team agents' data, Agent=own data only
- No public signup — Owner creates users via Agents page
- Auto-profile creation via auth trigger on signup

## Route Structure
- /owner/dashboard, /admin/dashboard, /agent/dashboard
- Shared: /[role]/students, /[role]/students/:id, /[role]/enrollments, /[role]/profile
- Owner only: /owner/agents, /owner/settings, /owner/commissions
- Agent only: /agent/enroll

## Key Tables
profiles, user_roles, universities, campuses, courses, intakes, students, enrollments, commission_tiers

## Storage
- `student-documents` bucket (private) — files stored as `{student_id}/{DocType}_{timestamp}.ext`
- RLS: Agent=own students, Admin=team students, Owner=all

## Features Implemented
- Commission system with tier matching and CRUD in Settings
- Hierarchical admin→agent dashboard with charts
- Student detail page with edit + document upload/download
- Search, filter, server-side pagination on Students & Enrollments
- Profile page with password change
- Forgot password flow on Login page
