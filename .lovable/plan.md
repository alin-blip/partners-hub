

# Fix: Edit Mode Fails + Logo/People Still Appearing

## Root Causes

### 1. Edit mode sends blob URL (causes "AI generation failed")
`getLastImageUrl()` returns the **client-side blob URL** (from canvas compositing), not the Supabase public URL. The AI API cannot fetch `blob:https://...` URLs. The edge function passes this unfetchable URL to Gemini, which fails.

**Fix**: Store the raw Supabase URL (`result.url`) in the ChatMessage alongside the display URL. Send the raw URL for edits.

### 2. Logo still appearing in generated images
The prompt-agent's visual description guidelines may still produce layout notes that reference reserved corners, which the image model interprets as "draw something there."

**Fix**: Add explicit negative instruction: "Do NOT render any text that reads 'LOGO'" to the image generation prompt.

## Changes

### `src/pages/shared/CreateImagePage.tsx`
- Add `rawImageUrl?: string` field to `ChatMessage` type to store the original Supabase URL
- When saving the assistant message (line ~270), store `result.url` as `rawImageUrl`
- Change `getLastImageUrl()` to return `rawImageUrl` instead of the composited blob URL
- This ensures edit requests send a fetchable HTTPS URL to the edge function

### `supabase/functions/generate-image/index.ts`
- Add "Do NOT render any text that reads 'LOGO' or placeholder text" to both the generation and edit prompts
- The "no people" rule is already first — keep it

### Files

| File | Change |
|------|--------|
| `src/pages/shared/CreateImagePage.tsx` | Store raw Supabase URL separately, use it for edits |
| `supabase/functions/generate-image/index.ts` | Add anti-"LOGO text" instruction to prompts |

