

## Plan: Upgrade STT to ElevenLabs Scribe v2 Realtime

### Current vs Proposed

| Aspect | Current (Browser STT) | Proposed (ElevenLabs Scribe v2) |
|--------|----------------------|-------------------------------|
| Accuracy | Basic, inconsistent for Romanian | Professional-grade, 99+ languages |
| Partial transcripts | Yes (basic) | Yes (high quality, low latency) |
| Noise handling | None | echoCancellation + noiseSuppression |
| VAD (Voice Activity Detection) | None — stops after silence | Built-in, auto-commits on pause |
| Browser support | Chrome/Edge only | All browsers (WebSocket-based) |
| Cost | Free | Uses ElevenLabs quota (already have API key) |

### Technical Changes

| Step | What |
|------|------|
| 1 | **Create `elevenlabs-scribe-token` edge function** — generates single-use tokens (15min expiry) so the API key stays server-side |
| 2 | **Install `@elevenlabs/react`** — provides the `useScribe` hook for WebSocket-based realtime transcription |
| 3 | **Update `AIChatPanel.tsx`** — replace browser `SpeechRecognition` with `useScribe` hook. Use `commitStrategy: "vad"` for automatic speech segmentation. Show partial transcript live in input field, auto-send on committed transcript |

### Flow After Upgrade

```text
User clicks mic → scribe.connect(token, microphone)
                → partial transcripts appear live in input
                → VAD detects pause → committed transcript
                → auto-sends to ai-chat → response streams
                → ElevenLabs TTS plays audio response
```

### What Stays the Same

- The AI brain (`ai-chat` edge function) — unchanged
- TTS output (`elevenlabs-tts` edge function) — unchanged
- Chat history, conversation management — unchanged
- Text input still works normally alongside voice

