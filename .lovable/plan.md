

# Auto Welcome Message + Agent Messaging Fix

## Summary
Two changes in one:
1. **Fix**: Agent can only message their admin (from the previous plan — RLS policy + UI filter)
2. **New**: When an admin creates an agent, automatically create a direct conversation and send a welcome message ("Welcome to the team! Any questions, please ask here.")

## Changes

### 1. Database: RLS policy on `profiles` for agent→admin visibility
New SELECT policy so agents can see their admin's profile:
```sql
CREATE POLICY "Agent reads own admin profile" ON public.profiles
FOR SELECT TO authenticated
USING (id = (SELECT p.admin_id FROM public.profiles p WHERE p.id = auth.uid()));
```

### 2. UI: Filter agent recipients to only their admin
In `MessagesPage.tsx`, add agent-specific filtering in the `availableUsers` query (around line 117):
```typescript
if (role === "agent") {
  const { data: myProfile } = await supabase
    .from("profiles").select("admin_id").eq("id", user!.id).single();
  if (myProfile?.admin_id) {
    enriched = enriched.filter((u: any) => u.id === myProfile.admin_id);
  } else {
    enriched = [];
  }
}
```

### 3. Auto welcome message on agent creation
In `AdminAgentsPage.tsx`, after successful agent creation (`onSuccess`):
- Create a `direct_conversations` record between admin and the new agent
- Insert a welcome message from the admin: *"Welcome to the team! 🎉 If you have any questions, please ask here."*
- The new agent's ID comes from the `create-owner` edge function response (`data.user_id` or similar)

Need to check what the edge function returns:

```typescript
onSuccess: async (data) => {
  // Create conversation
  const { data: convo } = await supabase.from("direct_conversations").insert({
    participant_1: user!.id,
    participant_2: data.user_id,
  }).select().single();
  
  if (convo) {
    await supabase.from("direct_messages").insert({
      conversation_id: convo.id,
      sender_id: user!.id,
      content: "Welcome to the team! 🎉 If you have any questions, please ask here.",
    });
  }
  // ... existing cleanup
}
```

### Files to modify
1. **Migration** — new RLS policy on `profiles` (agent reads admin)
2. `src/pages/shared/MessagesPage.tsx` — agent filter for recipients
3. `src/pages/admin/AdminAgentsPage.tsx` — auto-create conversation + welcome message in `onSuccess`

