

## Plan: Add "Generate Caption" Button to Each Image

Add a button on every generated image (both the latest result and gallery items) that calls AI to generate a social media caption in the EduForYou brand voice, using the image's original prompt and the brand DNA from `brand_settings`.

---

### 1. New Edge Function: `generate-caption`

**File:** `supabase/functions/generate-caption/index.ts`

- Accepts `{ prompt, preset }` (the original image prompt and preset type)
- Authenticates user via JWT (same pattern as `generate-image`)
- Fetches `brand_settings.brand_prompt` for the brand DNA/voice
- Calls Lovable AI (`google/gemini-3-flash-preview`) with a system prompt like:

> "You are the social media manager for EduForYou UK, an education recruitment agency. Write an engaging social media post caption for the following image. Use the brand voice described below. Include relevant hashtags. Keep it concise and compelling."

- Returns `{ caption: string }`

### 2. Update `CreateImagePage.tsx`

- Add state: `captionLoading` (map of image id/url to boolean), `captions` (map of image id/url to string)
- Add a `MessageSquare` (or `Type`) icon button next to the Download button on:
  - The **Generated Result** card
  - Each **Gallery** item
- On click: call `generate-caption` edge function with the image's prompt and preset
- Display the generated caption in a text area below the image, with a "Copy" button
- Show loading spinner while generating

### Technical Details

- No database changes needed — captions are generated on-demand, not stored
- Edge function uses the same auth pattern as `generate-image` (adminClient + token)
- Brand voice comes from `brand_settings.brand_prompt` — same table already used by image generator

