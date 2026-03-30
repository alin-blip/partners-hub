

## Plan: Premium Branded Profile Picture with AI-Generated Overlay

### Problem
The current canvas-drawn frame looks programmatic — flat gradient, basic pill shapes, emoji stars. It doesn't look like a professionally designed asset.

### Approach
Use Nano Banana (gemini-3.1-flash-image-preview) to generate a premium branded circular frame overlay, then composite it with the user's photo on canvas. The AI creates the artistic elements (gradient ring, logo placement, badge design) at a much higher quality than canvas drawing can achieve.

### How It Works

```text
┌─────────────────────────────┐
│  1. User uploads photo      │
│  2. Canvas crops to circle  │
│  3. Call AI to generate     │
│     premium frame overlay   │
│     (with EduForYou brand)  │
│  4. Composite photo + frame │
│  5. Cache frame in storage  │
│     for instant reuse       │
└─────────────────────────────┘
```

### File Changes

**1. New edge function: `supabase/functions/generate-profile-frame/index.ts`**
- Accepts user auth + optional style variant
- Calls Nano Banana with a detailed prompt for a 1080x1080 circular frame overlay:
  - Premium gradient ring (orange-to-gold with subtle glow/shine effects)
  - EduForYou logo + text rendered beautifully at the top
  - "CERTIFIED AGENT" badge at the bottom with premium metallic/glass styling
  - Transparent center (circular cutout) for the photo
  - Subtle decorative elements (light particles, soft shadows, depth)
- Sends the actual `eduforyou-icon.jpg` as a reference image so AI reproduces the real logo
- Uploads result to `brand-assets` bucket as `profile-frame-v1.png`
- Returns the public URL
- Includes caching: if frame already exists in storage, returns it immediately without calling AI

**2. Updated `src/components/BrandedProfilePicture.tsx`**
- Remove all manual canvas drawing of ring, pill, banner, text
- New flow:
  1. Load user photo → crop to circle on canvas
  2. Fetch cached frame from storage (or trigger generation if not exists)
  3. Draw frame overlay on top of the circular photo
  4. Result: photo composited under the AI-generated premium frame
- Add a "Regenerate Frame" button for owners to refresh the cached frame
- Loading state while frame generates (first time only, ~10s)
- Keep download functionality identical

### AI Prompt Strategy
The prompt will be highly specific about the design language:
- "Create a 1080x1080 circular profile picture frame overlay with transparent center"
- "Premium glass-morphism ring with orange-to-amber gradient, subtle inner glow"
- "Top: EduForYou logo (use attached icon) with elegant white-on-dark pill badge"
- "Bottom: 'CERTIFIED AGENT' in a premium metallic banner with subtle gold accents"
- "High-end, luxury feel — think LinkedIn Premium or verified badge aesthetic"
- Reference image: the actual `eduforyou-icon.jpg` for accurate logo reproduction

### Why This Is Better
- AI produces organic gradients, lighting, shadows, and textures that canvas primitives cannot
- The logo is reproduced from the actual image reference, not drawn with `fillText`
- Frame is cached — generated once, reused instantly for all agents
- Looks like a professionally commissioned design asset, not code-drawn shapes

