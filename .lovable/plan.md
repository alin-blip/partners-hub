

# Fix: Show Both Participants in Conversation List for Owner

## Problem
The owner sees ALL conversations (including between other users) due to RLS policy. But the UI only shows one name via `getOtherParticipant()` — which picks the participant that isn't the current user. When the owner isn't a participant in a conversation, this logic shows only `participant_1` (e.g., "Dalina") for every conversation, making it impossible to distinguish them.

## Solution

Update `MessagesPage.tsx` conversation list to show both participants when the current user is not part of the conversation:

1. **Conversation list item**: Show "Dalina → Agent Name" format when the owner is viewing a conversation they're not part of. When the owner IS a participant, show only the other person's name (current behavior).

2. **Chat header**: Same logic — show both names when the owner is observing someone else's conversation.

3. **Helper function change**:
   - Add `isMyConversation(convo)` check: `convo.participant_1 === user.id || convo.participant_2 === user.id`
   - When not the owner's own conversation: display `"${p1.full_name} ↔ ${p2.full_name}"`
   - When it is the owner's conversation: keep current single-name display

## Files to modify

| File | Change |
|------|--------|
| `src/pages/shared/MessagesPage.tsx` | Update conversation list rendering and header to show both participants for non-own conversations |

## UI example
```text
Current:          After:
Dalina            Dalina ↔ John Smith
Dalina            Dalina ↔ Maria Pop  
Dalina            Dalina (own conversation - unchanged)
```

