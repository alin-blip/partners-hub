

## Plan

### Part 1: Consent Form — Already Complete

The consent form changes were **fully applied** before you hit stop. All three files have:
- `DEFAULT_MARKETING_CHECKS` as initial state for `marketingChecks`
- `disabled={!!opt.required}` on the checkboxes
- Guard `if (opt.required) return;` in `onCheckedChange`
- `consent-clauses.ts` has `required: true` on the three mandatory options

No further changes needed here.

### Part 2: Google Drive Sync via Connector

No Google Drive connector exists in the workspace. We need to connect one.

**Step 1: Connect Google Drive connector**
- Use the Google Drive connector integration
- This will provide `GOOGLE_DRIVE_API_KEY` and use `LOVABLE_API_KEY` for gateway auth

**Step 2: Rewrite `supabase/functions/sync-to-drive/index.ts`**
- Remove the `getAccessToken()` service account JWT logic entirely
- Remove dependency on `GOOGLE_DRIVE_SERVICE_ACCOUNT` secret
- Replace all direct `googleapis.com/drive/v3/...` calls with connector gateway calls: `https://connector-gateway.lovable.dev/google_drive/drive/v3/...`
- Use headers: `Authorization: Bearer ${LOVABLE_API_KEY}` and `X-Connection-Api-Key: ${GOOGLE_DRIVE_API_KEY}`
- Keep all existing business logic (folder hierarchy, PDF generation, uploads) unchanged

**Step 3: Set root folder ID**
- Keep `GOOGLE_DRIVE_ROOT_FOLDER_ID` secret set to `1witaIRQ2JsWQM5_JAsjEbJEYJ-MXecvP`

### What stays the same
- Folder structure (Admin > Agent > Student)
- `drive_folder_mappings` table
- Student summary PDF generation
- Document upload logic
- Client-side `src/lib/drive-sync.ts`

