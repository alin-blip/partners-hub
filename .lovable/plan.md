

# Implementation Plan: EduForYou UK Platform Enhancement (6 Phases)

This plan implements the full audit prompt across 6 phases, building each feature completely before moving to the next.

---

## Phase 1: Promotional Banner System

### Database
- Create `promotions` table: `id`, `title`, `description`, `deadline` (timestamptz), `bonus_amount` (numeric), `bonus_percentage` (numeric), `target_students` (int), `is_active` (bool), `created_by` (uuid), `created_at`
- RLS: Owner manages all; authenticated users can read active promotions

### Frontend
- **`src/components/PromoBanner.tsx`**: Gradient card with Trophy icon, bold text, live countdown (days:hours:mins:secs), dismiss button (localStorage). Queries active promotions, shows most recent active one.
- **Settings page** (`src/pages/owner/SettingsPage.tsx`): Add "Promotions" tab with CRUD (same pattern as existing tabs)
- **Dashboard integration**: Add `<PromoBanner />` at top of `AgentDashboard.tsx`, `AdminDashboard.tsx`, and `OwnerDashboard.tsx`

---

## Phase 2: Resource Hub

### Database & Storage
- Create `resources` table: `id`, `title`, `description`, `category` (text: "social_media", "guides", "faq", "training", "brand_assets"), `file_url`, `link_url`, `created_by` (uuid), `created_at`
- RLS: Owner/Admin can insert/update/delete; all authenticated can read
- Create storage bucket `resources` (private, with RLS matching role hierarchy)

### Frontend
- **`src/pages/shared/ResourcesPage.tsx`**: Category tabs, grid of cards with preview/download. Owner/Admin see "Add Resource" button with upload dialog.
- **Sidebar**: Add "Resources" link with BookOpen icon for all roles
- **Routes**: Add `/owner/resources`, `/admin/resources`, `/agent/resources` in App.tsx

---

## Phase 3: AI Company Knowledge Bot

### Backend
- **Edge function `ai-chat/index.ts`**: 
  - Accepts `{ messages }` from client
  - Fetches platform data from DB (universities, courses with level/study_mode, campuses with city, intakes with dates, commission tiers)
  - Builds system prompt with all company knowledge injected
  - Calls Lovable AI Gateway with streaming enabled
  - Returns SSE stream

### Frontend
- **`src/components/AiChatPanel.tsx`**: Slide-over panel (Sheet component), message list with markdown rendering (react-markdown), input field, streaming token display
- **Trigger**: Chat bubble button (MessageCircle icon) fixed bottom-right of dashboard layout, or sidebar button
- Available to all authenticated users

---

## Phase 4: AI Image Generator

### Backend
- **Edge function `generate-image/index.ts`**:
  - Accepts `{ prompt, preset }` (preset: "social_post", "story", "flyer", "banner")
  - Prepends brand guidelines to prompt (EduForYou colors: navy #0f1729, orange #f97316, white backgrounds, "EduForYou UK" text)
  - Calls Lovable AI with `google/gemini-3.1-flash-image-preview` model and `modalities: ["image", "text"]`
  - Returns base64 image

### Storage
- Create bucket `generated-images` (private) for saving generated images

### Frontend
- **`src/pages/shared/CreateImagePage.tsx`**: Prompt input, preset selector (Social Post / Story / Flyer / Banner), generate button, result preview, save to gallery
- **Routes**: `/[role]/create-image`
- **Sidebar**: Add "Create Image" link with ImagePlus icon

---

## Phase 5: Gamification & Agent Success (Russell Brunson)

### Database
- Create `agent_milestones` table: `id`, `agent_id` (uuid), `milestone_key` (text), `completed_at` (timestamptz)
- RLS: Agents read/insert own; Owner/Admin read all

### Frontend Components
- **`src/components/Leaderboard.tsx`**: Table ranking agents by active enrollments this month. Shows rank, name, students count, tier, commission. Available at `/[role]/leaderboard`
- **`src/components/OnboardingChecklist.tsx`**: Card on Agent Dashboard for new agents. Steps: complete profile, read guide, enroll first student, upload documents. Checks completion from DB data.
- **`src/components/RewardTiersCard.tsx`**: Visual card showing all commission tiers with current tier highlighted and progress to next tier. Replaces hardcoded monthly target on Agent Dashboard.
- **Sidebar**: Add "Leaderboard" link with Trophy icon for all roles

---

## Phase 6: Operational Polish

### Database
- Create `notifications` table: `id`, `user_id`, `title`, `message`, `read` (bool default false), `created_at`. RLS: users read/update own only.
- Create `enrollment_timeline` table: `id`, `enrollment_id`, `user_id`, `action` (text), `note` (text), `created_at`. RLS: follows enrollment visibility.
- DB trigger on enrollments status update to auto-insert timeline entry and notification

### Frontend
- **`src/components/NotificationBell.tsx`**: Bell icon in DashboardLayout header with unread count badge, dropdown showing recent notifications. Realtime subscription for live updates.
- **Admin Dashboard upgrade**: Add commission tracking for team, agent performance bar chart (same pattern as Owner Dashboard), agent ranking table
- **Enrollment timeline**: Add timeline section to StudentDetailPage showing status change history
- **CSV export**: Add export buttons to EnrollmentsPage and CommissionsPage
- **Skeleton loaders**: Replace "Loading..." text with Skeleton components on all data pages

---

## Implementation Order

Each phase is self-contained. I will implement them one at a time, starting with Phase 1 (Promotional Banner System). After each phase, you can test before moving to the next.

| Phase | What | New Tables | Edge Functions |
|-------|------|-----------|----------------|
| 1 | Promotional Banner | `promotions` | None |
| 2 | Resource Hub | `resources` + bucket | None |
| 3 | AI Chat Bot | None | `ai-chat` |
| 4 | AI Image Generator | None + bucket | `generate-image` |
| 5 | Gamification | `agent_milestones` | None |
| 6 | Operational Polish | `notifications`, `enrollment_timeline` + triggers | None |

