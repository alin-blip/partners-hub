

# Fix Call Mode: Inject Knowledge Base + User Context via Overrides

## Problem

The edge function builds a detailed `systemPrompt` containing the knowledge base and user-scoped data (students, enrollments, stats), but `startSession({ signedUrl })` does not pass it to the ElevenLabs agent. The voice agent only uses its static prompt from the ElevenLabs Dashboard, so it has no awareness of platform data.

## Solution

Use ElevenLabs **conversation overrides** to inject the dynamic system prompt and first message at session start. The SDK supports this via `startSession({ signedUrl, overrides })`.

## Requirements

1. **ElevenLabs Dashboard**: Enable "System prompt" and "First message" overrides in the agent's security settings. This is a one-time manual step you need to do.

2. **No edge function changes needed** — it already returns `systemPrompt` and `firstMessage`.

## Code Change

### `src/components/AIChatPanel.tsx` — Update `startCall()` in `CallModeView`

Current:
```typescript
await conversation.startSession({ signedUrl });
```

Updated:
```typescript
await conversation.startSession({
  signedUrl,
  overrides: {
    agent: {
      prompt: { prompt: data.systemPrompt },
      firstMessage: data.firstMessage,
    },
  },
});
```

This passes the full knowledge base, user context, and personalized greeting directly into the voice session — making Call Mode as informed as Text Mode.

## Important Manual Step

You must go to the ElevenLabs Dashboard → your agent → Security settings → and enable the **System prompt** and **First message** override toggles. Without this, the overrides will be silently ignored.

## Files to update
- `src/components/AIChatPanel.tsx` (one change in `startCall()`)

