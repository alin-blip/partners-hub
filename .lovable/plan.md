

## Plan: Native Share via Web Share API + Fallback

### Problem
Currently all buttons just download the image. The user wants tapping "Facebook" / "Instagram" etc. to actually open the platform's share dialog with the image and caption ready.

### Solution
Use the **Web Share API** (`navigator.share`) which is supported on all modern mobile browsers and recent desktop Chrome/Edge. It opens the native OS share sheet where the user picks Facebook, Instagram, WhatsApp, etc. — and it supports sharing **files (images) + text** together.

**Flow per button:**
1. Fetch the image as a `File` object (from the blob)
2. Build share text = caption + agent card link
3. Call `navigator.share({ files: [imageFile], text: shareText })`
4. If Web Share API is not available (older desktop browsers), fall back to: download image + copy caption + open the platform URL in a new tab

**Platform fallback URLs (desktop only):**
- Facebook: `https://www.facebook.com/sharer/sharer.php?quote={encodedCaption}`
- LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url={cardUrl}`
- WhatsApp: `https://wa.me/?text={encodedCaption}`
- Instagram/TikTok: no web share URL — just download + copy

### Changes

**File: `src/pages/shared/AgentSocialFeedPage.tsx`**
- Add `handleNativeShare(post, platform)` function:
  - Fetch image blob → convert to `File`
  - Try `navigator.share({ files, text })` if `navigator.canShare` supports files
  - On fallback: download image, copy caption, open platform URL
- Update all platform buttons to call `handleNativeShare`
- Add WhatsApp button (new)
- Remove unused `Popover` import

### Why this works
On mobile (where most agents post from), the Web Share API opens the native share sheet — the agent picks Facebook/Instagram directly, the image and text are pre-filled. No download step needed.

