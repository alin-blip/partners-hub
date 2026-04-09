

# Social Posts & Image Generation — Full Audit

## Issues Found

### 1. Language not passed to image generation
**Bug**: `captionLanguage` is sent to `generate-caption` but NOT to `generate-image`. The image edge function has no `language` parameter at all — so even if you select Romanian, the image text is always generated in English. The prompt only says "if the brief is in Romanian, create text in that same language" which is unreliable.

**Fix**: Pass `language` from frontend to `generate-image`. Add explicit language instruction to the image prompt: "All text on the image MUST be written in ${language}."

### 2. "Include my photo" doesn't embed actual photo
**Bug**: When `includePhoto` is true, the edge function only adds a text instruction: "Include a professional headshot placeholder..." — it does NOT send the actual `avatar_url` as an image input. The AI model invents a generic person instead of using the real profile photo.

**Fix**: When `includePhoto && profile.avatar_url`, fetch the avatar image, convert to base64, and pass it as a second image input to the AI model alongside the icon, with explicit instructions to embed THIS exact photo.

### 3. Daily limit mismatch: Backend=20, Frontend says "/5"
**Bug**: Backend `DAILY_LIMIT = 20` but both `CreateImagePage.tsx` and `SocialPostsPage.tsx` display `{remaining}/5`. The plan says 5 per day with no rollover.

**Fix**: Change backend `DAILY_LIMIT` to 5. Frontend display is already correct. No rollover is already enforced (counts from midnight in user's timezone).

### 4. Caption model should be upgraded
Currently `generate-caption` uses `google/gemini-3-flash-preview`. For better language adherence and quality, upgrade to `google/gemini-2.5-pro`.

### 5. Image model is already good but prompt needs strengthening
Currently uses `google/gemini-3.1-flash-image-preview` which is correct for image gen. But the language and photo instructions need fixing (items 1 & 2).

### 6. Language selector position on SocialPostsPage
The language selector only appears in Step 1 but it's labeled just "Language" — it controls caption, script AND should control image text. Needs to be clearer.

## Implementation Plan

### File 1: `supabase/functions/generate-image/index.ts`
- Change `DAILY_LIMIT` from 20 to 5
- Accept `language` parameter from request body
- Add language instruction to prompt: "ALL text rendered on the image MUST be in ${language}. Do NOT use English unless the language is English."
- When `includePhoto && profile.avatar_url`: fetch avatar image as base64, add it as a second `image_url` in the multimodal message array with instruction "Embed THIS EXACT person's face/photo in the design — do NOT generate a different person"

### File 2: `supabase/functions/generate-caption/index.ts`
- Upgrade model from `google/gemini-3-flash-preview` to `google/gemini-2.5-pro` for better language adherence
- Add stronger language enforcement: repeat the language instruction in the user message too, not just system prompt

### File 3: `src/pages/shared/SocialPostsPage.tsx`
- Pass `language: captionLanguage` in the `generate-image` fetch body (line 228-233)
- Rename label from "Language:" to "Content Language:" for clarity

### File 4: `src/pages/shared/CreateImagePage.tsx`
- Pass `language: captionLanguage` in the `generate-image` fetch body (line 140)

### Deploy
- Redeploy both edge functions: `generate-image` and `generate-caption`

## Summary of Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Romanian selected, English generated | `language` not sent to image function | Pass language + add prompt rule |
| "Include photo" shows generic person | Only text hint, no actual image | Fetch avatar, send as base64 input |
| Daily limit says /5 but allows 20 | Backend DAILY_LIMIT=20 | Change to 5 |
| Captions sometimes ignore language | Weaker model + single instruction | Upgrade model + reinforce in user msg |

