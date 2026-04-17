

# Plan: "Start Here" Learning Hub

## What We're Building
A new "Start Here" section in the sidebar that opens a learning page — structured like an online course with modules, lessons, videos, and resources. Owners/Admins can manage content; Agents consume it and track progress.

## Sidebar Change
Add a new top item **"Start Here"** (icon: `Rocket` or `GraduationCap`) above "Dashboard" with a small "NEW" badge to draw attention. Visible to all roles.

## Page Structure: `/[role]/learn`

```text
┌─────────────────────────────────────────────┐
│ 🚀 Start Here — Your Learning Path          │
│ Progress: ████████░░ 60% (12/20 lessons)    │
├─────────────────────────────────────────────┤
│ ▼ Start Here — Setup & Commissions          │
│   ✓ Optimize your platform profile  [3:24]  │
│   ✓ Understanding commissions       [5:10]  │
│                                             │
│ ▼ Module 1 — Master the Process             │
│   ○ Enrollment process overview     [4:00]  │
│   ○ Funding & requirements          [6:15]  │
│   ○ Admission test walkthrough      [3:45]  │
│   ○ University: GBS                 [5:00]  │
│   ○ University: Regent              [5:00]  │
│   ○ ... (one per uni)                       │
│                                             │
│ ▼ Module 2 — Admission Test Prep            │
│ ▼ Module 3 — Marketing & First Client       │
│ ▼ 7-Day Live Challenge                      │
└─────────────────────────────────────────────┘

[Click lesson] → Video player + description + attached resources (PDFs, links)
```

## Database (3 new tables)

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `learn_modules` | Top-level sections | `id`, `title`, `description`, `icon`, `sort_order`, `is_published` |
| `learn_lessons` | Videos inside modules | `id`, `module_id`, `title`, `description`, `video_url`, `video_duration`, `thumbnail_url`, `attachments` (jsonb), `sort_order`, `is_published` |
| `learn_progress` | Per-agent tracking | `id`, `user_id`, `lesson_id`, `completed_at`, `watched_seconds` |

**RLS**: Everyone reads published modules/lessons. Only Owner/Admin write. `learn_progress` — users read/write only their own rows.

**Seed data**: Pre-populate the 4 modules + section titles ("Start Here", "Module 1", "Module 2", "Module 3", "7-Day Challenge") so structure exists immediately. Lessons can be added later via the UI.

## Video Storage
- New Supabase storage bucket `learn-videos` (public read, owner/admin write).
- Videos are uploaded directly via the lesson editor (drag & drop, MP4).
- Thumbnails auto-extracted on upload (or uploaded manually).
- Also support external URLs (YouTube/Loom) so screen recordings hosted elsewhere can be embedded without re-upload.

## Pages & Components

| File | Purpose |
|------|---------|
| `src/pages/shared/LearnPage.tsx` | Main learning hub (modules + lessons accordion, progress bar) |
| `src/components/learn/LessonPlayer.tsx` | Dialog/full-screen with video player, description, resources, "Mark complete" |
| `src/components/learn/LessonEditor.tsx` | Owner/Admin: create/edit lessons (upload video, set title, attach files) |
| `src/components/learn/ModuleEditor.tsx` | Owner/Admin: create/edit modules |
| `src/components/AppSidebar.tsx` | Add "Start Here" nav item with NEW badge |
| `src/App.tsx` | Add routes: `/owner/learn`, `/admin/learn`, `/agent/learn` |

## Editor UX (Owner/Admin only)
- Floating "+ Add Lesson" button per module
- Inline drag-and-drop reorder for modules and lessons
- Video upload with progress bar
- Rich text description
- Multiple file attachments (PDFs, slides)

## Agent UX
- Clean Udemy-style accordion list
- ✓ checkmark on completed lessons
- Auto-mark complete when video reaches 90%
- Manual "Mark as complete" button as fallback
- Progress bar at top showing % completion across all published lessons

## Notes
- Reuses existing `DashboardLayout`, brand colors (Navy + Gold), and accordion components — no design system changes
- Fully additive: no existing tables, routes, or components are modified beyond adding the sidebar item and routes
- 7-Day Live Challenge is just a module like the others — lessons can include scheduled live session links/replays

