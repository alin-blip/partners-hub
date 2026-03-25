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
- Shared: /[role]/students, /[role]/enrollments, /[role]/create-image
- Owner only: /owner/agents, /owner/settings
- Agent only: /agent/enroll

## Key Tables
profiles (with avatar_url), user_roles, universities, campuses, courses, intakes, students, enrollments, commission_tiers, brand_settings, generated_images, ai_conversations, ai_messages

## Storage Buckets
student-documents (private), resource-files (public), brand-assets (public), generated-images (public), avatars (public)

## AI Features
- AI Chat: edge function ai-chat, persisted in ai_conversations + ai_messages
- AI Image Generator: edge function generate-image, uses google/gemini-3.1-flash-image-preview
  - 5 images/user/day limit
  - Brand settings (prompt + logo) auto-injected
  - Agent photo can be included in generated images
  - Presets: social_post, story, flyer, banner
