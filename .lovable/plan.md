

# Fix: Image Generator Writing "Headline:" / "Subheadline:" Labels

## The Problem (confirmed in code)

In `supabase/functions/generate-image/index.ts`, lines 171–173, the prompt sent to the Nano Banana image model includes:

```text
TEXT TO RENDER ON THE IMAGE (copy these EXACTLY...):
Headline: Earn £2,000+ Monthly Commission
Subheadline: Recruit students for UK universities...
```

The model is doing exactly what we asked — rendering the labels `Headline:` and `Subheadline:` as visible text in the image. Same risk for `Bullet points (render these on the image):` on line 161.

## What We'll Improve (3 small, surgical fixes)

### 1. Strip the labels from the image prompt
Reframe the text block so the model sees only the content to render — never the words "Headline" / "Subheadline" / "Bullet points":

```text
TEXT TO RENDER ON THE IMAGE (these are the only words allowed in the image — render them EXACTLY, do not modify, translate, or add labels like "Headline:" or "Subheadline:"):

PRIMARY TEXT (largest, top): "<headline>"
SUPPORTING TEXT (smaller, below primary): "<subheadline>"
SHORT POINTS (small list):
  • <bullet 1>
  • <bullet 2>
```

Plus an explicit forbidden-words rule: *"Never render the words 'Headline', 'Subheadline', 'Bullet', 'Headline:', 'Subheadline:', or any colon-prefixed label."*

### 2. Add a typography/style block
Right now layout is vague. Add concrete rules so the design looks intentional:
- Primary text: bold, large, highest contrast
- Supporting text: medium weight, ~50% size of primary
- Bullets: small, tight spacing, with simple bullet marks (•)
- Minimum margin from all edges: 8%
- No text overlapping faces/objects in the background photo
- Single, harmonious font family (sans-serif)

### 3. Mirror the same fix in edit mode
The edit prompt (lines 135–146) doesn't have this bug today, but I'll add the same forbidden-words clause so edits never reintroduce labels.

## Optional bonus (only if you want)

**Quality bump on the prompt agent**: currently uses `google/gemini-2.5-flash-lite` (cheap, weakest at nuance). Switching to `google/gemini-2.5-flash` would give us better headline/subheadline copy with negligible extra cost. Default: keep flash-lite to minimize cost — say the word if you want the upgrade.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/generate-image/index.ts` | Rewrite the `TEXT TO RENDER` section (no labels), add typography rules, add forbidden-words rule to both generate + edit prompts |

## What stays the same
- All RLS, daily limits, owner bypass, storage, retries, rate-limit handling
- Prompt agent (`prompt-agent.ts`) untouched — it already produces clean `{ headline, subheadline, bullets }` JSON
- Client-side branding (logo + photo composite) untouched
- No DB migration, no schema changes, no new dependencies

## Expected result
Generated images will show only the actual marketing copy — no more "Headline:" / "Subheadline:" prefixes baked into the artwork.

