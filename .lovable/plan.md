

## Security Audit: What Exists vs What's Missing

### Current Security Posture (What We Have)

| Area | Status | Details |
|------|--------|---------|
| Role-based access (RBAC) | ✅ Done | Owner/Admin/Agent roles via `user_roles` table + `has_role()` security definer |
| RLS on all tables | ✅ Done | Every table has role-appropriate policies |
| No public signup | ✅ Done | Accounts created only via `create-owner` edge function |
| Agent sees own data only | ✅ Done | RLS restricts agents to own students/enrollments |
| Admin sees team data | ✅ Done | Admin can see agents under their `admin_id` |
| Document delete protection | ✅ Done | Agent can only "cancel" (soft-delete); admin needs owner code to hard-delete |
| Student reassignment (owner only) | ✅ Done | Only owner can reassign students between agents |
| Export CSV restricted | ✅ Done | Only owner/admin see Export CSV button |
| Anti-copy (watermark, shortcuts) | ✅ Done | Email watermark, blocked Ctrl+P/C/U/S, disabled right-click |
| Status changes restricted | ✅ Done | Only owner/admin can change enrollment status (UI-level) |
| Commission visibility | ✅ Partial | Agents see their own commission card, not tier structure |
| Login tracking (XP) | ✅ Done | Daily login events recorded in `agent_xp_events` |

### Critical Gaps (What's Missing)

**Priority 1 — Data Integrity (Points 1, 2)**

Currently agents can edit ALL student fields (name, DOB, immigration status) after submission. No fields are locked. No RLS prevents agents from updating sensitive columns.

- **Need**: Lock sensitive fields (first_name, last_name, date_of_birth, immigration_status) for agents after student creation
- **Need**: Enrollment status workflow locks — agents can't move status backwards; certain statuses lock the enrollment entirely
- **Need**: Server-side enforcement via RLS UPDATE policies with column checks or a validation trigger

**Priority 2 — Audit Trail (Point 10)**

No `audit_log` table exists. Changes to students, enrollments, and documents are not tracked. If fraud occurs, there's no way to trace who did what.

- **Need**: `audit_log` table with: `user_id`, `action`, `table_name`, `record_id`, `old_values`, `new_values`, `created_at`
- **Need**: Database triggers on `students`, `enrollments`, `student_documents` that auto-log changes

**Priority 3 — Session Timeout (Point 12)**

No auto-logout on inactivity. An agent could walk away and someone else could access the system.

- **Need**: Client-side idle timer (e.g. 30 min inactivity → auto sign-out)
- **Need**: Warning dialog at 25 min before logout

**Priority 4 — Document Version History (Point 4)**

When a document is re-uploaded, the old version is overwritten with no history.

- **Need**: `version` column on `student_documents` + keep old versions with `is_current` flag
- **Need**: Upload log showing who uploaded what and when (partially covered by `created_at` + `uploaded_by`)

**Priority 5 — Agent Restrictions on Edit After Status (Point 2)**

No workflow control exists. An agent can currently edit a student even after "enrolled" status.

- **Need**: Check enrollment status before allowing student edits
- **Need**: Block student overview edits if any enrollment is in `enrolled`, `active` status (for agents)

### Implementation Plan

**Phase 1: Immediate Security (this session)**

1. **Create `audit_log` table** + database triggers on `students`, `enrollments`, `student_documents` to auto-record all INSERT/UPDATE/DELETE with old/new values and user ID

2. **Add idle timeout** to `AuthContext.tsx` — 30-minute inactivity timer with a 5-minute warning dialog, then auto sign-out

3. **Lock agent edits on sensitive fields** — In `StudentOverviewTab.tsx`, when role is `agent`, make `first_name`, `last_name`, `date_of_birth`, `immigration_status` read-only (non-editable). Only admin/owner can change these.

4. **Enrollment workflow locks** — In `StudentEnrollmentsTab.tsx` and the RLS/UI, prevent agents from changing status. Add UI locks: if enrollment status is `enrolled` or `active`, disable the edit button on student overview for agents.

5. **Remove agent access to Export CSV** — Already done (only owner/admin see it). Verify no other export paths exist.

**Phase 2: Enhanced (next session)**

6. Document version history table
7. 2FA setup via backend auth settings
8. Rate limiting on login attempts

### Technical Details

**Audit log trigger (SQL)**:
```text
audit_log table:
  id, user_id, action (INSERT/UPDATE/DELETE),
  table_name, record_id, old_values (jsonb),
  new_values (jsonb), ip_address, created_at

Triggers on: students, enrollments, student_documents, student_notes
Uses current_setting('request.jwt.claims') to extract user_id
```

**Idle timeout (AuthContext)**:
```text
- Track mouse/keyboard/touch events
- Reset 30-min timer on activity
- Show warning dialog at 25 min
- Call signOut() at 30 min
- Clean up event listeners on unmount
```

**Agent field locks (StudentOverviewTab)**:
```text
- When role === "agent" and editing:
  - first_name, last_name → disabled inputs
  - date_of_birth → disabled
  - immigration_status → disabled select
  - Show "(locked)" label next to disabled fields
```

**Enrollment workflow control**:
```text
- Agent cannot edit student if any enrollment status in
  [enrolled, active, rejected, withdrawn]
- Show "Student is locked" message instead of Edit button
```

