# Memory: index.md
Updated: now

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
- Shared: /[role]/students, /[role]/enrollments, /[role]/resources, /[role]/profile, /[role]/enroll
- Owner only: /owner/agents, /owner/settings, /owner/commissions, /owner/knowledge-base
- Admin only: /admin/agents, /admin/knowledge-base

## Key Tables
profiles, user_roles, universities, campuses, courses, intakes, students, enrollments, commission_tiers, promotions, resources, ai_knowledge_base

## AI Chat
- Edge function `ai-chat` with user-scoped context via JWT
- Fetches ai_knowledge_base + role-scoped student/enrollment data
- Agent sees only own students, Admin sees team, Owner sees summary stats
- AIChatPanel sends JWT for auth, streams SSE with markdown rendering
