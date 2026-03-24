

# Plan: AI Knowledge Base + User-Scoped AI Context

## What We're Building

1. **Knowledge Base management page** — Owner/Admin can upload documents (PDFs, text files about courses, brand guidelines, processes) that feed into the AI assistant's context
2. **User-scoped AI context** — The AI edge function fetches the logged-in user's own data (their students, enrollments) so it answers in context of THAT user only, never leaking other agents' data

---

## Part A: Knowledge Base Table & Storage

### Database
- Create `ai_knowledge_base` table: `id` (uuid), `title` (text), `content` (text — extracted/pasted text), `category` (text: "courses", "brand", "processes", "immigration", "general"), `file_path` (text, nullable — for uploaded files), `created_by` (uuid), `created_at`
- RLS: Owner/Admin can CRUD; all authenticated can SELECT (the edge function reads it server-side anyway via service role)
- No new storage bucket needed — we store the knowledge as text content directly (copy-paste or text extraction), which is more reliable for AI consumption than parsing PDFs at query time

### Admin UI: Knowledge Base Page
- New page `src/pages/owner/KnowledgeBasePage.tsx`
- Tabs by category (Courses, Brand, Processes, Immigration, General)
- Each entry is a card showing title + preview of content + delete button
- "Add Knowledge" dialog: title, category dropdown, large textarea for content
- Route: `/owner/knowledge-base`, `/admin/knowledge-base`
- Sidebar: Add "Knowledge Base" link with Brain/BookOpen icon for Owner & Admin only

---

## Part B: User-Scoped AI with Knowledge Injection

### Frontend Changes (`AIChatPanel.tsx`)
- Pass the user's JWT token in the Authorization header (use `supabase.auth.getSession()` to get access token)
- This lets the edge function identify the user and fetch their specific data

### Edge Function Changes (`ai-chat/index.ts`)
1. **Extract user from JWT** — use Supabase client with service role to verify the token and get user ID + role
2. **Fetch knowledge base** — query `ai_knowledge_base` table, concatenate all content into system prompt
3. **Fetch user-specific data** (scoped by role):
   - If agent: fetch only THEIR students + enrollments
   - If admin: fetch their personal students + their team's agents/students
   - If owner: fetch summary stats (counts, not full data dumps to avoid token limits)
4. **Build enriched system prompt** with:
   - Company knowledge base documents
   - User's role and name
   - User's specific students/enrollments data
   - Clear instruction: "Only reference the data provided. Do not invent student names or enrollment details."

---

## Technical Details

### Edge function data fetching (pseudocode)
```
// 1. Verify JWT, get userId + role
// 2. Fetch all knowledge base entries
// 3. Based on role:
//    - agent: SELECT students WHERE agent_id = userId (limit 50)
//              + enrollments for those students with university/course names
//    - admin: same as agent for own + team agents' students
//    - owner: SELECT count(*) from students, enrollments grouped by status
// 4. Inject into system prompt as structured text
```

### System prompt structure
```
[Company Knowledge Base]
--- Courses ---
{content from knowledge base entries}
--- Brand Guidelines ---
{content}

[Your Context]
Role: Agent | Name: John Smith
Your Students (3):
- Maria Garcia (email: ...) — Enrollment: Applied at University of London, Business Management
- ...

[Rules]
- Only discuss data shown above
- Never reveal other agents' students
```

### Files to create/edit
- `supabase/migrations/xxx_knowledge_base.sql` — new table
- `src/pages/owner/KnowledgeBasePage.tsx` — new page
- `supabase/functions/ai-chat/index.ts` — major rewrite with DB fetching + user scoping
- `src/components/AIChatPanel.tsx` — send JWT token
- `src/App.tsx` — add routes
- `src/components/AppSidebar.tsx` — add nav link

