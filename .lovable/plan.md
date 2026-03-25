

# Plan: AI Image Generator with Brand + Agent Photos

## What We're Building

1. **Edge function `generate-image`** — Uses `google/gemini-3.1-flash-image-preview` (Nano Banana 2) for fast, high-quality image generation
2. **Page `/[role]/create-image`** — Presets (Social Media Post, Story, Flyer, Banner), prompt input, gallery of saved results
3. **Brand settings** — Owner uploads company logo + defines brand prompt in Settings; logo and style auto-injected into every generation
4. **Agent photo** — Each user can upload a profile photo (in Profile page); when generating images, they can toggle "Include my photo" so the AI composites their face into the design
5. **Photo guidelines** — Clear instructions shown on upload: accepted formats, recommended dimensions, tips for best results
6. **Daily limit** — 5 images per user per day, enforced in edge function

---

## Database Changes

### Table: `brand_settings` (single-row config)
- `id` (uuid, PK), `brand_prompt` (text), `logo_url` (text, nullable), `updated_at`
- RLS: Owner full CRUD; all authenticated SELECT

### Table: `generated_images`
- `id` (uuid, PK), `user_id` (uuid), `prompt` (text), `preset` (text), `image_path` (text), `created_at`
- RLS: Users manage own; Admin reads team; Owner reads all

### Column on `profiles`: add `avatar_url` (text, nullable)
- For storing the agent's uploaded photo URL

### Storage buckets
- `brand-assets` (public) — for logo
- `generated-images` (public) — for AI-generated images
- `avatars` (public) — for agent profile photos

---

## Profile Page: Agent Photo Upload

Add to `ProfilePage.tsx`:
- Photo upload section with preview
- **Photo guidelines displayed**: "Upload a clear headshot (JPG/PNG, min 400x400px, max 5MB). Face should be centered, well-lit, plain background recommended. This photo will be used when generating personalized marketing images."
- Upload to `avatars` bucket, save URL to `profiles.avatar_url`

---

## Settings Page: Brand Tab

Add "Brand / AI" tab in `SettingsPage.tsx`:
- **Brand Prompt** textarea — style instructions (e.g., "Use navy blue and orange, modern style, include EduForYou UK branding")
- **Logo Upload** — upload to `brand-assets` bucket, preview shown, save URL to `brand_settings.logo_url`
- Logo guidelines: "PNG with transparent background recommended, min 200x200px"

---

## Edge Function: `generate-image`

1. Authenticate user via JWT
2. Count today's images for user — if >= 5, return 429
3. Fetch `brand_settings` (brand_prompt, logo_url)
4. Fetch user's `avatar_url` from profiles (if user toggled "Include my photo")
5. Build prompt combining: preset instructions + user prompt + brand guidelines
6. Call Lovable AI with `google/gemini-3.1-flash-image-preview`, `modalities: ["image", "text"]`
   - If agent photo requested: include agent photo as image input with instruction "Place this person's photo prominently in the design"
   - If logo exists: include logo as image input with instruction "Include this logo in a corner of the design"
7. Extract base64 image, upload to `generated-images` bucket
8. Save record to `generated_images` table
9. Return public URL

### Preset definitions
- **Social Media Post**: "1080x1080 square social media post"
- **Story**: "1080x1920 vertical story"
- **Flyer**: "A5 portrait flyer"
- **Banner**: "1200x628 horizontal banner"

---

## Frontend: `/[role]/create-image`

- Preset selector (4 cards with icons)
- Prompt textarea
- Toggle: "Include my photo" (disabled if no avatar_url with tooltip "Upload your photo in Profile first")
- "Generate" button + remaining count badge (e.g., "3/5 remaining today")
- Result display with download button
- Gallery grid below: previously generated images with date/prompt info

---

## Files to create/edit

- `supabase/migrations/xxx_image_generator.sql` — brand_settings, generated_images, profiles.avatar_url, storage buckets
- `supabase/functions/generate-image/index.ts` — new edge function
- `src/pages/shared/CreateImagePage.tsx` — new page
- `src/pages/shared/ProfilePage.tsx` — add photo upload section
- `src/pages/owner/SettingsPage.tsx` — add Brand tab
- `src/App.tsx` — add routes
- `src/components/AppSidebar.tsx` — add nav link

