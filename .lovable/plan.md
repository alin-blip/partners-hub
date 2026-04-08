

# Fix: Agentul vocal se conectează dar nu pornește

## Problema

Eroarea din consolă: **"Initial connection failed: v1 RTC path not found"** + conversația se oprește la "Se conectează..."

Cauza: parametrul `overrides` pasat în `startSession()` **abortează sesiunea** — este un [bug confirmat în SDK-ul ElevenLabs](https://github.com/elevenlabs/packages/issues/92). De asemenea, `connectionType: "webrtc"` este redundant când se folosește `conversationToken` (se detectează automat).

## Soluția

Eliminăm `overrides` și `connectionType` din `startSession()`. Agentul va folosi promptul configurat direct în ElevenLabs Dashboard.

### Fișier: `src/components/AIChatPanel.tsx`

**Modificare** — simplificăm apelul `startSession`:

```typescript
// ÎNAINTE (nu funcționează):
await conversation.startSession({
  conversationToken: token,
  connectionType: "webrtc",
  overrides: {
    agent: {
      prompt: { prompt: systemPrompt },
      firstMessage: firstMessage,
      language: "ro",
    },
  },
});

// DUPĂ (fix):
await conversation.startSession({
  conversationToken: token,
});
```

## Ce înseamnă asta

- Agentul vocal va folosi **promptul și vocea configurate direct în ElevenLabs Dashboard**
- Contextul dinamic (studenți, enrollment-uri) nu va mai fi injectat per sesiune — trebuie configurat manual în agentul ElevenLabs
- Edge function-ul `elevenlabs-agent-token` rămâne funcțional (returnează token-ul), dar `systemPrompt` și `firstMessage` nu mai sunt folosite pe client

## Detalii tehnice

- `overrides` în `startSession` este un bug cunoscut în `@elevenlabs/react` ≥ 1.0 (GitHub issue #92)
- Documentația oficială arată `overrides` doar în constructorul `useConversation`, nu în `startSession`
- `connectionType: "webrtc"` este auto-detectat când se folosește `conversationToken`

