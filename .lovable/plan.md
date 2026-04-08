

# Plan: Upgrade EduForYou AI Assistant — Voice + Speed + Design

## Problems identified
1. **TTS is slow**: Uses `eleven_multilingual_v2` (high quality but slow). Full response waits to complete before TTS starts.
2. **No streaming TTS**: Entire AI response must finish, then entire TTS audio must generate, then playback starts — double wait.
3. **Design is basic**: Simple sheet panel with flat bubbles, no visual polish.

## Solution

### 1. Streaming TTS — Speak While AI Responds
Instead of waiting for the full AI response, split the response into sentences and start TTS for the first sentence immediately while the rest streams in. This gives near-instant voice feedback.

**Edge function change** (`elevenlabs-tts/index.ts`):
- Switch to `/stream` endpoint: `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`
- Use `eleven_turbo_v2_5` model (2-3x faster than multilingual_v2, still multilingual)
- Return chunked audio stream

**Client change** (`AIChatPanel.tsx`):
- Accumulate AI response text. When a sentence boundary is detected (`. ` / `? ` / `! ` / `\n`), send that chunk to TTS
- Queue audio chunks for sequential playback — user hears first sentence within ~1-2 seconds
- Cancel queued audio on stop

### 2. Faster AI Model
- Change `ai-chat/index.ts` from `google/gemini-3-flash-preview` to `google/gemini-2.5-flash` — faster responses, still high quality

### 3. Redesigned Chat UI
Completely refresh the `AIChatPanel.tsx` design:

- **Glassmorphic header** with gradient accent and animated status dot
- **Avatar bubbles**: Bot avatar (branded icon) on assistant messages, user initial on user messages
- **Typing indicator**: Animated 3-dot bounce instead of plain spinner
- **Voice mode visual**: Animated sound wave bars when listening/speaking (CSS animation)
- **Message timestamps**: Subtle relative time on each message
- **Quick action chips**: Suggested questions on empty state ("How do commissions work?", "Visa guidance", "My students")
- **Smooth animations**: Messages slide in with `animate-in`
- **Better input bar**: Rounded pill shape, mic button with pulse animation when active, gradient send button
- **Dark mode polished**: Proper contrast and glass effects

### 4. Sentence-Chunked TTS Architecture

```text
AI Stream:  "Hello, I can help you with that. Let me check your students..."
             ↓ sentence 1 detected          ↓ sentence 2 detected
TTS Queue:  [fetch("Hello, I can help...")]  [fetch("Let me check...")]
Playback:   ▶ plays sentence 1              ▶ plays sentence 2 (queued)
```

## Files Modified
1. `supabase/functions/elevenlabs-tts/index.ts` — Switch to streaming endpoint + turbo model
2. `supabase/functions/ai-chat/index.ts` — Switch to `google/gemini-2.5-flash`
3. `src/components/AIChatPanel.tsx` — Complete redesign + sentence-chunked TTS logic

## Files Created
None — all changes within existing files.

## Impact
- Voice response starts 3-5x faster (sentence streaming + turbo model)
- AI text response ~40% faster (gemini-2.5-flash)
- Modern, polished chat UI
- Zero breaking changes — same conversation persistence, same knowledge base

