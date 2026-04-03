

# Deep Audit — Messaging Implementation Gaps

## Summary
After reviewing all related files, RLS policies, and data flows, I found **5 issues** — 2 functional bugs, 2 missing features, and 1 cosmetic gap.

---

## Issue 1: `direct_conversations` UPDATE silently fails for agents/admins (BUG)
**Impact: Medium — affects message ordering for 20+ agents**

In `MessagesPage.tsx` line 185, after sending a message:
```typescript
await supabase.from("direct_conversations").update({ updated_at: ... }).eq("id", activeConvo);
```
But the RLS policies on `direct_conversations` only grant:
- **SELECT** for participants
- **INSERT** for participants  
- **ALL** for owner only

There is **no UPDATE policy** for regular authenticated users. This means agents and admins silently fail to update `updated_at`, so conversations don't re-sort to the top after new messages.

**Fix**: Add an UPDATE policy allowing participants to update their own conversations.

---

## Issue 2: Owner creates agents without welcome conversation (MISSING)
**Impact: Low-Medium — inconsistent experience**

`AdminAgentsPage.tsx` correctly creates a welcome conversation when an admin creates an agent. But `owner/AgentsPage.tsx` line 73 `onSuccess` does **not** create any welcome conversation.

When the owner creates an agent (with an `admin_id` assigned), neither the owner nor the assigned admin gets a welcome conversation with that agent.

**Fix**: In `AgentsPage.tsx`, after successful creation, if the new user is an agent with an `admin_id`, create a welcome conversation between that admin and the agent. If no admin is assigned, create it between the owner and the new user.

---

## Issue 3: Agent can't see admin's role badge in New Conversation dialog (COSMETIC)
**Impact: Low — purely visual**

`user_roles` RLS only lets agents see:
- Their own role (`user_id = auth.uid()`)
- Owner roles (`role = 'owner'`)

So when the agent opens "New Conversation" and their admin appears, the role enrichment query returns nothing for the admin → shows as "unknown" role group instead of "Admins".

**Fix**: Add a `user_roles` SELECT policy: agents can read the role of their admin (using `get_my_admin_id()`).

---

## Issue 4: Admin can't see roles of their agents in New Conversation (COSMETIC)
**Impact: Low — purely visual, filtering still works via `admin_id`**

Same `user_roles` RLS issue: admins can only see their own role + owner roles. Their agents' roles return empty → grouped as "unknown" instead of "Agents" in the dialog.

**Fix**: Add a `user_roles` SELECT policy: admins can read roles of users whose `admin_id` matches them.

---

## Issue 5: Leads table — admin can't read team leads (EXISTING GAP)
**Impact: Not related to messaging — noting for awareness only**

`leads` RLS has no admin SELECT policy. Admins can't see their team's leads. This predates the messaging changes, just flagging it.

---

## Recommended Fix Priority

1. **Issue 1** (UPDATE policy on `direct_conversations`) — fixes sorting for all agents/admins, one migration
2. **Issue 2** (Welcome conversation from owner) — consistency, one file edit
3. **Issues 3+4** (Role badges) — cosmetic, one migration with 2 policies

## Files to modify
1. **New migration**: UPDATE policy on `direct_conversations` + two `user_roles` SELECT policies
2. `src/pages/owner/AgentsPage.tsx`: Add welcome conversation in `onSuccess`

## Live platform risk
All changes are additive (new policies, new UI logic). No existing permissions are modified or removed. Zero risk of regression for the 20+ active agents.

