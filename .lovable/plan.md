

# Plan: Fix 3 Platform Issues

## Issue 1: Consent form not auto-sent after enrollment (UWTSD)
**Root cause**: After enrollment submission, the consent PDF is generated and saved, but no consent signing link is automatically emailed to the student. The agent must manually click "Email Link" in the Documents tab.

**Fix**: After successful enrollment in `EnrollStudent.tsx`, automatically create a consent token and email the signing link to the student (if they have an email). This happens in the `onSuccess` callback, after `generateAndUploadConsentPdf`.

**File**: `src/pages/agent/EnrollStudent.tsx` — add auto-send logic in `onSuccess` after enrollment.

---

## Issue 2: Documents disappear after application submitted
**Root cause**: The `student_documents` table has NO `cancelled_at` column, but the frontend queries filter with `.is("cancelled_at" as any, null)`. Because this column doesn't exist, the Supabase API returns an error (silently), resulting in an empty document list.

**Fix**:
1. **Database migration**: Add `cancelled_at` and `cancelled_by` columns to `student_documents`.
2. No frontend changes needed — the existing code already uses these columns correctly.

**File**: New database migration.

---

## Issue 3: Poster generation puts the raw prompt text on the image
**Root cause**: The `generate-image` edge function passes the user's prompt as `Content/Theme: ${prompt}`. The AI model interprets this literally and puts the exact text on the poster (e.g., "Fa-mi un poster pentru certhe în business").

**Fix**: Update the prompt in `generate-image/index.ts` to:
1. Instruct the AI that the prompt is a **creative brief/description**, NOT literal text to display
2. Tell it to generate appropriate, professional text based on the theme
3. Add explicit instruction: "Do NOT copy the user's prompt text onto the image. Create your own professional, relevant text."

**File**: `supabase/functions/generate-image/index.ts` — modify `fullPrompt` construction around line 78.

---

## Files modified
1. `src/pages/agent/EnrollStudent.tsx` — auto-send consent link after enrollment
2. `supabase/functions/generate-image/index.ts` — fix prompt to not echo user text
3. Database migration — add `cancelled_at`/`cancelled_by` columns to `student_documents`

