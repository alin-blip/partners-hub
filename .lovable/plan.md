

## Plan: Hybrid Voice Assistant — ElevenLabs Voice + Internal AI Brain

### The Idea

Instead of using ElevenLabs as the AI brain (which requires uploading knowledge separately), we use ElevenLabs **only for the voice** (text-to-speech) and keep the AI brain as your existing `ai-chat` edge function that already has access to all platform data, knowledge base, user context, and role-based information.

### How It Works

```text
User speaks → Browser Speech Recognition (STT) → text
                                                    ↓
                                          ai-chat edge function
                                          (existing, knows everything)
                                                    ↓
                                          AI response text
                                                    ↓
                                    ElevenLabs TTS edge function → audio
                                                    ↓
                                          User hears the answer
```

### Why This Is Better

- **No duplicate knowledge base** — the ai-chat function already has all platform data, courses, admission requirements, and user-specific context
- **Role-aware** — the AI knows if you're an agent, admin, or owner and adapts
- **Real-time data** — can reference actual student records, enrollment statuses, commissions
- **Single source of truth** — update knowledge base once, both text and voice use it

### Technical Changes

| Step | What | Details |
|------|------|---------|
| 1 | **Add ElevenLabs API key** | You'll need to provide your ElevenLabs API key (for TTS only). The STT is free via browser. |
| 2 | **Create `elevenlabs-tts` edge function** | Takes text + voice ID, calls ElevenLabs TTS API, returns audio. Simple proxy to protect the API key. |
| 3 | **Update `AIChatPanel.tsx`** | Replace the ElevenLabs conversation agent with a hybrid mode: browser `SpeechRecognition` for listening → send to existing `ai-chat` → play response via ElevenLabs TTS. Remove `@elevenlabs/react` dependency (no longer needed). Remove `ConversationProvider` wrapper from `DashboardLayout.tsx`. |
| 4 | **Voice UI in chat panel** | Mic button starts listening. User's speech appears as text message. AI responds with text + auto-plays audio. Visual indicators for listening/speaking states. |

### What You Need To Provide

- **ElevenLabs API key** — from your ElevenLabs account (Settings → API Keys)
- **Voice preference** — which ElevenLabs voice to use (e.g., "Rachel", "Josh", or a custom/cloned voice)

### Cost Comparison

- **Browser Speech Recognition**: Free (built into Chrome, Edge, Safari)
- **ElevenLabs TTS**: ~$0.30 per 1,000 characters (depends on your plan)
- **No ElevenLabs Conversational AI costs** — we're not using their agent anymore

### Alternative: Fully Free (No ElevenLabs at all)

If you want zero cost, we can use the browser's built-in `SpeechSynthesis` API for TTS too. The voice quality is lower but it's completely free and requires no API key. We can always upgrade to ElevenLabs TTS later.

