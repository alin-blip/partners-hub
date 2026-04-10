

# Fix AI Image Generation — Photo, Logo, and University Name Rules

## Problems identified

1. **"Include my photo" uses a different face**: The edge function fetches `avatar_url` and passes it as base64, but the AI model sometimes ignores the attached photo and generates a different person. The prompt instructions need to be much more forceful.

2. **Logo is wrong**: Currently fetches `eduforyou-icon.jpg` from storage. The user wants the full gold logo (graduation cap + pen + "EduForYou" text). The uploaded logo needs to replace the current icon in storage, and the prompt needs stronger instructions to reproduce it exactly.

3. **University names still appear**: The prompt already says "NEVER use university names" but the SELECTED COURSE CONTEXT section includes the university name indirectly. The rules need to be reinforced and the course context must explicitly exclude university references.

## Changes

### 1. Upload correct logo to storage

Replace `brand-assets/eduforyou-icon.jpg` with the new logo image (`03_logo_with_text_800x300.png`) as `brand-assets/eduforyou-logo.png`. Update the edge function to reference the new file.

### 2. Strengthen avatar photo instructions (generate-image/index.ts)

Current prompt says "embed THIS EXACT person's face" but AI models need more aggressive instructions:
- Add "DO NOT GENERATE A NEW FACE — the photo is attached as the second image input"
- Add "The person in the photo has specific features — reproduce them exactly, do not approximate"
- Label the image inputs explicitly: "Image 1 = brand logo, Image 2 = agent photo"

### 3. Strengthen logo instructions (generate-image/index.ts)

- Change prompt to reference "the FIRST attached image is the complete EduForYou logo with the gold graduation cap, pen icon, and the text 'EduForYou'"
- Add "Place this EXACT logo as-is in the corner — do not recreate, redraw, or modify it"

### 4. Strengthen university name prohibition (generate-image/index.ts)

- In the SELECTED COURSE CONTEXT section, explicitly note "DO NOT mention the university name"
- Move the "no university names" rule to the very top of the prompt (primacy effect)
- Add it again at the very end (recency effect)
- Make it a separate, prominent section with caps and emphasis

### 5. Same fixes in generate-caption/index.ts

Ensure caption generation also has the strengthened university name rule.

## Files modified

| File | Change |
|------|--------|
| `supabase/functions/generate-image/index.ts` | Stronger photo/logo/university prompts, new logo path |
| `supabase/functions/generate-caption/index.ts` | Reinforce university name rule |
| Brand storage | Upload new logo to `brand-assets/eduforyou-logo.png` |

## Technical detail

```typescript
// Stronger image labeling in the prompt
fullPrompt += `\n\nATTACHED IMAGES (in order):
- IMAGE 1: The official EduForYou logo (gold graduation cap + pen icon with "EduForYou" text). 
  Place this EXACT image as-is in the bottom-right or top-right corner. DO NOT recreate or redraw it.
- IMAGE 2 (if present): The real photo of the agent. 
  Use THIS EXACT face — do NOT generate, invent, or approximate a different person.`;

// University name rule at TOP of prompt
fullPrompt = `ABSOLUTE RULE #1: NEVER include any university name in the image. 
Only use the course name or field of study. This is non-negotiable.\n\n` + fullPrompt;
```

