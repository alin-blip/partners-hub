

## Plan: Fix Facebook Share — Skip Web Share API for Facebook

### Problem
Facebook's mobile app doesn't properly handle the `text` field from the Web Share API when files are included. It strips most of the caption and only shows fragments (hashtags, `.co.uk` parts). Instagram and WhatsApp handle it correctly because their apps properly read both `files` and `text` from the share intent.

### Fix
For Facebook specifically, bypass `navigator.share()` and use a **download + copy + open Facebook** flow:

1. Download the image to the device
2. Copy the full caption + agent link to clipboard
3. Open Facebook app/website (via `fb://` deep link on mobile, or `facebook.com` fallback)
4. Show a toast: "Imagine salvată și text copiat! Creează o postare pe Facebook și lipește textul."

Same approach for LinkedIn (which has similar limitations).

### Changes

**File: `src/pages/shared/AgentSocialFeedPage.tsx`**

- Add a set of platforms that should skip Web Share API: `["facebook", "linkedin"]`
- In `handleShareForPlatform`, check if platform is in the skip list — if so, go directly to the download+copy+open fallback flow
- Keep `navigator.share` for Instagram, TikTok, WhatsApp (where it works)

### Files changed
- `src/pages/shared/AgentSocialFeedPage.tsx`

