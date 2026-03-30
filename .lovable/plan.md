

## Plan: Add ElevenLabs AI Voice Widget to Digital Card + Fix Romanian Text

Two changes: (1) add an ElevenLabs conversational AI widget to the public agent card page with a toggle in card settings, and (2) translate all remaining Romanian strings to English.

### 1. Database: Add `ai_voice_enabled` column to `agent_card_settings`

New boolean column `ai_voice_enabled` (default `false`) on `agent_card_settings`.

### 2. Card Settings UI (`CardSettingsSection.tsx`)

- Add state `aiVoiceEnabled` synced from settings
- Add a new section "AI Voice Assistant" with a Switch toggle and description explaining it enables an AI chatbot on the public card
- Include `ai_voice_enabled` in the save payload

### 3. Public Agent Card (`AgentCardPage.tsx`)

- Read `ai_voice_enabled` from the fetched card settings (already fetches `*`)
- When enabled, inject the ElevenLabs widget using the provided agent ID:
  - Load the script `https://elevenlabs.io/convai-widget/index.js` dynamically via `useEffect`
  - Render `<elevenlabs-convai agent-id="agent_4501kmytq1bnekgs59jh6rzjwxw4" />` at the bottom of the card
  - The widget is public (no API key needed client-side)

### 4. Translate Romanian strings to English

Files with Romanian text to fix:
| File | Romanian | English |
|------|----------|---------|
| `CardSettingsSection.tsx` | "Acest slug este deja folosit. Alege altul." | "This slug is already taken. Choose another." |
| `SocialShareButtons.tsx` | "Imagine salvată și text copiat!..." | "Image saved and text copied!..." |
| `AgentSocialFeedPage.tsx` | Same Romanian toasts | Same English translations |
| `BrandedProfilePicture.tsx` | "Descărcat!", "Imaginea de profil a fost salvată." | "Downloaded!", "Profile picture saved." |
| `FeedbackPage.tsx` | "Se încarcă...", "Niciun feedback încă." | "Loading...", "No feedback yet." |
| `SettingsPage.tsx` | "Studentul își alege programul..." placeholder | English equivalent |

### Files to Create/Edit

| File | Change |
|------|--------|
| Migration SQL | Add `ai_voice_enabled boolean default false` to `agent_card_settings` |
| `src/components/CardSettingsSection.tsx` | Add AI Voice toggle + fix Romanian |
| `src/pages/public/AgentCardPage.tsx` | Load ElevenLabs widget when enabled |
| `src/components/SocialShareButtons.tsx` | Translate Romanian toasts |
| `src/pages/shared/AgentSocialFeedPage.tsx` | Translate Romanian toasts |
| `src/components/BrandedProfilePicture.tsx` | Translate Romanian toast |
| `src/pages/owner/FeedbackPage.tsx` | Translate Romanian strings |
| `src/pages/owner/SettingsPage.tsx` | Translate Romanian placeholder |

