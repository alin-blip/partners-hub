

## Plan: Integrate AI Image Wizard into Social Posts Page

### What changes
Replace the current manual image upload in `SocialPostsPage.tsx` with the full AI image generation wizard from `CreateImagePage.tsx`, followed by the recipient selection and publish step.

### Flow
1. **Step 1 — Generate Image** (same as CreateImagePage wizard):
   - Preset selector (Social Post, Story, Flyer, Banner)
   - Prompt textarea
   - "Include my photo" toggle
   - Caption language selector
   - Generate button → shows generated image
   - Generate caption button on the result
   - Option to also upload a manual image as alternative

2. **Step 2 — Publish to Agents**:
   - Caption textarea (pre-filled with AI caption if generated, or manual)
   - Target selector (All agents / My team / Select individually)
   - Agent checkboxes when "Select individually"
   - Publish button

### Technical details

**File: `src/pages/shared/SocialPostsPage.tsx`** — Rewrite to combine both flows:
- Add all state from CreateImagePage (selectedPreset, prompt, includePhoto, captionLanguage, generatedUrl, remaining, captions, captionLoading)
- Add the generate image mutation (calls `generate-image` edge function)
- Add the generate caption function (calls `generate-caption` edge function)
- Keep existing: agents query, posts query, target mode, publish logic
- Modify publish: if image was AI-generated, use `generatedUrl` directly instead of uploading a file; if manually uploaded, keep current upload flow
- Keep the "Published Posts" section at the bottom with delete functionality
- Add a tab or toggle to switch between "AI Generate" and "Upload manually" for the image source

**No backend changes needed** — reuses existing `generate-image` and `generate-caption` edge functions, same `social_posts` and `social_post_recipients` tables.

