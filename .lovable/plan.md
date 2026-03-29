

## Plan: Fix 2 Enrollment Errors + 2 Digital Card Errors

### Error 1: Enrollment "TypeError: Failed to fetch"

**Root cause**: The `generate-consent-pdf` edge function is being called with `signatureImage` (a data URL) but NOT with `signatureRgb`/`signatureWidth`/`signatureHeight`. The edge function's validation on line 133 requires at least one of `signature`, `signatureImage`, or `signatureRgb`. When `signatureImage` is provided, the function accepts it but doesn't actually use it to embed the image (only `signatureRgb` path embeds an image). However, the real problem is the edge function may be failing or the request payload with a large base64 data URL is too big.

**Fix**: In `EnrollStudent.tsx` `generateAndUploadConsentPdf`, use `extractSignatureRgb` to convert the signature canvas data URL to raw RGB before sending to the edge function. Send `signatureRgb`, `signatureWidth`, `signatureHeight` instead of `signatureImage`.

**File**: `src/pages/agent/EnrollStudent.tsx` (lines ~219-232)
- Import `extractSignatureRgb` from `@/lib/signature-utils`
- Before calling `generate-consent-pdf`, extract RGB from `signatureDataUrl`
- Pass `signatureRgb`, `signatureWidth`, `signatureHeight` in the body

### Error 2: Enrollment — same fix needed in EnrollStudentDialog

**File**: `src/components/EnrollStudentDialog.tsx`
- Same fix: use `extractSignatureRgb` before calling the edge function

### Error 3: Digital Card "duplicate key value violates unique constraint profiles_slug_key"

**Root cause**: When saving card settings, the code updates the profile's `slug` field. If the agent enters a slug that's already taken by another user, it throws a unique constraint violation. The code doesn't check for slug uniqueness before saving.

**Fix**: In `CardSettingsSection.tsx`, before updating the slug, check if it's already taken by another user. If so, show a user-friendly error "This slug is already taken."

**File**: `src/components/CardSettingsSection.tsx` (lines ~93-100)
- Add a uniqueness check: query profiles for slug match excluding current user
- If duplicate found, throw a descriptive error

### Files Changed

| File | Change |
|------|--------|
| `src/pages/agent/EnrollStudent.tsx` | Use `extractSignatureRgb` to send RGB data for consent PDF signature |
| `src/components/EnrollStudentDialog.tsx` | Same signature RGB fix |
| `src/components/CardSettingsSection.tsx` | Add slug uniqueness check before save |

