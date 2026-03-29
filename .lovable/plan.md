

## Plan: Auto-generate script with knowledge base context

### What changes

When generating content on Social Posts page, **always** auto-generate a teleprompter script alongside the images — without needing to select "Script" as a preset. The script generation will be enriched with knowledge base data (courses, universities, brand DNA).

### Changes

**1. Edge Function: `supabase/functions/generate-caption/index.ts`**
- Fetch `ai_knowledge_base` entries (courses, admissions, general info) from Supabase
- Fetch `courses` with `universities` for real course/university names
- Inject this context into the system prompt for both captions and scripts
- The AI will reference real courses, deadlines, campuses, and brand voice when writing scripts and captions

**2. Frontend: `src/pages/shared/SocialPostsPage.tsx`**
- After generating images, **always** auto-generate a script (call `generate-caption` with `preset: "script"`) regardless of whether "Script" preset was selected
- Always auto-generate a caption too (same call with `preset: "social_post"`)
- Display the script result alongside the generated images automatically
- Remove "Script" from the selectable presets (since it's always included)
- Pre-fill the caption field with the AI-generated caption

### How knowledge base enrichment works in the edge function

```text
System prompt structure:
├── Brand identity (from brand_settings.brand_prompt)
├── Knowledge base context (from ai_knowledge_base - grouped by category)
│   ├── Courses & admissions info
│   ├── University details
│   └── General knowledge
├── Available courses list (from courses + universities tables)
└── Generation rules (CTA, language, format)
```

The AI will use real data like "BSc Business Management at University of Suffolk" or "January 2026 intake" instead of generic placeholders.

### No database changes needed
Reuses existing tables: `ai_knowledge_base`, `courses`, `universities`, `brand_settings`.

