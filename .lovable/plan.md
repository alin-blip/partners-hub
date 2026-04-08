

## Goal
When course details are updated (e.g., removing OPT test requirements), the AI assistant should immediately reflect those changes — without needing to manually update the knowledge base.

## Problem
The AI chat function only reads from `ai_knowledge_base` (static, manually-maintained entries). It never queries the `course_details` table, which holds the live, up-to-date course requirements. So when you edit a course's admission test info, the AI keeps repeating the old information from the knowledge base.

## Solution
Add a live `course_details` query to the AI chat edge function, so it builds its context from **both** the static knowledge base **and** the real-time course requirements table.

## Implementation

### 1. Update `supabase/functions/ai-chat/index.ts`
After the existing knowledge base fetch, add a new section that:
- Queries `course_details` joined with `courses` and `universities` to get course name, university name, and all requirement fields
- Formats this into a `[Live Course Requirements]` section in the system prompt
- Groups entries by university for readability
- Each course entry shows: admission_test_info, interview_info, entry_requirements, documents_required, additional_info (only non-null fields)

### 2. Update `supabase/functions/elevenlabs-agent-token/index.ts`
Apply the same live course data injection so Call Mode also has up-to-date course information.

### 3. System prompt adjustment
Add a note in the system prompt instructing the AI:
- "The [Live Course Requirements] section contains the most up-to-date course data. If it conflicts with the knowledge base, always prefer the live data."

This ensures that even if old knowledge base entries still mention OPT for Computing, the AI will prioritize the live data showing no OPT.

## Result
- Any change to course requirements in the platform is immediately available to the AI
- No manual knowledge base updates needed for course-level changes
- Both Text Mode and Call Mode will reflect the latest data

## Files to update
- `supabase/functions/ai-chat/index.ts`
- `supabase/functions/elevenlabs-agent-token/index.ts`

