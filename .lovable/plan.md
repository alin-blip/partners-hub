

# Fix Facebook/Social Link Preview for Digital Card URLs

## Problem
When an agent shares their card link (`https://agents-eduforyou.co.uk/card/slug`) on Facebook or LinkedIn, the crawler gets an empty SPA shell — no title, no image, no description. The preview appears blank.

## Root Cause
The app is a Single Page Application (React). When Facebook's crawler fetches `/card/slug`, it receives the generic `index.html` with no agent-specific OG meta tags — just the default "EduForYou UK – Agent Management Platform" title and a generic image.

## Existing Infrastructure
The `og-share` edge function already exists and works perfectly — it fetches the agent's profile, avatar, bio, and job title from the database and serves a full HTML page with proper OG meta tags, then redirects the browser to the real card page. It's currently used by the social sharing buttons.

## Solution
Make the **card link that agents copy and share** point to the `og-share` edge function instead of the direct SPA URL. The edge function already handles the redirect to the real card page, so the user experience is seamless:

1. Facebook crawler hits `og-share?slug=john` → gets rich OG meta (name, photo, bio)
2. Real user hits same URL → sees OG page for a split second, then auto-redirects to `/card/john`

## Changes

### 1. `src/components/CardSettingsSection.tsx`
- Add an `ogCardUrl` that points to the edge function: `{SUPABASE_URL}/functions/v1/og-share?slug={slug}`
- Change the "Copy Card Link" button to copy the `ogCardUrl` instead of the direct SPA URL
- Keep the direct `cardUrl` for the QR code (QR scanners open a browser directly, no crawler involved)

### 2. `src/pages/public/AgentCardPage.tsx`
- Add dynamic OG meta tags using `document.title` and a `<meta>` injection in `useEffect` after fetching profile data
- This helps if someone shares the direct URL (from QR scan or address bar), though it won't fully work for Facebook's crawler (which doesn't execute JS), it improves Twitter/Telegram/iMessage which do partial JS execution

### 3. No edge function changes needed
The `og-share` function already works correctly with `?slug=` parameter.

## Live Impact
- Zero risk — only changes which URL gets copied to clipboard
- QR codes remain unchanged (direct URL)
- Agents' existing shared links still work (just show blank preview as before)
- New shared links will show rich previews with agent photo, name, and bio

