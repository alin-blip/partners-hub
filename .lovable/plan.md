

# Fix Student Visibility for Admin and Owner

## Problem Identified
After investigating the database, RLS policies, and queries:

1. **Owner visibility** -- RLS is correct (owner has full access). The owner CAN see all students and enrollments. The issue is likely a stale session or navigation confusion. However, to ensure clarity, I'll improve the Owner Dashboard to prominently show all students grouped by agent.

2. **Admin missing permissions** -- The admin can SEE team students but **cannot UPDATE** them. There's no `Admin updates team students` RLS policy. This means an admin can't change enrollment statuses or student details for their agents' students.

## Plan

### 1. Add missing RLS policies for Admin team management
- Add `Admin updates team students` -- allows admin to update students belonging to their agents
- Add `Admin updates team enrollments` already exists but verify it works correctly
- This ensures admins have full read/write control over their team's students

### 2. Improve Admin Dashboard -- show team students table
- Add a "Team Students" table to AdminDashboard showing all students from their agents
- Include columns: Student Name, Agent, Status (latest enrollment), Date Added
- Make rows clickable to navigate to student detail

### 3. Improve Owner Dashboard -- ensure students section is comprehensive
- The Owner Dashboard already queries all students, but the "Recent Enrollments" table is limited to 10
- Add a dedicated "All Students" summary section showing student count per agent with their enrollment statuses
- Ensure the Students page link is prominent

### Technical Details

**Migration SQL:**
```sql
-- Admin can update team students
CREATE POLICY "Admin updates team students" ON public.students
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') AND agent_id IN (
  SELECT id FROM profiles WHERE admin_id = auth.uid()
))
WITH CHECK (has_role(auth.uid(), 'admin') AND agent_id IN (
  SELECT id FROM profiles WHERE admin_id = auth.uid()
));
```

**Files to modify:**
- `supabase/migrations/` -- new migration for RLS policy
- `src/pages/admin/AdminDashboard.tsx` -- add team students table with agent names
- `src/pages/owner/OwnerDashboard.tsx` -- enhance students visibility section

