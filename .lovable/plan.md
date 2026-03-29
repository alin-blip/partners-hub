

## Plan: Always Include EduForYou Logo in Generated Images

### Problem
Currently the edge function only adds a text instruction "Include a professional company logo placeholder area" — it doesn't pass the actual logo to the AI model. The AI invents a random logo each time.

### Solution
Upload the EduForYou logo to Supabase storage, then pass it as an **image input** to the AI model alongside the text prompt. The Gemini image generation model supports multimodal input (text + image reference), so we can instruct it: "Include this exact logo in the design."

Both Social Posts and Create Image use the **same edge function** (`generate-image`), so fixing it once covers both pages.

### Changes

**Step 1: Upload logo to storage**
- Copy `logo_side_bigtext_src.png` to `public/images/eduforyou-logo.png` in the project
- Upload it to the `generated-images` Supabase storage bucket under a `_brand/logo.png` path (or use the existing `brand_settings.logo_url` if already set)

**Step 2: Update `supabase/functions/generate-image/index.ts`**
- Instead of just adding text about a logo, fetch the actual logo image (from `brand_settings.logo_url` or the known storage path)
- Convert it to base64
- Pass it as a multimodal message to the AI model:
  ```typescript
  messages: [{
    role: "user",
    content: [
      { type: "text", text: fullPrompt + "\n\nIncorporate this exact logo into the design, placing it in a visible corner:" },
      { type: "image_url", image_url: { url: logoBase64DataUrl } }
    ]
  }]
  ```
- If no logo is available, fall back to text-only prompt (current behavior)

### Files changed
- `public/images/eduforyou-logo.png` (new — copy uploaded logo)
- `supabase/functions/generate-image/index.ts` (fetch logo, pass as image input to AI)

