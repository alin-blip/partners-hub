

## Plan: Simplify Social Share — Download Image + Copy Caption with Agent Link

### Approach
All share buttons (Facebook, Instagram, TikTok, LinkedIn) will do the same thing:
1. **Download the image** to the agent's device
2. **Copy the caption + agent's digital card link** to clipboard
3. Show a toast telling them to paste on the platform

The agent's card link (`/card/:slug`) is dynamically generated per agent and appended to every copied caption.

### Changes

**File: `src/pages/shared/AgentSocialFeedPage.tsx`**

- Remove `getOgShareUrl` function (no longer needed)
- Simplify `copyForPlatform` — all platforms now call `handleDownloadImage(post)` which downloads the image and copies `caption + \n\n🔗 cardUrl` to clipboard
- Update toast messages per platform: "Image saved & caption copied! Post it on Facebook/Instagram/etc."
- Keep the existing download button as-is (same behavior)
- Remove the `og-share` edge function URL usage entirely

### Result
- Agent taps any platform button → image downloads → caption with their personal card link is copied
- They open the platform, create a post, upload the downloaded image, paste the caption
- The caption contains their unique `/card/:slug` link for lead capture

### Files changed
- `src/pages/shared/AgentSocialFeedPage.tsx` — simplify all share buttons to download+copy flow

