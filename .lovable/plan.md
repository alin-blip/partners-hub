

# Plan: ElevenLabs Conversational AI Agent cu context dinamic din platformă

## Ce se schimbă

Înlocuim pipeline-ul actual (Scribe STT → ai-chat → ElevenLabs TTS) cu un **ElevenLabs Conversational AI Agent nativ** care face speech-to-speech direct, dar primește promptul și contextul din platforma EduForYou la fiecare sesiune.

## Cum funcționează

```text
┌─────────────────────────────────────────────────┐
│  User clicks "Start Conversation"               │
│                                                  │
│  1. Frontend → edge function (get-agent-token)  │
│     - Authenticates user via JWT                │
│     - Fetches: role, profile, students,          │
│       enrollments, knowledge base               │
│     - Builds system prompt (same as ai-chat)    │
│     - Requests conversation token from EL       │
│     - Returns: { token, systemPrompt }          │
│                                                  │
│  2. Frontend → useConversation(token, overrides)│
│     - overrides.agent.prompt = systemPrompt     │
│     - Native speech-to-speech via WebRTC        │
│     - No intermediate text pipeline             │
│                                                  │
│  3. User speaks ↔ Agent responds (continuous)   │
│     - Auto-handles turn-taking                  │
│     - User can interrupt agent mid-speech       │
│     - Transcripts shown in chat UI              │
└─────────────────────────────────────────────────┘
```

## Cerință prealabilă: Agent ID

Trebuie creat un agent în ElevenLabs Dashboard (o singură dată):
- Model: orice (promptul va fi suprascris de platformă via overrides)
- Voice: selectezi vocea dorită (ex: Sarah, Laura)
- Enable "Allow overrides" în setări
- Copiezi **Agent ID**-ul generat

Agent ID-ul va fi stocat ca secret (`ELEVENLABS_AGENT_ID`).

## Implementare

### 1. Edge function: `elevenlabs-agent-token`

**Creează** `supabase/functions/elevenlabs-agent-token/index.ts`

- Autentifică userul din JWT (exact ca în ai-chat)
- Fetches: user role, profile, knowledge base, students/enrollments (identic cu ai-chat)
- Construiește system prompt-ul complet (copy from ai-chat logic)
- Cere conversation token de la ElevenLabs API
- Returnează `{ token, systemPrompt, firstMessage }`

### 2. Frontend: `AIChatPanel.tsx`

**Modifică** pentru a adăuga modul Conversational Agent:

- Instalează `@elevenlabs/react` (deja există în proiect)
- Adaugă `useConversation` hook alongside existing `useScribe`
- Butonul **Phone** pornește agentul conversațional:
  1. Fetch token + prompt de la `elevenlabs-agent-token`
  2. `conversation.startSession({ conversationToken, overrides: { agent: { prompt: { prompt: systemPrompt } } } })`
- Afișează transcripturile user/agent în chat UI via `onMessage`
- Butonul **PhoneOff** → `conversation.endSession()`
- Modul text (scris) rămâne neschimbat (ai-chat + TTS)

### 3. Ce se păstrează
- Tot modul text (chat scris cu streaming + TTS) rămâne intact
- Istoricul conversațiilor text rămâne
- Quick actions, markdown rendering — toate la fel

### 4. Ce se elimină
- `voiceMode` state și logica Scribe-loop (auto-restart mic) — înlocuită de agentul nativ
- `restartMicForVoiceMode` — nu mai e nevoie

## Pași de setup (o singură dată)

1. Mergi la [ElevenLabs Dashboard → Agents](https://elevenlabs.io/app/conversational-ai)
2. Creează un agent nou → alege vocea dorită → Enable overrides
3. Copiază Agent ID
4. Îl adăugăm ca secret `ELEVENLABS_AGENT_ID` în platformă

## Fișiere

| Acțiune | Fișier |
|---|---|
| **Crează** | `supabase/functions/elevenlabs-agent-token/index.ts` |
| **Modifică** | `src/components/AIChatPanel.tsx` |

## Detalii tehnice

- `useConversation` din `@elevenlabs/react` gestionează WebRTC, turn-taking, VAD automat
- Promptul dinamic via `overrides.agent.prompt.prompt` — agentul primește tot contextul EduForYou
- `onMessage` callback pentru transcripturi (user_transcript, agent_response) — afișate în UI
- `conversation.isSpeaking` pentru animații de speaking
- `conversation.status` pentru starea conexiunii

