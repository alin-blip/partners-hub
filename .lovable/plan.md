

## Add "Use Course Guidelines" Toggle for Personal Statement Generation

### What
Add a checkbox/switch on the AI Documents tab so the agent can choose whether to apply the stored course-specific personal statement guidelines when generating. Some universities don't have or need specific guidelines.

### How

**1. `src/components/student-detail/StudentAIDocumentsTab.tsx`**
- Add a `useGuidelines` boolean state (default: `true`)
- Show a Switch next to the Personal Statement card: "Use course guidelines"
- Pass `use_guidelines: useGuidelines` in the request body to the edge function

**2. `supabase/functions/generate-student-document/index.ts`**
- Read `use_guidelines` from the request body (default `true`)
- Only fetch and inject `course_details` into the prompt when `use_guidelines` is `true`
- When `false`, generate a generic personal statement based solely on the student profile

### Files to modify
| File | Change |
|------|--------|
| `StudentAIDocumentsTab.tsx` | Add Switch + pass flag |
| `generate-student-document/index.ts` | Conditionally skip course guidelines |

