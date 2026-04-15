

# Audit: Image Generation Quality Issues

## Problems Found

### 1. Romanian Text is Broken
The screenshot shows "ANTUL TĂU, ALIN" — clearly truncated/corrupted text. **Root cause**: AI image generation models (Gemini Flash Image) are notoriously bad at rendering non-English text, especially with diacritics (ă, ț, î, ș). The model tries to "draw" Romanian characters and frequently misspells, truncates, or garbles them.

### 2. Prompt Overload (~2000 words)
The current prompt contains **18 separate instruction blocks** crammed into one message. The model gets confused trying to follow all rules simultaneously:
- Zero university name rules (repeated 3 times)
- Mandatory text structure
- Logo placement instructions
- Profile photo space reservation
- Brand guidelines
- Course context
- Language rules
- Content restrictions

### 3. No Prompt Refinement Layer
The user's raw input (e.g., "fă un post despre sănătate") goes directly to image generation without any intelligent preprocessing. There's no agent that:
- Understands the user's intent
- Writes optimized, correct Romanian marketing text
- Creates a structured prompt for the image model

### 4. Logo "Pixel-Perfect Copy" is Impossible
The prompt asks the AI to "copy pixel-perfect from the attached image" — image generation models cannot do this. They always redraw/reinterpret logos.

### 5. Profile Photo Composition is Fragile
The client-side Canvas composite works but the AI doesn't always leave the right amount of clear space in the bottom-left corner.

---

## Solution: Two-Step AI Agent Architecture

Instead of one massive prompt → image, split into **two sequential calls**:

```text
Step 1: PROMPT AGENT (text model — Gemini Flash, fast & cheap)
   User input + course context + brand rules
   → Generates: exact headline, subheadline, bullet points in perfect Romanian
   → Generates: visual description (colors, layout, mood)
   → Returns structured JSON

Step 2: IMAGE GENERATOR (image model — Gemini Flash Image)
   Receives ONLY: visual description + exact text to render
   Much simpler prompt = much better results
```

### Step 1: Smart Prompt Agent
- Uses `google/gemini-3-flash-preview` (text-only, fast)
- Receives: user's creative brief, language, course data, brand rules
- Returns structured JSON:
  ```json
  {
    "headline": "Transformă-ți Viitorul",
    "subheadline": "Licență în Sănătate — Birmingham, UK",
    "bullets": ["Studiu flexibil", "Finanțare disponibilă"],
    "visual_description": "Modern gradient background, navy to gold...",
    "layout_notes": "Clean bottom-left corner for profile photo"
  }
  ```
- This model is excellent at Romanian and can spell-check itself

### Step 2: Simplified Image Generation
- Receives the structured output from Step 1
- Much shorter, focused prompt: "Create this exact layout with this exact text"
- No more 2000-word instruction blocks
- Logo overlay done client-side (Canvas) instead of asking AI to copy it

### Step 3: Logo + Profile Photo — All Client-Side
- **Logo**: Overlay the real logo PNG via Canvas API (pixel-perfect guaranteed)
- **Profile photo**: Already done client-side, keep as-is but improve positioning
- The AI generates a **clean background design only** — all branding elements are composited afterward

### Files to modify

| File | Change |
|------|--------|
| `supabase/functions/generate-image/index.ts` | Split into 2 AI calls: text agent → image generator. Remove logo attachment. Simplify image prompt drastically. |
| `src/lib/image-composite.ts` | Add logo overlay compositing on top of profile photo compositing |
| `src/pages/shared/CreateImagePage.tsx` | Update to handle new response format (structured text + image). Show generated text for user review. |
| `src/pages/shared/SocialPostsPage.tsx` | Same client-side changes |

### Key benefits
- **Perfect Romanian**: Text model writes flawless Romanian, then image model just renders it
- **Consistent quality**: Structured prompts = predictable layouts
- **Real logo**: Canvas overlay = pixel-perfect branding every time
- **Faster**: Text agent call is ~2s, image call is simpler/faster
- **Debuggable**: Can see the intermediate text output and fix issues

