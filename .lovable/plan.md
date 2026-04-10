

# Enforce EduForYou Brand Text Style in AI Image Generation

## What's changing

### 1. Strict text structure rules in image generation prompt
The AI currently generates images with too much or unstructured text. We'll add explicit rules enforcing the EduForYou brand style:
- **1 Headline** (short, impactful)
- **1 Subheadline** (supporting context)
- **Maximum 5 bullet points** (concise, scannable)
- Emphasis on visual clarity — the image must be easily understood at a glance
- No walls of text, no paragraphs, no long sentences

### 2. Same rules in caption generation
Ensure generated captions also follow a clean, structured format.

### 3. Visibility — already correct
- Each user's gallery in "Create Image" already shows only their own images (`user_id` filter)
- Only Owner and Admin have access to "Social Posts" (publish to agents)
- Agents see only the feed (`AgentSocialFeedPage`) — no changes needed here

## Files modified

| File | Change |
|------|--------|
| `supabase/functions/generate-image/index.ts` | Add text structure rules to prompt |
| `supabase/functions/generate-caption/index.ts` | Add structure rules to caption prompt |

## Technical detail

Added to the prompt in `generate-image/index.ts`:

```text
=== MANDATORY TEXT STRUCTURE (EduForYou Brand Style) ===
The image must be clean, visually clear, and instantly understandable.
Text on the image MUST follow this EXACT structure — no more, no less:
1. ONE headline (max 8 words) — bold, attention-grabbing
2. ONE subheadline (max 15 words) — supporting context
3. OPTIONAL: Up to 5 short bullet points (max 6 words each)
- DO NOT write paragraphs or long sentences on the image
- DO NOT overcrowd the image with text — whitespace is essential
- The image should be 70% visual, 30% text maximum
- Text must be large, readable, and well-spaced
```

This will be placed right after the preset instructions and before the creative brief, ensuring maximum compliance.

