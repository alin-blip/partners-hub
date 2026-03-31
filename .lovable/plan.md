

## Plan: Add Voice Conversation to AI Assistant Panel

### Overview

Add a voice button to the EduForYou AI Assistant chat panel that enables real-time voice conversation using ElevenLabs Conversational AI, the same technology already used on the public agent card pages.

### Approach

Use the `@elevenlabs/react` SDK with the `useConversation` hook for a native, integrated voice experience inside the chat panel. This connects to the same ElevenLabs agent (`agent_4501kmytq1bnekgs59jh6rzjwxw4`) already configured for the platform — no additional API keys needed since it's a public agent.

### How It Will Work

1. A **microphone button** appears next to the text input in the AI Assistant panel
2. Tapping it starts a live voice session — the user speaks and the AI responds with voice
3. A visual indicator shows when the AI is speaking vs listening
4. The user can end the voice session and return to text chat at any time

### Technical Changes

| Step | File | Change |
|------|------|--------|
| 1 | `package.json` | Install `@elevenlabs/react` |
| 2 | `src/components/AIChatPanel.tsx` | Add `useConversation` hook with the existing agent ID. Add a mic toggle button next to the Send button. Show voice status (connected/speaking/listening) in the chat area when active. |

### Key Details

- **No API key needed** — the ElevenLabs agent is public (same as on `/card/:slug` pages)
- **Connection type**: WebRTC (lower latency)
- **User must grant microphone permission** — handled with a friendly toast if denied
- The text chat remains fully functional alongside voice

