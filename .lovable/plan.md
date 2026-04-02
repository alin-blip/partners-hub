

# Plan: Duplicate student prevention + Fix public application form

## Issue 1: Public application form silently fails
**Root cause**: The `leads` table anon INSERT policy contains a subquery: `agent_id IN (SELECT profiles.id FROM profiles WHERE profiles.is_active = true)`. However, the `profiles` table has **no anon SELECT policy**, so this subquery always returns zero rows for anonymous users, causing every public application insert to be silently rejected by RLS.

**Fix**: Create a database migration adding a **restricted anon SELECT policy** on `profiles` that only exposes `id` and `is_active` — just enough for the RLS subquery to work, without leaking sensitive data. The policy will be scoped: `FOR SELECT TO anon USING (is_active = true)`.

## Issue 2: Prevent duplicate students
**What counts as duplicate**: Same `email` (case-insensitive), OR same `first_name + last_name + date_of_birth` combo, regardless of which agent created them.

**Changes**:

### Database migration
- Add a unique index on `LOWER(email)` on the `students` table (partial, where email is not null)
- This prevents exact email duplicates at the DB level

### Frontend (both enrollment paths)
Before inserting into `students`, query for existing students matching the email OR (first_name + last_name + DOB). If found, show an error toast: "A student with this email/name already exists in the system. Please contact your admin or owner."

**Files modified**:
1. **Database migration** — anon SELECT on profiles + unique email index on students
2. **`src/components/EnrollStudentDialog.tsx`** — add duplicate check before insert
3. **`src/pages/agent/EnrollStudent.tsx`** — add same duplicate check before insert

### Duplicate check logic (added to both submit mutations)
```typescript
// Check duplicate by email
const { data: existingByEmail } = await supabase
  .from("students")
  .select("id")
  .ilike("email", email.trim())
  .limit(1);

// Check duplicate by name + DOB  
const { data: existingByName } = await supabase
  .from("students")
  .select("id")
  .ilike("first_name", firstName.trim())
  .ilike("last_name", lastName.trim())
  .eq("date_of_birth", dob)
  .limit(1);

if (existingByEmail?.length || existingByName?.length) {
  throw new Error("This student already exists in the system. Please contact your admin or owner.");
}
```

