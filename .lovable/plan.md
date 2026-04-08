

# Redesign AI Chat Quick Actions + Add To-Do Context + Voice Circle

## What changes

### 1. Update quick action buttons in `AIChatPanel.tsx`

Replace current `QUICK_ACTIONS` array:
- Remove "Visa guidance"
- Add "Available Universities" → prompt: "What universities are available for enrollment?"
- Add "Available Locations" → prompt: "What locations/campuses are available?"
- Keep "Enrollment process" and "Commission structure"
- Keep "My students"
- Add "What should I do now?" → prompt: "Based on my pending tasks, student statuses, and enrollment progress, what should I do next? Give me a prioritized action list."

### 2. Inject tasks data into AI context (`ai-chat/index.ts` + `elevenlabs-agent-token/index.ts`)

For agents: after the existing student/enrollment fetch, also query:
```sql
SELECT id, title, description, status, priority, deadline, student_id 
FROM tasks 
WHERE (assigned_to = userId OR created_by = userId) AND status != 'done'
ORDER BY priority DESC, created_at DESC LIMIT 30
```

Append a `[Your Tasks]` section to the system prompt listing pending tasks with their priority, deadline, and linked student name. Also add enrollment statuses that need action (e.g., "applied" → next step is documents).

Add instruction: "When the user asks 'what should I do now', analyze their pending tasks, student enrollment statuses, and suggest a prioritized action list with specific next steps."

For admins/owners: similar task fetch scoped to their role.

### 3. Inject universities + campuses data into both edge functions

Query available universities with campuses:
```sql
SELECT name, campuses(name, city) FROM universities WHERE is_active = true
```

Add `[Available Universities & Locations]` section to system prompt so the AI can answer "available universities" and "available locations" questions from live data.

### 4. Add voice circle below quick action buttons (`AIChatPanel.tsx`)

In the empty-state welcome view (when no messages), below the quick action buttons, add a mic circle button that switches to call mode (`setMode("call")`). Styled as a gradient circle with a `Mic` icon and label "Tap to talk".

### 5. Layout of quick actions

Change from horizontal flex-wrap to a grid of small pill buttons (3 columns on desktop, 2 on mobile). The voice circle sits centered below them.

## Files to update
- `src/components/AIChatPanel.tsx` — quick actions, voice circle, layout
- `supabase/functions/ai-chat/index.ts` — add tasks + universities/campuses context
- `supabase/functions/elevenlabs-agent-token/index.ts` — same context additions

## Safety
- All changes are additive (new queries, new prompt sections)
- No existing tables/RLS modified
- No breaking changes to existing functionality

