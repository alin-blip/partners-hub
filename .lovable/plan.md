

## Fix: AI Image Generator "Unauthorized" Error

### Problem
The `generate-image` edge function throws "Unauthorized" because `userClient.auth.getUser()` fails. The function creates a user-scoped Supabase client but the `getUser()` call doesn't work correctly in the edge function context.

### Solution
Change the auth validation to use the `adminClient` (service role) to verify the JWT token instead of creating a separate user client. This is more reliable in edge functions.

### Changes

**1. Fix `supabase/functions/generate-image/index.ts`**
- Replace the user client auth pattern with admin client JWT verification
- Use `adminClient.auth.getUser(token)` which passes the JWT directly and works reliably
- Remove the unnecessary `userClient` creation

Before:
```ts
const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { ... });
const { data: { user }, error } = await userClient.auth.getUser();
```

After:
```ts
const token = authHeader.replace("Bearer ", "");
const { data: { user }, error } = await adminClient.auth.getUser(token);
```

This is a single-file fix. No database or frontend changes needed — the page already has routes for all roles (owner, admin, agent).

