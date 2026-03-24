

# Plan: AI Chat Persistence + Owner Chat Monitoring

## What We're Building

1. **Chat conversation persistence** — Every message (user + assistant) saved to DB, conversations resumable across sessions
2. **Conversation history sidebar** — Users can see past conversations, start new ones, resume old ones
3. **Owner/Admin monitoring page** — Owner sees ALL conversations from all users; Admin sees their team's conversations. Full tracking of what agents/admins ask the AI.

---

## Database

### Table: `ai_conversations`
- `id` (uuid, PK), `user_id` (uuid, NOT NULL), `title` (text, default 'New conversation'), `created_at`, `updated_at`
- RLS: Users CRUD own; Admin SELECT team's (via profiles.admin_id); Owner SELECT all

### Table: `ai_messages`
- `id` (uuid, PK), `conversation_id` (uuid, FK → ai_conversations), `role` (text: 'user'/'assistant'), `content` (text), `created_at`
- RLS: same pattern — users manage own conversation's messages; Admin/Owner read team/all

---

## Edge Function Update (`ai-chat/index.ts`)

- Accept optional `conversation_id` in request body
- After authenticating user, if no `conversation_id`: create new conversation, return its ID in response headers
- Save each user message to `ai_messages` before calling AI
- After streaming completes, save the full assistant response to `ai_messages`
- Auto-generate conversation title from first user message (truncate to 50 chars)

---

## Frontend: `AIChatPanel.tsx` Rewrite

- Add conversation list sidebar (left pane inside the Sheet) showing past conversations with titles + dates
- "New Chat" button at top
- On selecting a conversation: load its messages from DB and display
- On sending: save message to DB, stream response, save assistant reply to DB
- Track `activeConversationId` in state

---

## New Page: `/owner/ai-monitoring` (and `/admin/ai-monitoring`)

### `src/pages/owner/AIMonitoringPage.tsx`
- Table showing all conversations: User Name, Role, Title, Message Count, Last Activity
- Click to expand/view full conversation transcript (read-only)
- Filters: by role (agent/admin), by date range, search in messages
- Admin version: only shows conversations from their team agents
- Owner version: shows ALL conversations

### Routing & Sidebar
- Add routes `/owner/ai-monitoring` and `/admin/ai-monitoring` in App.tsx
- Add "AI Monitoring" link with MessageSquare icon in sidebar for Owner and Admin

---

## Technical Details

- Messages saved via `adminClient` (service role) in the edge function to bypass RLS
- Conversation list fetched client-side via supabase client (RLS handles scoping)
- Admin team scoping: `ai_conversations.user_id IN (SELECT id FROM profiles WHERE admin_id = auth.uid())` + own conversations
- Owner: `has_role(auth.uid(), 'owner')` → sees all
- Conversation title: first user message truncated to 50 chars, set on first message

