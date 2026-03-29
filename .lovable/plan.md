

## Plan: Fix Drive Sync Error — Null Safety

### Problem
Edge function `sync-to-drive` returns 500 with error: `Cannot read properties of undefined (reading 'replace')`. The `sanitize()` function and potentially `getAccessToken()` receive `undefined` values when fields like `student.first_name`, `student.last_name`, `adminProfile.full_name`, or `serviceAccount.private_key` are null/undefined.

### Fix
Update `supabase/functions/sync-to-drive/index.ts` with null guards:

1. **`sanitize` function** — handle undefined/null input:
   ```typescript
   const sanitize = (s: string | null | undefined) => 
     (s || "Unknown").replace(/[^a-zA-Z0-9 ]/g, "_").substring(0, 50);
   ```

2. **`getAccessToken`** — add guard on `private_key`:
   ```typescript
   if (!serviceAccount.private_key) {
     throw new Error("Service account JSON missing private_key field");
   }
   ```

3. **Student fields** — guard `first_name` and `last_name`:
   ```typescript
   const studentFolderName = `Student_${sanitize(student.first_name || "Unknown")}_${sanitize(student.last_name || "Unknown")}`;
   ```

4. **Redeploy** the `sync-to-drive` edge function and test with a real student ID.

### Files changed
- `supabase/functions/sync-to-drive/index.ts` — add null safety throughout

