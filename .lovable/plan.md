

# Add Lead Notifications — Bell + Sidebar Badge

## What changes

1. **Sidebar badge on Leads** — show count of "new" (unread) leads, same pattern as Messages and Tasks badges
2. **Notification bell** — include new leads in the notification dropdown so admins/agents see them alongside messages and tasks

## Technical plan

### 1. Sidebar lead badge (`src/components/AppSidebar.tsx`)
- Add a `useQuery` for `newLeadsCount` querying `leads` table where `status = 'new'`
- For agents: filter by `agent_id = user.id`
- Add `badge: newLeadsCount` to the Leads item in `mainItems`

### 2. Notification bell (`src/components/NotificationBell.tsx`)
- Add a 5th notification source: query `leads` where `status = 'new'`, ordered by `created_at desc`, limit 5
- For agents: filter by `agent_id = user.id`
- Fetch agent names for display
- Push items with type `"lead"`, title `"New lead: {name}"`, description with email/phone, link to `${prefix}/leads`
- Add `lead: "📥"` to the `typeIcon` map

### Files to modify
1. `src/components/AppSidebar.tsx` — add new leads count query + badge
2. `src/components/NotificationBell.tsx` — add leads as notification source

