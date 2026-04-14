

# Fix: Image Generation Stuck on "Generating..."

## Root Cause

`EdgeRuntime.waitUntil()` does not work reliably on Supabase Edge Functions. The background process gets killed when the function instance shuts down. The logs confirm this — rapid boot/shutdown cycles from polling, but zero processing logs (no "Job completed", no errors). Jobs get stuck in `processing` status permanently.

The original CPU timeout was caused by `resvg` SVG rendering (compositing profile photo onto a 1080x1080 canvas server-side). The AI call itself is I/O wait, not CPU — it should work fine synchronously.

## Solution: Go back to synchronous + move photo composition to client

### 1. Revert `generate-image/index.ts` to synchronous

- Remove the job-based async pattern entirely (no `EdgeRuntime.waitUntil`, no `processInBackground`, no GET polling handler)
- Process the AI call synchronously and return the result directly
- **Remove `resvg` composition entirely** — this was the CPU bottleneck
- When `includePhoto` is true, just return the AI-generated image URL + the avatar URL separately
- Keep retry logic but reduce to 3 retries with shorter backoff

### 2. Move profile photo overlay to client-side (Canvas API)

- In `CreateImagePage.tsx` and `SocialPostsPage.tsx`, when `includePhoto` is true and an image is returned:
  - Use HTML Canvas to draw the generated image
  - Overlay the profile photo as a circular cutout with gold ring in the bottom-left corner
  - Export the composited canvas as the final image
- This eliminates all server-side CPU-intensive rendering

### 3. Simplify `CreateImagePage.tsx`

- Remove `pollForJob` function
- Go back to a simple `await supabase.functions.invoke()` pattern
- Add client-side `compositeProfilePhoto(generatedImageUrl, avatarUrl)` utility using Canvas
- Same changes in `SocialPostsPage.tsx`

### 4. Clean up

- The `image_generation_jobs` table can remain (no harm) but won't be used
- `image-composition.ts` server file becomes unused — can be kept or removed
- Create a new `src/lib/image-composite.ts` for the client-side Canvas compositing

## Files to modify

| File | Change |
|------|--------|
| `supabase/functions/generate-image/index.ts` | Revert to synchronous, remove resvg, return image + avatar separately |
| `src/lib/image-composite.ts` | New — client-side Canvas compositing (circular photo + gold ring) |
| `src/pages/shared/CreateImagePage.tsx` | Remove polling, add client-side composition |
| `src/pages/shared/SocialPostsPage.tsx` | Same changes |

## Key technical detail

```text
Before (broken):
  Client → POST → 202 + jobId → poll GET every 2s → stuck forever

After (fixed):
  Client → POST → wait ~20s → { url, avatarUrl } → Canvas composite → done
```

The Canvas compositing replicates the same visual effect (circular photo, gold ring, shadow) but runs instantly in the browser with zero server CPU cost.

