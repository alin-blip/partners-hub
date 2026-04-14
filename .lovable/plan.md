

# Fix: generate-image CPU Time Exceeded

## Problem
The `generate-image` edge function is failing with **"CPU Time exceeded"** errors on every call. The logs show this pattern repeatedly — boot, then CPU timeout, then shutdown. Users cannot generate any images.

**Root cause**: The function does too much synchronous/blocking work within the edge function's CPU time limit:
1. The AI image generation call to Gemini takes 15-30+ seconds of wall time
2. When "Include my photo" is on, the `resvg` SVG render composites two full base64 images onto a 1080x1080+ canvas — extremely CPU-intensive
3. The retry loop with exponential backoff (up to 5 retries) compounds the time

## Solution: Use `EdgeRuntime.waitUntil()` async pattern

Convert the function to return a `202 Accepted` immediately with a job record ID, then process the image in the background. The client polls for completion.

### Changes

**1. Database migration** — Add a `image_generation_jobs` table:
- `id` (uuid, PK), `user_id`, `prompt`, `preset`, `status` (queued/processing/completed/failed), `result_url`, `error_message`, `remaining`, `created_at`

**2. Edge function `generate-image/index.ts`**:
- After auth + daily limit check, insert a job row with `status = 'queued'`
- Call `EdgeRuntime.waitUntil(processInBackground(jobId, ...))` with all the heavy work (AI call, composition, upload)
- Return `202` immediately with `{ jobId }`
- The background function updates the job row to `completed` (with URL) or `failed` (with error)

**3. Remove `resvg` composition** — replace with a simpler approach:
- Skip the SVG render entirely. Instead, just upload the AI-generated image as-is
- For "Include my photo", store the avatar URL in the job result and let the **client** render the circular photo overlay using a CSS/canvas approach (much lighter)
- OR keep server composition but use a lighter method (just upload both images and let the client composite)

**4. Client-side polling** — Update `CreateImagePage.tsx` and `SocialPostsPage.tsx`:
- On mutation call, receive `{ jobId }` with 202 status
- Poll `generate-image?jobId=...` (GET) every 2 seconds until status is `completed` or `failed`
- Show a progress indicator during polling
- On completion, display the image as before

### Files to modify

| File | Change |
|------|--------|
| `supabase/functions/generate-image/index.ts` | Async pattern with `EdgeRuntime.waitUntil()`, add GET handler for polling |
| `supabase/functions/generate-image/image-composition.ts` | Keep but only used in background worker |
| `src/pages/shared/CreateImagePage.tsx` | Poll for job completion instead of waiting for response |
| `src/pages/shared/SocialPostsPage.tsx` | Same polling pattern |
| DB migration | Create `image_generation_jobs` table with RLS |

### Key technical details

```text
Client                    Edge Function              Background Worker
  |                           |                           |
  |-- POST /generate-image -->|                           |
  |                           |-- INSERT job (queued) ---> |
  |                           |-- waitUntil(process()) --->|
  |<-- 202 { jobId } --------|                           |
  |                           |                           |-- AI call
  |-- GET ?jobId=xxx -------->|                           |-- compose
  |<-- { status: processing } |                           |-- upload
  |                           |                           |-- UPDATE job (completed)
  |-- GET ?jobId=xxx -------->|                           |
  |<-- { status: completed, url } |                       |
```

