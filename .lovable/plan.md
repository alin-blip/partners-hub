

## Plan: Enhanced Student Communication & Status Management

### What you get
The existing **Notes** tab on the student detail page already supports notes, document requests, and funding updates. We'll enhance it into a proper communication hub where owner/admin can:

1. **Send action requests to agents** — new note types: "status_update_request", "info_request", "action_required"
2. **Quick-set enrollment status** directly from the Notes tab — a compact status changer at the top without switching to the Enrollments tab
3. **Note visibility control** — mark notes as urgent/priority so they stand out
4. **Agent sees requests highlighted** — urgent requests show with a red/orange indicator

### Changes

**`src/components/student-detail/StudentNotesTab.tsx`**:
- Add new note types for owner/admin: `info_request` (request info from agent), `action_required` (ask agent to do something), `status_update` (log a status change with context)
- Add a priority/urgent toggle for owner/admin notes — saves to a new column or uses styling based on note_type
- Show a quick enrollment status selector at the top of the Notes tab (for owner/admin only) so they can change status and auto-log a "status_change" note in one action
- Style action_required and info_request notes with stronger visual indicators (orange/red borders)

**Database migration** — add `is_urgent` boolean column to `student_notes`:
```sql
ALTER TABLE public.student_notes ADD COLUMN is_urgent boolean NOT NULL DEFAULT false;
```

**`src/components/student-detail/StudentNotesTab.tsx`** detailed changes:
- New note types in `NOTE_TYPE_CONFIG`: `info_request`, `action_required`, `status_update`
- Quick status changer: dropdown with current enrollment status + "Update & Log" button that updates enrollment status AND creates a status_change note simultaneously
- Urgent toggle (checkbox/switch) for owner/admin when creating notes
- Urgent notes render with orange-left-border and a small "URGENT" badge

### No new tables — reuses existing `student_notes` + `enrollments`

### Files to modify
- New migration — add `is_urgent` to `student_notes`
- `src/components/student-detail/StudentNotesTab.tsx` — new note types, quick status changer, urgent toggle, enhanced styling

