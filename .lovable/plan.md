

# Image Generator: 3 Improvements

## 1. Skip Logo Overlay When Profile Photo Is Included
The user's branded profile picture already contains the EduForYou logo (gold frame with logo). Adding a second logo overlay is redundant.

**Change**: In `CreateImagePage.tsx` and `SocialPostsPage.tsx`, when `includePhoto` is true, skip the logo overlay step — only composite the profile photo. When `includePhoto` is false, keep the logo overlay as-is.

**File**: `src/lib/image-composite.ts` — update `compositeFullBranding` to accept a flag and conditionally skip logo.
**Files**: `src/pages/shared/CreateImagePage.tsx` and `SocialPostsPage.tsx` — pass the flag.

## 2. No Random People in Image When Photo Is Included
The prompt already says "DO NOT generate any people, faces, or human figures" (line 144 of generate-image/index.ts). This rule should remain but be reinforced specifically when `includePhoto` is true — emphasize that the agent's real photo will be added and no other humans should appear. When `includePhoto` is false and it's not a group context, the same rule applies.

**File**: `supabase/functions/generate-image/index.ts` — strengthen the "no people" instruction when includePhoto is true.
**File**: `supabase/functions/generate-image/prompt-agent.ts` — reinforce in the visual description guidelines.

## 3. Chat-Style Interface for Image Instructions
Replace the single textarea + generate button with a conversational chat interface (like ChatGPT). Users type instructions, see the generated image inline, and can follow up with refinements ("make it more blue", "change the headline", "add more text"). Each message in the conversation feeds back into the prompt agent.

**Implementation**:
- Transform `CreateImagePage.tsx` into a chat-style UI with message bubbles
- User messages appear on the right, AI responses (image + generated text) on the left
- "Send" button replaces "Generate" — first message generates, follow-ups refine
- The edge function receives conversation history to understand iterative requests
- Use the `--edit-image` capability of Gemini to refine existing images based on follow-up instructions
- Keep preset/course/language selectors as a collapsible settings panel above the chat

### Files to modify

| File | Change |
|------|--------|
| `src/lib/image-composite.ts` | `compositeFullBranding` accepts `skipLogo` param |
| `src/pages/shared/CreateImagePage.tsx` | Chat UI + pass `skipLogo` when includePhoto |
| `src/pages/shared/SocialPostsPage.tsx` | Pass `skipLogo` when includePhoto |
| `supabase/functions/generate-image/index.ts` | Accept conversation history, support edit mode, strengthen no-people rule |
| `supabase/functions/generate-image/prompt-agent.ts` | Accept conversation context for iterative refinement |

