

# Refacere AIChatPanel — 2 moduri: Text-to-Text + Call Mode

## Situația actuală

Componenta `AIChatPanel.tsx` funcționează doar în modul text+TTS (scrie mesaj → primește text streaming + audio automat). Nu există `@elevenlabs/react` în `package.json` (a fost eliminat). Edge function-ul `elevenlabs-agent-token` returnează un `conversationToken` WebRTC, dar nu este folosit nicăieri.

## Ce construim

Panoul AI va avea **2 moduri**, comutabile dintr-un toggle vizibil:

### Mod 1: Text-to-Text (Chat)
- Exact ce avem acum: scrii mesaj → primești răspuns text (Gemini streaming) + audio TTS automat
- Fără modificări majore la logica existentă

### Mod 2: Call Mode (Voce live)
- Readucem `@elevenlabs/react` ca dependență
- Buton mare "Start Call" — solicită permisiune microfon, obține token de la `elevenlabs-agent-token`, pornește sesiunea WebRTC
- Interfață minimală: avatar animat, indicator "Listening..." / "Speaking...", buton "End Call"
- Fără overrides, fără connectionType — doar `startSession({ conversationToken })`
- Transcript live opțional (afișează ce spune userul și ce răspunde agentul)

## Structura UI

```text
AIChatPanel
├── FAB button (deschide Sheet)
├── Sheet
│   ├── Header (titlu + toggle Text/Call + history + new chat)
│   ├── History view (neschimbat)
│   ├── Chat view (Mod Text — neschimbat)
│   └── Call view (Mod Call — NOU)
│       ├── Avatar animat central (pulsează când vorbește)
│       ├── Status: "Apasă Start" / "Se conectează..." / "Ascultă..." / "Vorbește..."
│       ├── Transcript area (user + agent messages)
│       ├── Start Call / End Call button
```

## Modificări fișiere

### 1. `package.json`
- Adăugăm `@elevenlabs/react` înapoi (ultima versiune)
- Adăugăm `overrides: { "livekit-client": "2.16.1" }` pentru compatibilitate

### 2. `src/components/AIChatPanel.tsx` — restructurare completă

- Adăugăm state `mode: "text" | "call"` cu un toggle vizibil în header
- **Mod Text**: păstrăm tot codul existent (streamChat, TTS, mesaje, history)
- **Mod Call**: secțiune nouă cu:
  - `useConversation` hook din `@elevenlabs/react`
  - Funcție `startCall()`: fetch token → `conversation.startSession({ conversationToken })`
  - Funcție `endCall()`: `conversation.endSession()`
  - UI: avatar pulsant, status text, transcript live, buton start/end
  - `onMessage` handler pentru transcript (user_transcript + agent_response)

### 3. Edge functions — neschimbate
- `ai-chat` — rămâne pentru modul Text
- `elevenlabs-tts` — rămâne pentru modul Text  
- `elevenlabs-agent-token` — rămâne pentru modul Call (deja funcțional)

## Detalii tehnice

- Toggle-ul Text/Call va fi un grup de 2 butoane sau `ToggleGroup` în header
- În modul Call, zona de mesaje și input bar dispar — sunt înlocuite de interfața de call
- Istoricul conversațiilor rămâne doar pentru modul Text (call-urile nu se salvează)
- `livekit-client` trebuie fixat la `2.16.1` via overrides pentru a evita eroarea `v1 RTC path not found`
- `startSession` va folosi DOAR `{ conversationToken }` — fără overrides, fără connectionType

