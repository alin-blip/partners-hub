

## Plan: Fix 3 Bugs + General Audit

### Bug 1: Facebook Share Does Nothing

**Root cause**: The Facebook sharer URL uses the SPA card URL (`/card/:slug`) as the `u` parameter. Facebook's crawler can't render JavaScript, so it finds no OG meta tags and shows a blank post. The `og-share` edge function exists precisely to serve proper OG HTML — but it's not being used.

**Fix** (in `SocialShareButtons.tsx` and `AgentSocialFeedPage.tsx`):
- When sharing to Facebook (and LinkedIn), use the og-share edge function URL as the share URL instead of the raw card URL:
  ```
  https://wyvbfjyuhpnmceudgmrh.supabase.co/functions/v1/og-share?slug=SLUG
  ```
- For social posts with a post ID, append `&post=POST_ID` so the og-share function returns the post's image and caption as OG tags
- Keep the card URL for other platforms (WhatsApp, etc.) since they don't crawl OG tags the same way

### Bug 2: Branded Profile Picture Not Showing on Digital Card

**Root cause**: `BrandedProfilePicture` uploads the **raw photo file** to storage and saves that URL to `profiles.avatar_url`. The canvas composition (photo + frame overlay) is only rendered locally on the HTML canvas — the composed result is never saved. So the digital card shows the raw photo, not the branded version.

**Fix** (in `BrandedProfilePicture.tsx`):
- After uploading the raw photo AND after the canvas draws successfully, export the canvas as a PNG blob
- Upload the canvas output (branded image) to `avatars` bucket as a separate file (e.g. `{userId}/branded-avatar.png`)
- Save the branded image URL to `profiles.avatar_url` instead of the raw photo URL
- This way the digital card, og-share, and everywhere else automatically shows the branded version

### Bug 3: Public Apply Form Submit Button Not Working

**Root cause**: The `handleSubmit` function inserts into `leads` but has **no error handling** — if the insert fails (RLS, schema, network), the user sees nothing happen. The button just stops spinning with no feedback. Additionally, the `send-transactional-email` function might fail silently too.

**Fix** (in `PublicApplicationPage.tsx`):
- Add an `else` branch after `if (!error)` to show an error toast when the insert fails
- Add try/catch around the entire submit to handle network errors
- Log the actual error for debugging

### General Audit Findings

After reviewing the codebase, these are additional items to note (no critical issues beyond the 3 bugs):
- All RLS policies for anon access to `leads` (INSERT), `agent_card_settings` (SELECT), and `public_agent_profiles` (SELECT) are correctly configured
- The og-share edge function is properly implemented but just not being used by the share buttons
- No other broken navigation or missing routes detected

### Files to Edit

| File | Change |
|------|--------|
| `src/components/SocialShareButtons.tsx` | Use og-share URL for Facebook/LinkedIn share |
| `src/pages/shared/AgentSocialFeedPage.tsx` | Same og-share URL fix for Facebook/LinkedIn |
| `src/components/BrandedProfilePicture.tsx` | Save canvas (branded) output as avatar_url instead of raw photo |
| `src/pages/public/PublicApplicationPage.tsx` | Add error handling/toast for failed form submission |

