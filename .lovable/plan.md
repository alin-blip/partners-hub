

# Plan: Continuous Voice Conversation Mode

## What the user wants
A "conversation mode" button where the mic stays active continuously — user speaks, AI responds with voice, then mic auto-resumes for the next question. No need to press mic each time. Text mode stays text-only.

## How it works today
1. User presses mic → Scribe listens → commits transcript → sends to AI → TTS plays → **stops**
2. User must press mic again for next question

## Solution: Auto-loop voice mode

### New flow
1. User clicks a **"Conversație Vocală"** (phone icon) button to enter voice mode
2. Mic starts listening automatically
3. User speaks → transcript committed → sent to AI
4. AI responds with streaming TTS
5. **When TTS finishes playing → mic automatically restarts** (loop)
6. User clicks "Oprește conversația" to exit voice mode
7. If user types text instead → AI responds in text only, no auto-mic restart

### UI changes
- Add a **voice conversation toggle button** in the header (next to volume/history buttons) — a Phone or Headphones icon
- When voice mode is active: header shows a pulsing indicator, input bar transforms to show "Conversație vocală activă..." with a large stop button
- The existing mic button stays for one-shot voice input in text mode

### Technical changes in `AIChatPanel.tsx`

**New state:**
- `voiceMode: boolean` — continuous conversation mode active

**Modified logic:**
- `playNextInQueue()`: when queue is empty AND `voiceMode` is true → call `startListeningAgain()` after a short delay (500ms)
- `startListeningAgain()`: fetches new scribe token and reconnects mic
- `onCommittedTranscript`: in voice mode, auto-submits (already does this)
- `send()`: if triggered from voice mode, keeps `voiceMode = true` so the loop continues
- `send()`: if triggered from typing (keyboard), does NOT restart mic — pure text mode
- Exiting voice mode: disconnects scribe, stops audio, resets state

**Edge case handling:**
- If user types while in voice mode → exit voice mode, send as text
- If AI is still generating when user speaks → stop current audio, send new message
- Token refresh: get new scribe token each time mic restarts (tokens are single-use)

## Files modified
1. `src/components/AIChatPanel.tsx` — add `voiceMode` state, auto-restart logic, UI for voice conversation mode

## Files created
None

## No backend changes needed
Same edge functions (ai-chat, elevenlabs-tts, elevenlabs-scribe-token) — no modifications required.

