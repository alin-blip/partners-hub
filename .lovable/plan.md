

## Plan: Fix ElevenLabs Voice in AI Chat Panel

### Problem Analysis

The backend is working — both `elevenlabs-tts` and `elevenlabs-scribe-token` edge functions return 200 successfully. The `@elevenlabs/react` package is installed. The issue is likely on the client side:

1. **Browser autoplay policy**: `audio.play()` can be blocked by browsers if there hasn't been a recent user gesture. The TTS call happens inside the `onDone` callback of `streamChat`, which is async and far from the original user click — browsers may reject it silently.

2. **Error swallowed silently**: The `playTTS` function catches errors and only logs to console — no user-facing feedback when TTS fails.

3. **Markdown stripping**: The raw AI response with markdown (`**bold**`, `# headers`, `- lists`, etc.) is sent directly to TTS, making the voice read out markdown syntax characters.

### Changes

| File | Change |
|------|--------|
| `src/components/AIChatPanel.tsx` | 1. Strip markdown from text before sending to TTS (remove `#`, `**`, `*`, `` ` ``, `[]()`, etc.) |
| | 2. Add better error handling with user-visible toast when TTS fails |
| | 3. Pre-create an `AudioContext` on user interaction (send button click) to unlock browser audio, ensuring `audio.play()` works in the async callback |
| | 4. Add a fallback: if ElevenLabs TTS fails, show a toast "Voice unavailable" instead of silent failure |

### Technical Detail

The core fix is ensuring the browser's autoplay policy is satisfied. When the user clicks "Send", we'll call `audioContext.resume()` (or create a short silent audio interaction) to "unlock" audio playback. This way, when the async TTS response arrives later, `audio.play()` will be permitted.

Additionally, a `stripMarkdown` utility will clean the AI response text before passing it to the TTS endpoint, removing headers, bold/italic markers, code blocks, links, and bullet points for natural speech.

