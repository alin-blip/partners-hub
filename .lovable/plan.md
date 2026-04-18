

User wants: agent sends a secure link to student → student opens link → uploads documents → docs appear directly in the student's profile in the platform. No more email back-and-forth.

This is similar to the existing **consent signing flow** (`consent_signing_tokens` + `/sign-consent/:token` page + `submit-consent-signature` edge function). I'll mirror that pattern for document uploads.

## Architecture (mirrors consent flow)

```text
Agent in StudentDocumentsTab
  └─► "Request Documents" button
        └─► creates row in student_document_requests (token, expires 7d)
              └─► copy link / send email to student
                    └─► Student opens /upload-documents/:token (public page)
                          └─► sees list of requested doc types
                          └─► drag/drop files
                                └─► submit-student-documents edge function
                                      ├─► validates token (service role)
                                      ├─► uploads to student-documents bucket
                                      └─► inserts into student_documents
                                            └─► docs appear in agent's view
```

## Database changes (1 new table)

`student_document_requests`:
- `id`, `token` (random hex), `student_id`, `agent_id`
- `requested_doc_types` (text[]) — e.g. `['Passport', 'Transcript', 'CV']`
- `message` (text, optional note from agent)
- `status` ('pending' | 'submitted' | 'expired')
- `expires_at` (default now + 14 days), `submitted_at`, `created_at`

RLS: agents/admins read/insert their own (mirrors `consent_signing_tokens`). Service role full access for validation.

## Edge functions (2 new)

1. **`validate-document-token`** (public, no JWT)
   - Input: `{ token }`
   - Returns: `{ status, studentName, requestedDocTypes, message, agentName }`

2. **`submit-student-documents`** (public, no JWT, service role)
   - Input: `{ token, files: [{ name, type, base64 }] }`
   - Validates token → uploads to `student-documents/${studentId}/...` → inserts `student_documents` rows → marks token `submitted` → triggers Drive sync

## Frontend changes

1. **New public page**: `src/pages/public/UploadDocumentsPage.tsx` (route `/upload-documents/:token`)
   - Brand header (EduForYou navy/gold)
   - Shows student name + agent name + requested doc types as a checklist
   - Drag/drop file uploader per doc type
   - Submit button → calls `submit-student-documents`
   - Success state with green check

2. **Add to `App.tsx`**: route `/upload-documents/:token` (public, like `/sign-consent/:token`)

3. **`StudentDocumentsTab.tsx`**: Add new "Request Documents" card/button
   - Dialog with checkboxes for doc types (Passport, Transcript, CV, Personal Statement, etc.)
   - Optional message textarea
   - Generates token → shows: copy link button + "Send via email" button
   - "Send via email" calls `send-transactional-email` with new template

4. **New email template**: `document-upload-request.tsx` (mirrors `consent-signing-link.tsx`)
   - Subject: "Please upload your documents — EduForYou UK"
   - Body: agent intro + list of requested docs + CTA button to upload page

## Files to create/modify

**New:**
- Migration: `student_document_requests` table + RLS
- `supabase/functions/validate-document-token/index.ts`
- `supabase/functions/submit-student-documents/index.ts`
- `supabase/functions/_shared/transactional-email-templates/document-upload-request.tsx`
- `src/pages/public/UploadDocumentsPage.tsx`

**Modified:**
- `src/App.tsx` — add public route
- `src/components/student-detail/StudentDocumentsTab.tsx` — add "Request Documents" button + dialog
- `supabase/functions/_shared/transactional-email-templates/registry.ts` — register new template

## Safety (live env, 44 agents)
- 100% additive — new table, new functions, new page, new button. Zero changes to existing flows.
- Reuses existing storage bucket + path convention `${studentId}/${filename}` (RLS-compatible).
- Auto-triggers Google Drive sync after upload (consistent with current behavior).
- Token expires after 14 days; one-time use (status flips to `submitted`).

