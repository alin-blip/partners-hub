

## Plan: User Feedback System

### Overview
Add a feedback collection system accessible from the sidebar for all roles, with an owner-only page to review all submissions.

### 1. Database: `feedback` table

```sql
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  category TEXT NOT NULL DEFAULT 'suggestion',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
);
```

RLS policies:
- All authenticated users can INSERT (own feedback, `user_id = auth.uid()`)
- All authenticated users can SELECT own feedback
- Owner can SELECT/UPDATE all feedback

### 2. New page: `FeedbackPage.tsx` (owner only)

Path: `/owner/feedback`

- Table showing all feedback with columns: Date, User (join profiles), Category, Message, Status
- Filter by status (New / Reviewed / Done)
- Owner can mark feedback as "Reviewed" or "Done"

### 3. Feedback dialog component: `FeedbackDialog.tsx`

- A dialog triggered from the sidebar menu item "Help us improve"
- Fields: Category dropdown (Suggestion, Bug, Simplify, New Feature), Message textarea
- Submits to `feedback` table
- Toast confirmation on success

### 4. Sidebar update: `AppSidebar.tsx`

- Add "Feedback" item with `MessageSquareHeart` icon in the footer area (visible to all roles)
- For owner: also add "Feedback" in Management section linking to `/owner/feedback`

### 5. Routes: `App.tsx`

- Add `/owner/feedback` route pointing to `FeedbackPage`

### Technical Details
- The dialog opens inline from sidebar (no navigation needed for submitting)
- Owner's management page is a separate route for reviewing all feedback
- `feedback.status` allows owner to track which items have been addressed

