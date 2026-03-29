

## Plan: Fix Storage Upload "Failed to fetch" Error

### Root Cause
The storage bucket `student-documents` has an RLS policy for agent uploads:
```sql
(storage.foldername(name))[1] IN (SELECT s.id::text FROM students s WHERE s.agent_id = auth.uid())
```
This expects the **first folder segment** to be the student ID. But the code creates paths like:
```
agentEmail_agentId/studentName_studentId/filename.ext
```
So `foldername[1]` = `agentEmail_agentId` which never matches any student ID → upload blocked by RLS.

### Fix
Update the RLS policies to use `foldername[2]` and extract just the UUID from the second folder segment (which contains `studentName_studentId`). OR simpler: change the file path structure in the code to put student ID first.

**Approach: Change file paths to `{studentId}/{filename}`** — simplest, matches existing policy.

### Files to Change

| File | Change |
|------|--------|
| `src/pages/agent/EnrollStudent.tsx` | Change storage paths from `agentFolder/studentFolder/file` to `studentId/file` (lines ~255, ~309) |
| `src/components/student-detail/StudentDocumentsTab.tsx` | Same path structure fix for document uploads |
| `src/components/EnrollStudentDialog.tsx` | Same path structure fix if it does uploads |
| `supabase/functions/generate-consent-pdf` | No change needed |

### Path Change
```
// Before:
`${agentName}_${agentId}/${studentName}_${studentId}/Consent_Form_${Date.now()}.pdf`

// After:
`${studentId}/Consent_Form_${Date.now()}.pdf`
```

This makes `foldername[1]` = student ID, matching the existing RLS policy.

### Note
The existing RLS policies for SELECT, DELETE also use `foldername[1]`, so this fix aligns all operations. The consent preview "Failed to fetch" would also be fixed since both preview and submission use the same upload path.

