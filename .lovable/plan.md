

# Revert CreateImagePage to Simple Form UI

## What's Changing
Remove the chat/conversation UI from CreateImagePage and restore a straightforward form-based layout: settings on top, generate button, image result below with save/share/modify actions. Keep all the backend prompt improvements (no "LOGO" text, no people, `rawImageUrl` for edits).

## UI Structure (restored)

```text
┌──────────────────────────────────────────┐
│ AI Image Studio          [5/5 remaining] │
├──────────────────────────────────────────┤
│ Settings Card                            │
│ ┌─ Format: [Post] [Story] [Flyer] [Ban]─┐│
│ │ Institution: [___]  Course: [___]     ││
│ │ [x] Include photo   Language: [RO]    ││
│ └────────────────────────────────────────┘│
│                                          │
│ Prompt textarea                          │
│ [Generate Image]                         │
│                                          │
│ ┌─ Result Card (if image) ──────────────┐│
│ │ [Image]                               ││
│ │ Generated text (copy)                 ││
│ │ [Save] [Modify] [Share buttons]       ││
│ │ Edit instruction input (if modifying) ││
│ └────────────────────────────────────────┘│
│                                          │
│ Gallery (unchanged)                      │
└──────────────────────────────────────────┘
```

## Key Behaviors
- **Generate**: Single button click, shows progress steps inline
- **Result**: Image displayed in a result card with Save/Share/Modify buttons
- **Modify**: Click "Modify" → shows an edit input below the image, sends `previousImageUrl` (raw Supabase URL) + `editInstruction` to the edge function
- **Auto-retry on 429**: Same logic, shows toast instead of chat messages
- **rawImageUrl tracking**: Keep storing the raw URL for edit mode

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/shared/CreateImagePage.tsx` | Full rewrite — replace chat UI with form-based layout. Keep all generation logic, branding compositing, gallery, and error handling. |

## What's NOT Changing
- Edge functions (prompt improvements stay)
- Gallery section
- SocialShareButtons usage
- Generation logic & retry handling
- Brand compositing pipeline

