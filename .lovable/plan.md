

# Fix AI Rate Limits — All Roles (Owner, Admin, Agent)

## What is happening

The app uses Lovable AI for image and caption generation. There are two separate limits:
1. **App-level daily limit**: 5 images/day/user (in `generate-image` edge function)
2. **Lovable AI gateway rate limit**: per-minute throttle shared across the workspace (429 errors)

The 429 errors persist because: the retry logic (3 attempts) is not enough during bursts, the caption model is too heavy (`gemini-2.5-pro`), and both pages fire multiple AI calls back-to-back.

## What changes

### 1. Owner gets unlimited daily image limit

In `supabase/functions/generate-image/index.ts`:
- Check the user's role via `user_roles` table before applying the daily limit
- If role is `owner`: skip the daily limit check entirely
- Admin and agent: keep the 5/day cap

### 2. Lighter model for captions

In `supabase/functions/generate-caption/index.ts`:
- Switch from `google/gemini-2.5-pro` to `google/gemini-2.5-flash`
- Same quality for short captions/scripts, much less gateway pressure

### 3. Structured error responses from generate-caption

In `supabase/functions/generate-caption/index.ts`:
- On 429: return `{ ok: false, errorType: "rate_limit", error: "..." }` with HTTP 200 (matching generate-image pattern)
- On 402: return `{ ok: false, errorType: "credits_exhausted", error: "..." }` with HTTP 200
- Wrap successful responses: `{ ok: true, caption: "..." }`

### 4. Stagger AI calls and add delay between them

In `src/pages/shared/SocialPostsPage.tsx`:
- Add 3-second delay between each image generation call
- Add 3-second delay before script and caption calls
- If script call hits rate limit, skip caption call too

In `src/pages/shared/CreateImagePage.tsx`:
- Add 2-second delay before caption generation after image success

### 5. Increase retry attempts and backoff

In both edge functions:
- Increase retry from 3 to 5 attempts
- Increase backoff: 3s, 6s, 12s, 24s (longer waits between retries)

### 6. UI cooldown after rate limit

In both `SocialPostsPage.tsx` and `CreateImagePage.tsx`:
- After a rate_limit error, disable the generate button for 30 seconds with a visible countdown
- Show a clear message: "AI is temporarily busy. Please wait..."

## Files modified

| File | Change |
|------|--------|
| `supabase/functions/generate-image/index.ts` | Owner unlimited, 5 retries with longer backoff |
| `supabase/functions/generate-caption/index.ts` | Switch to flash model, structured errors, 5 retries |
| `src/pages/shared/SocialPostsPage.tsx` | Delays between calls, cooldown UI, structured error handling |
| `src/pages/shared/CreateImagePage.tsx` | Delay before caption, cooldown UI, structured error handling |

## Technical detail: Owner role check in edge function

```typescript
// In generate-image, after auth:
const { data: roleRow } = await adminClient
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id)
  .single();

const userRole = roleRow?.role;
const isOwner = userRole === "owner";

// Skip daily limit for owner
if (!isOwner) {
  // existing daily limit logic...
}
```

## Expected result

- Owner: no daily image cap, same gateway retry protection
- Admin/Agent: 5/day cap, same gateway retry protection
- All roles: fewer 429 failures due to lighter model + staggered calls + longer retries
- Clear UI feedback when temporarily throttled

