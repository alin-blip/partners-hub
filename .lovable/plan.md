

# Fix: Image Generation Quality Issues

## Problems Identified

1. **"LOGO" text drawn by AI** — The prompt says "logo will be added afterward" and "keep bottom-right corner clear (logo area)" — the AI image model interprets this literally and renders the word "LOGO" as a placeholder. Fix: remove ALL mentions of "logo" from the image generation prompt.

2. **Logo overlay still applied when includePhoto is true** — Line 260 in `CreateImagePage.tsx` correctly passes `skipLogo = !!includePhoto`, but the prompt still tells the AI to "reserve space" for a logo, causing confusion.

3. **AI generates people despite "no people" rule** — The instruction is buried in the prompt. Need to make it the FIRST and most prominent rule, not a sub-bullet.

## Changes

### 1. `supabase/functions/generate-image/index.ts` — Fix image prompt
- Remove ALL references to "logo", "watermark", "branding" from the image generation prompt — the AI draws what it reads
- When `includePhoto` is true: add "ABSOLUTELY NO human figures, people, faces, or silhouettes" as the FIRST line of the prompt (not buried in layout notes)
- When `includePhoto` is false: same "no people" rule but less aggressive
- Remove "keep bottom-right corner clear (logo area)" — just say nothing about that corner
- Remove "logo will be added afterward" completely

### 2. `supabase/functions/generate-image/prompt-agent.ts` — Fix visual description guidelines  
- Remove references to "logo overlay" from the visual_description instructions
- When `includePhoto` is true, the `layout_notes` should NOT mention logo/branding — just focus on text placement
- Strengthen "no people" in visual_description guidance

### 3. `src/pages/shared/CreateImagePage.tsx` — No changes needed
The `skipLogo` flag is already correctly passed. The client-side compositing logic is fine.

### Files to modify

| File | Change |
|------|--------|
| `supabase/functions/generate-image/index.ts` | Remove "logo"/"branding" mentions from AI prompt; strengthen no-people as first rule |
| `supabase/functions/generate-image/prompt-agent.ts` | Remove logo references from layout_notes/visual_description guidance |

