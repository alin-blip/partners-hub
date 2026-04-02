

# Fix: Welcome emails not sending for new agents/admins

## Root Cause

When `create-owner` edge function calls `send-transactional-email` internally via `supabaseAdmin.functions.invoke()`, it passes the **service role key** as the Authorization bearer token. But `send-transactional-email` validates that token using `authClient.auth.getClaims()` with the anon key client — which **rejects** the service role JWT, returning "Invalid or expired token".

This same bug also affects the `submit-public-application` function (confirmed in logs: `"Public lead notification failed {"error":"Invalid or expired token"}"`).

Additionally, welcome emails are only sent for `role === "agent"` — no email is sent when creating an admin.

## Changes

### 1. Fix `send-transactional-email` to accept service role JWT (lines 63-74)

Add a fallback: if `getClaims` fails, check if the token is the service role key itself (by comparing with `SUPABASE_SERVICE_ROLE_KEY` env var). This allows edge-to-edge function calls while keeping auth validation for client-side calls.

```typescript
const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token)
if (claimsError || !claimsData?.claims) {
  // Allow service-role calls from other edge functions
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (token !== serviceKey) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
```

### 2. Send welcome email for admins too in `create-owner` (lines 189-211)

Change `if (role === "agent")` to `if (role === "agent" || role === "admin")` so admins also receive the welcome email. The existing `welcome-agent` template works for both — the text is generic enough ("Your agent account has been created" → we'll also create a `welcome-admin` template or reuse with adjusted wording).

Actually, simplest approach: extend the condition and reuse the same template (it says "Welcome" and "Log in"). The template name stays `welcome-agent` but it works for admins too. Optionally rename later.

### 3. Redeploy both edge functions

Deploy `send-transactional-email` and `create-owner`.

## Files modified
1. `supabase/functions/send-transactional-email/index.ts` — accept service role JWT
2. `supabase/functions/create-owner/index.ts` — send welcome email for admin role too

