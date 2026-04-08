

# Refacere completă panou AI — Voce + Transcript, fără WebRTC

## Problema de fond

Agentul vocal ElevenLabs Conversational AI (WebRTC prin `livekit-client`) nu funcționează — eroarea `v1 RTC path not found` persistă indiferent de version pinning, override-uri sau simplificări. Cauza este un conflict de versiuni între `@elevenlabs/react` SDK și serverele LiveKit folosite de ElevenLabs, pe care nu îl putem controla din client.

## Soluția: eliminăm WebRTC, păstrăm voce + text

In loc de agentul conversational (speech-to-speech via WebRTC), folosim o arhitectură care **deja funcționează** parțial în cod:

```text
User scrie mesaj → ai-chat (Gemini streaming) → răspuns text afișat în chat
                                               → elevenlabs-tts → audio redat automat
```

Aceasta elimină complet dependența de `@elevenlabs/react`, `livekit-client`, `ConversationProvider` și tot codul WebRTC.

## Ce se schimbă

### 1. Eliminăm dependințele problematice

**`package.json`**:
- Scoatem `@elevenlabs/react` din dependencies
- Scoatem secțiunea `overrides` cu `livekit-client`

### 2. Rescriem `src/components/AIChatPanel.tsx` de la zero

**Interfața nouă — minimalistă și curată:**
- Un singur buton FAB (floating action button) care deschide panoul
- Header simplu: titlu + buton „New Chat" + buton „History"
- Zona de mesaje cu bule de chat (user/assistant)
- Input bar: câmp text + buton Send + indicator audio „Vorbește..."
- Răspunsul AI: apare ca text (streaming) ȘI se redă automat ca audio (TTS propoziție cu propoziție)
- Buton Stop audio vizibil când AI vorbește

**Ce eliminăm:**
- Butonul Phone/PhoneOff (mod vocal WebRTC)
- Butonul Volume2/VolumeX (toggle autoSpeak) — vocea e mereu activă
- `ConversationProvider` wrapper
- `useConversation` hook
- `voiceMode`, `voiceConnecting`, `isAgentSpeaking` states
- `startVoiceConversation`, `stopVoiceConversation` functions
- SoundWave component (simplificăm cu un simplu indicator text)
- CSS animations complexe (mic-pulse, voice-mode-pulse)

**Ce păstrăm și îmbunătățim:**
- `streamChat()` — funcția de streaming text cu Gemini (funcționează)
- `fetchTTSChunk()` — TTS per propoziție (funcționează)
- Audio queue player (playNextInQueue, enqueueAudio, stopAllAudio)
- Conversation history (load/save)
- Quick action chips
- Markdown rendering pentru răspunsuri
- Typing indicator

### 3. Edge functions — rămân neschimbate

- `ai-chat` — streaming text (Gemini) ✓
- `elevenlabs-tts` — audio per propoziție ✓
- `elevenlabs-agent-token` — nu mai e necesar, dar îl lăsăm (nu deranjează)

### 4. `DashboardLayout.tsx` — import simplificat

Nu mai avem nevoie de `ConversationProvider`, componenta exportată va fi directă.

## Structura noii componente

```text
AIChatPanel
├── FAB button (deschide Sheet)
├── Sheet
│   ├── Header (titlu, new chat, history)
│   ├── History view (lista conversații)
│   └── Chat view
│       ├── Welcome screen + Quick Actions (când nu e mesaj)
│       ├── Message list (scroll)
│       │   ├── User bubble
│       │   ├── Assistant bubble (markdown)
│       │   ├── Typing indicator
│       │   └── Audio indicator ("Vorbește..." + Stop)
│       └── Input bar (text + send button)
```

## Detalii tehnice

- Eliminarea `@elevenlabs/react` reduce bundle-ul semnificativ (nu se mai descarcă livekit-client ~500KB)
- Vocea funcționează prin TTS API standard (REST), nu WebRTC — fiabil 100%
- Fiecare propoziție din răspuns este trimisă la TTS imediat ce e completă, dând senzația de răspuns vocal rapid
- Nu e nevoie de permisiune de microfon

