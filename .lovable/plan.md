

## Diagnostic: Google Drive Sync Failure

### Root Cause (from Edge Function Logs)

The `sync-to-drive` function crashes with:

```
SyntaxError: Unexpected token 'a', "agents-edu"... is not valid JSON
```

This occurs at `JSON.parse(serviceAccountJson)` — the `GOOGLE_DRIVE_SERVICE_ACCOUNT` secret contains an invalid value (starts with `"agents-edu..."` instead of a valid JSON object like `{"type": "service_account", ...}`).

**The documents ARE saved correctly to the database and storage** — only the Google Drive sync fails silently (it's called non-blocking via `syncToDrive()` without `await`).

### Fix Plan

| Step | What | Impact |
|------|-------|--------|
| 1 | **Re-set the `GOOGLE_DRIVE_SERVICE_ACCOUNT` secret** with the correct JSON content from Google Cloud Console | Fixes the root cause — no code changes needed |
| 2 | **Add error resilience** in the edge function: wrap `JSON.parse` in a try/catch with a clear error message | Better debugging in future |

### Step 1: Secret Fix (requires your action)
You need to provide the Google Drive service account JSON key file content. It should look like:
```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "...@...iam.gserviceaccount.com",
  ...
}
```

I will use the secrets tool to prompt you to re-enter it.

### Step 2: Code Improvement (minimal, safe)
In `supabase/functions/sync-to-drive/index.ts`, wrap the `JSON.parse` call to provide a clear error if the secret is malformed:

```typescript
let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
} catch {
  return new Response(
    JSON.stringify({ error: "GOOGLE_DRIVE_SERVICE_ACCOUNT is not valid JSON" }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

### Risk Assessment
- **Step 1**: Zero code changes, only secret update — no risk
- **Step 2**: Only adds a try/catch around an existing JSON.parse in the edge function — no impact on any other functionality

### What is NOT broken
- Student creation works correctly
- Document uploads to storage work correctly
- Consent PDF generation works correctly
- Only the Google Drive mirror/backup is affected

