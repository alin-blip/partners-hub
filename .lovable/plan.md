

# Fix: Add Retry with Backoff for AI Rate Limits

## Problem
The AI gateway returns 429 (rate limit) and the edge function immediately passes it through to the frontend. No retries are attempted.

## Solution
Add retry logic with exponential backoff in both `generate-image` and `generate-caption` edge functions. Retry up to 3 times with increasing delays (2s, 4s, 8s) when receiving a 429.

## Changes

### 1. `supabase/functions/generate-image/index.ts`
- Wrap the AI gateway `fetch` call in a retry loop (max 3 attempts)
- On 429: wait 2^attempt seconds, then retry
- Only return rate_limit error after all retries exhausted
- Use `Deno.sleep()` or a simple `await new Promise(r => setTimeout(r, ms))` for delays

```typescript
// Replace single fetch with retry loop
let aiResponse: Response | null = null;
for (let attempt = 0; attempt < 3; attempt++) {
  aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", { ... });
  if (aiResponse.status !== 429) break;
  if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt)));
}
```

### 2. `supabase/functions/generate-caption/index.ts`
- Same retry pattern around the AI gateway call

### 3. Redeploy both functions

## Why This Works
The 429 is often a transient burst limit. A 2–8 second backoff is usually enough for the gateway to allow the next request through, without the user needing to manually retry.

