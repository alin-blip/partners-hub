

## Plan: Student Remote Consent Signing via External Link

### What We're Building

A system where agents can send a unique link to students. The student opens the link (no login required), sees the consent form, signs it (typed name + drawn signature), and the signed PDF is automatically saved to the student's documents folder.

### Architecture

```text
Agent clicks "Send Consent Link"
        │
        ▼
Edge function creates a signing token → stored in DB
        │
        ▼
Link sent to student (email or copied): /sign-consent/{token}
        │
        ▼
Student opens public page → sees consent clauses
        │
        ▼
Student types name + draws signature → submits
        │
        ▼
Edge function validates token, generates PDF, uploads to storage,
inserts student_documents record, marks token as used
```

### Steps

| # | What | Details |
|---|------|---------|
| 1 | **Create `consent_signing_tokens` table** | Migration: `id`, `token` (unique text), `student_id` (uuid), `agent_id` (uuid), `status` (pending/signed/expired), `created_at`, `signed_at`, `expires_at`. RLS: service_role full access, anon SELECT+UPDATE on own token. |
| 2 | **Create edge function `create-consent-token`** | Authenticated endpoint. Generates a crypto-random token, inserts into `consent_signing_tokens`, returns the signing URL. Optionally sends an email to the student with the link. |
| 3 | **Create edge function `submit-consent-signature`** | Public endpoint (anon). Accepts token + signature data + typed name. Validates token (not expired, not used). Calls `generate-consent-pdf` logic internally, uploads PDF to `student-documents` storage, inserts `student_documents` record, marks token as `signed`. |
| 4 | **Create public page `/sign-consent/:token`** | New React page. Fetches token info (student name, clauses). Shows consent clauses with checkboxes, typed name input, and `SignatureCanvas`. On submit, calls `submit-consent-signature`. Shows success/error states. No login required. |
| 5 | **Add "Send Consent Link" button** | In `StudentDocumentsTab` — new button that calls `create-consent-token`, shows the link (copyable), and optionally emails the student. |
| 6 | **Add route to App.tsx** | Public route: `/sign-consent/:token` |

### Database Table

```sql
CREATE TABLE public.consent_signing_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  student_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  signed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.consent_signing_tokens ENABLE ROW LEVEL SECURITY;

-- Agents/admins/owners can see tokens for their students
-- Service role has full access for edge functions
-- Anon can read pending tokens (for the public signing page)
```

### Public Signing Page UX

1. Page loads → fetches token details via edge function (returns student name, agent name, consent clauses, expiry status)
2. If token is expired or already signed → shows appropriate message
3. Student reads all clauses, checks each one, types full name, draws signature
4. Clicks "Sign & Submit" → edge function generates PDF, saves it, marks token used
5. Success screen: "Your consent form has been signed and saved. You may close this page."

### Files Changed

| File | Action |
|------|--------|
| Database migration | **New** — `consent_signing_tokens` table + RLS |
| `supabase/functions/create-consent-token/index.ts` | **New** — generates token, optionally emails student |
| `supabase/functions/submit-consent-signature/index.ts` | **New** — validates token, generates + saves PDF |
| `src/pages/public/SignConsentPage.tsx` | **New** — public signing page |
| `src/components/student-detail/StudentDocumentsTab.tsx` | Add "Send Consent Link" button |
| `src/App.tsx` | Add `/sign-consent/:token` route |

