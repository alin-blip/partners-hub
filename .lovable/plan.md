

## Plan: Fix Enrollment "Submitting..." Hang

### Problem
When an agent submits a student enrollment via the dialog on the Students page, the button stays on "Submitting..." indefinitely with no error or success feedback.

### Root Cause (most likely)
The mutation in `EnrollStudentDialog.tsx` inserts a student with `.select("id").single()`. If the RLS policy allows the INSERT but the read-back via SELECT fails silently, `student` becomes `null`, and `student.id` on the enrollment insert throws a runtime error. The `toast.error()` call should show this, but it may not be visible or may be swallowed.

### Fix

**`src/components/EnrollStudentDialog.tsx`** — Improve error handling:
1. Add explicit null check after student insert: if `!student` throw a clear error ("Failed to create student record")
2. Add `console.error` in `onError` so we can see the actual failure in console logs
3. Wrap the entire `mutationFn` in a try-catch with `console.error` for any uncaught issues
4. Check for errors on the `student_documents` insert (currently ignoring errors)

This is a targeted debugging + hardening fix — 1 file changed.

### Technical Details
```typescript
// Key change: null-guard after insert
const { data: student, error: studentError } = await supabase
  .from("students").insert({...}).select("id").single();
if (studentError) throw studentError;
if (!student) throw new Error("Failed to create student — please try again");

// Key change: log errors for debugging
onError: (error: Error) => {
  console.error("Enrollment error:", error);
  toast.error(error.message);
},
```

