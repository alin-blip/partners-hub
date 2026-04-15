

# Fix: ChatGPT-Style Image Generation Flow

## Current Problems
1. **Two sequential AI API calls** (prompt agent + image gen) cause rate limits (429) — both hit the same gateway within seconds
2. **Edit mode sends full image URL** back to AI which is slow and unreliable
3. **No "save or modify?" flow** — AI just dumps the image without asking
4. **Cooldown/error messages feel broken**, not conversational

## Solution: Streamlined Single-Call Flow with Conversational UX

### Architecture Change
Instead of 2 API calls per generation, combine them:
- **New images**: Keep the 2-step flow BUT increase the delay between calls to 5 seconds and use `google/gemini-2.5-flash-lite` for Step 1 (already done) — the real fix is better error handling and user feedback
- **Edits**: Use the stored Supabase image URL (public URL from storage, not base64) for edits — much lighter

### UX Changes (CreateImagePage.tsx)
1. After generating an image, the assistant message says: **"Here's your image! Would you like to save it, or tell me what to change?"**
2. Add **"Save" and "Modify" quick-action buttons** below each generated image
3. "Save" confirms and shows share buttons
4. "Modify" focuses the input and prompts for changes
5. Better loading states: show a progress indicator with steps ("Writing copy..." → "Generating image..." → "Applying branding...")
6. On rate limit errors, show a friendlier message with auto-retry countdown

### Edge Function Changes (index.ts)
1. Increase inter-step delay from 3s to 5s
2. For edit mode: use the Supabase public URL (already stored) instead of passing large image data
3. Better error differentiation — return `retryAfter` seconds so the client can auto-retry

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/shared/CreateImagePage.tsx` | Add Save/Modify buttons, progress steps, auto-retry on rate limit, conversational assistant messages |
| `supabase/functions/generate-image/index.ts` | Increase inter-step delay to 5s, improve error response with retryAfter |

