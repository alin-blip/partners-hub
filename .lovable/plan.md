

## Plan: Fix Facebook Share Error in Both Components

### Root Cause
On mobile, `window.open()` is blocked as a popup when called after async operations (fetch, clipboard write). Facebook share goes through the fallback path (download + copy + open URL), but by the time `window.open` executes after the async `fetch` and `clipboard.writeText`, the browser no longer considers it a direct user gesture — so it blocks the popup, which throws an error caught by the generic `catch` block showing "Eroare la partajare".

### Fix
For platforms that need a fallback URL (Facebook, LinkedIn), open the window **before** the async work:

1. Open the platform URL immediately (synchronously) using `window.open` at the start
2. Then fetch the image, download it, and copy the caption asynchronously
3. This ensures the popup isn't blocked

### Changes

**File: `src/components/SocialShareButtons.tsx`** (used by CreateImagePage)
- In `handleShare`, for platforms in `skipNativeSharePlatforms`: open the fallback URL **first** (synchronously), then do the async fetch/download/copy
- Wrap the async clipboard call in a try-catch so clipboard failures don't kill the whole flow

**File: `src/pages/shared/AgentSocialFeedPage.tsx`** (Social Posts)
- Same fix in `handleShareForPlatform`: open the platform URL synchronously before async work
- Wrap clipboard in try-catch

### Technical Detail
```
// Before (broken on mobile):
const response = await fetch(imageUrl);  // async
// ... download logic ...
await navigator.clipboard.writeText(shareText);  // async
window.open(fallbackUrl, "_blank");  // ❌ blocked as popup

// After (fixed):
if (skipNativeSharePlatforms.includes(platform)) {
  const fallbackUrl = platformFallbackUrls[platform]?.(...);
  if (fallbackUrl) window.open(fallbackUrl, "_blank");  // ✅ sync, user gesture
  // Then do async download + copy
}
```

### Files changed
- `src/components/SocialShareButtons.tsx`
- `src/pages/shared/AgentSocialFeedPage.tsx`

