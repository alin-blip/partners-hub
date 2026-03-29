

## Plan: Fix 3 Issues — Drive Sync, Social Share, Profile Photo Persistence

### Issue 1: Drive sync fails on student enrollment
**Root cause**: The `sync-to-drive` edge function uses `supabaseAuth.auth.getClaims(token)` (line 330), which does NOT exist in `@supabase/supabase-js@2`. Other working functions use `auth.getUser()` instead.

**Fix**: In `supabase/functions/sync-to-drive/index.ts`, replace the `getClaims` authentication block with the same `getUser()` pattern used by other edge functions (e.g., `generate-image`). Redeploy the function.

---

### Issue 2: Social share still shows generic link preview (no image/text)
**Root cause**: The `og-share` edge function works correctly, but Facebook/LinkedIn crawlers aggressively cache OG data. Two additional issues:
1. The `og:image` tag must point to an absolute, publicly accessible URL. The `social_posts.image_url` should already be public (stored in `generated-images` bucket which is public), but we should verify.
2. Facebook sharer requires `og:image` to be at least 200x200px and the URL must be reachable by Facebook's crawler without authentication.
3. The `public_agent_profiles` view may not return data when queried with service role — need to query `profiles` table directly instead since the view is designed for anon/authenticated roles.

**Fix**:
- In `og-share/index.ts`: Query the `profiles` table directly (with service role) instead of `public_agent_profiles` view, filtering by `slug` and `is_active = true`.
- Add `Cache-Control: no-cache` header to prevent intermediate caching.
- Add `og:image:width` and `og:image:height` meta tags for better crawler support.
- Redeploy and test.

---

### Issue 3: Profile photo doesn't persist across sessions
**Root cause**: The `ProfilePage` initializes `avatarUrl` from `useState((profile as any)?.avatar_url || "")` on component mount. However, the `profile` from `AuthContext` may not be loaded yet when the component first renders (it's fetched async). The state is initialized once and never updated when `profile` changes.

**Fix**: Add a `useEffect` in `ProfilePage.tsx` that syncs `avatarUrl`, `fullName`, and `phone` state when the `profile` object from AuthContext updates. This ensures the saved avatar URL (which IS persisted in the database) is properly displayed.

```typescript
useEffect(() => {
  if (profile) {
    setFullName(profile.full_name || "");
    setPhone(profile.phone || "");
    setAvatarUrl(profile.avatar_url || "");
  }
}, [profile]);
```

Also, after uploading the avatar, invalidate the auth context or relevant queries so the profile data refreshes across the app.

---

### Summary of file changes:
1. **`supabase/functions/sync-to-drive/index.ts`** — Replace `getClaims` with `getUser()` for JWT validation
2. **`supabase/functions/og-share/index.ts`** — Query `profiles` table instead of view; add image dimension meta tags; add cache headers
3. **`src/pages/shared/ProfilePage.tsx`** — Add `useEffect` to sync profile state when AuthContext profile loads

### Deployment:
- Redeploy `sync-to-drive` and `og-share` edge functions

