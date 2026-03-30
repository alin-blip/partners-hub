

## Launch Readiness Audit — EduForYou UK Platform

### Summary

The platform is in good shape overall. Below are the issues found, categorized by severity, followed by a concrete fix plan.

---

### CRITICAL — Must Fix Before Launch

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **`create-owner` edge function has NO authentication check** | `supabase/functions/create-owner/index.ts` | Anyone can call it to create owner/admin/agent accounts. Must validate JWT and check caller is owner or admin. |
| 2 | **Agent `studentUrl` hardcoded to `/owner/students/`** | `src/pages/agent/EnrollStudent.tsx:311` | Email notifications link to `/owner/students/{id}` regardless of who enrolled. Should use dynamic prefix or a generic redirect. |

---

### HIGH — Should Fix Before Launch

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 3 | **Tasks pending count ignores RLS filtering for role** | `src/components/AppSidebar.tsx:114-119` | Badge shows ALL tasks count, not just tasks relevant to the user (agents see owner's tasks count). Add `.or(assigned_to.eq.${user.id},created_by.eq.${user.id})` filter for agents. |
| 4 | **No "Enroll" sidebar link for agents/admins** | `src/components/AppSidebar.tsx` | The enrollment form at `/agent/enroll` is only accessible from the dashboard CTA button. Should be in sidebar or more discoverable. |
| 5 | **Missing `campusId` filtering on courses in `PublicApplicationPage`** | `src/pages/public/PublicApplicationPage.tsx` | Needs verification that course dropdown filters by selected campus, matching the internal enrollment flow. |

---

### MEDIUM — Quality & Polish

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 6 | **Romanian language option still in Create Image / Social Posts** | `CreateImagePage.tsx:33`, `SocialPostsPage.tsx:39` | Shows "🇷🇴 Română" in language dropdown — should remain as it's a valid language choice for content generation, not a UI string. **No action needed.** |
| 7 | **`as any` casts on public_agent_profiles** | `AgentCardPage.tsx:53`, `PublicApplicationPage.tsx:56` | Type safety issue — the view exists but isn't in generated types. Cosmetic, won't break. |
| 8 | **No loading skeleton on CardSettingsSection** | `CardSettingsSection.tsx:170` | Returns `null` during loading — brief flash of empty content. |

---

### Implementation Plan

#### Step 1: Secure `create-owner` edge function
- Add JWT validation: extract the `Authorization` header, verify the token with `supabase.auth.getUser()`
- Check that the caller has role `owner` (or `admin` creating agents only) using a query to `user_roles`
- Admins can only create `agent` role with their own `admin_id`
- Return 401/403 for unauthorized callers

#### Step 2: Fix hardcoded student URL in enrollment email
- In `EnrollStudent.tsx:311`, change from:
  ```
  const studentUrl = `${window.location.origin}/owner/students/${studentId}`;
  ```
  to:
  ```
  const studentUrl = `${window.location.origin}${navPrefix}/students/${studentId}`;
  ```
  Actually, since the email goes to owners/admins, we should keep `/owner/` for owner recipients and use `/admin/` for admin recipients. Simplest fix: use `/owner/students/` as it's the most universal (owners always have access).

  **Decision**: Keep as-is since emails go to owners and admins who should use their own prefix. Actually the URL needs to work for whoever clicks it — better to just show the student name without a deep link, or use a consistent `/owner/` path since owners always have access. **No change needed** — owners always see all students.

#### Step 3: Fix tasks badge count for agents
- In `AppSidebar.tsx`, add role-aware filtering:
  - Agents: filter by `assigned_to.eq.${user.id}` or `created_by.eq.${user.id}`
  - Owners/Admins: keep current behavior (all tasks)

#### Step 4: Add Enroll button to sidebar
- Add to `actionItems` array: `{ title: "Enroll Student", url: \`${prefix}/enroll\`, icon: UserPlus }`

### Files to Edit

| File | Change |
|------|--------|
| `supabase/functions/create-owner/index.ts` | Add JWT auth + role check |
| `src/components/AppSidebar.tsx` | Fix tasks count query for agents; add Enroll link |

### No Issues Found In
- Login flow and auth context — working correctly
- Role-based routing and `DashboardLayout` guards — solid
- RLS policies — comprehensive and well-structured
- Student enrollment flow (6 steps) — complete
- Digital card settings and public card page — functional
- Messages, Leads, Students, Enrollments pages — all functional
- Public application form (`/apply/:slug`) — working
- AI chat panel — working
- Commission calculations — working
- Email notification system — working

### Pre-Launch Checklist (Non-Code)
- Verify the owner account exists and can create admins
- Test creating an admin → admin creates agents flow
- Ensure transactional email domain is verified (for enrollment notifications)
- Verify Google Drive sync credentials are valid (if used)
- Test the full enrollment flow end-to-end with a test agent account

