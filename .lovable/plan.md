

## Plan: Dynamic OG share link per agent + proper social sharing

### Problem
When an agent shares a post on Facebook/LinkedIn, the preview shows generic "EduForYou UK" metadata instead of the post image, caption, and agent's card link. Social media crawlers can't read client-side React meta tags.

### Solution
Create an edge function that serves dynamic HTML with OG meta tags, so social platforms show the correct preview (post image + caption + agent link). Real users get redirected to the agent's card page.

### Changes

**1. New Edge Function: `supabase/functions/og-share/index.ts`**
- Accepts query params: `slug` (agent slug), `post` (optional post ID)
- Fetches agent profile from `public_agent_profiles` view
- If `post` param provided, fetches the social post's `image_url` and `caption`
- Returns minimal HTML with dynamic OG meta tags:
  - `og:title` = Agent name + job title
  - `og:description` = Post caption or agent bio
  - `og:image` = Post image or agent avatar
  - `og:url` = Card page URL
- Includes `<meta http-equiv="refresh">` to redirect real users to `/card/:slug`

**2. Update `src/pages/shared/AgentSocialFeedPage.tsx`**
- Change the share URL from `/card/:slug` to the edge function URL with post context:
  `${SUPABASE_URL}/functions/v1/og-share?slug=xxx&post=POST_ID`
- Facebook/LinkedIn sharer will use this URL so crawlers get proper OG tags
- The clipboard copy for Instagram/TikTok keeps caption + agent card link as before

**3. No database changes needed**
Uses existing `public_agent_profiles` view and `social_posts` table (anon-readable via edge function with service role).

### How it works

```text
Agent clicks "Share on Facebook" for a post
  → Opens facebook.com/sharer?u=EDGE_FUNCTION_URL?slug=x&post=y
  → Facebook crawler hits edge function
  → Edge function returns HTML with:
      og:image = post image
      og:description = post caption  
      og:title = "Agent Name – EduForYou UK"
  → Facebook shows rich preview with image + text
  → User clicks → redirected to /card/:slug → becomes a lead
```

