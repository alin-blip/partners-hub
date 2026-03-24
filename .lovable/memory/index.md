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
- Shared: /[role]/students, /[role]/students/:id, /[role]/enrollments, /[role]/profile, /[role]/enroll, /[role]/resources
- Owner only: /owner/agents, /owner/settings, /owner/commissions
- Admin only: /admin/agents

## Key Tables
profiles, user_roles, universities, campuses, courses, intakes, students, enrollments, commission_tiers, promotions, resources

## Storage
- `student-documents` bucket (private) — files stored as `{student_id}/{DocType}_{timestamp}.ext`
- `resource-files` bucket (public) — files stored as `{category}/{timestamp}_{filename}`

## Features Implemented
- Commission system with tier matching and CRUD in Settings
- Hierarchical admin→agent dashboard with charts
- Student detail page with edit + document upload/download
- Search, filter, server-side pagination on Students & Enrollments
- Profile page with password change
- Forgot password flow on Login page
- Owner/Admin/Agent can all enroll students personally
- Resource Hub: categories (Social Media, Guides, FAQ, Training, Brand Assets), upload for Owner/Admin
- AI Knowledge Bot: slide-over chat panel, streaming via ai-chat edge function, markdown rendering, Lovable AI gateway
