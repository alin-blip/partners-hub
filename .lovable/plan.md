
Goal: make the call actually speak in the language selected before starting, instead of staying in English.

What I found
- The language selector is being sent correctly from the UI: `body: JSON.stringify({ language: selectedLanguage })`.
- The backend receives it and builds a language-specific `systemPrompt`.
- But the call session only passes these overrides:
  - `prompt`
  - `firstMessage`
- It does not pass `agent.language`, so ElevenLabs can still keep the agent in its default language behavior.
- Also, for non-English languages, the current `firstMessage` is still written in English (“I’ll be speaking in Romanian”), which makes the first spoken reply English even when Romanian is selected.

Implementation plan

1. Pass the selected language as an explicit conversation override
- Update `src/components/AIChatPanel.tsx` so `startSession()` sends:
  - `agent.language: selectedLanguage`
  - alongside the existing `prompt` and `firstMessage`
- This is the main fix so the voice session respects the chosen language, not just the prompt text.

2. Localize the first spoken message
- Update `supabase/functions/elevenlabs-agent-token/index.ts` so `firstMessage` is actually generated in the selected language.
- Example behavior:
  - English selected → English greeting
  - Romanian selected → Romanian greeting
  - Spanish selected → Spanish greeting
- This avoids the session opening in English and then confusing the model.

3. Strengthen backend language instructions
- Make the system prompt stricter:
  - “You must speak and reply only in {languageName}.”
  - “Do not answer in English unless English is the selected language.”
- Keep the platform-data context exactly as it is now.

4. Improve the call UI feedback
- In `AIChatPanel.tsx`, show the active language more clearly before and during the call.
- Add a small helper note like “The assistant will speak in Romanian.”
- If needed, show a toast when the call starts confirming the chosen language.

5. Verify ElevenLabs override compatibility
- Ensure the session uses supported overrides consistently:
  - `agent.prompt`
  - `agent.firstMessage`
  - `agent.language`
- If your agent settings require it, make sure language overrides are allowed in the agent configuration, the same way prompt/first-message overrides had to be enabled.

Files to update
- `src/components/AIChatPanel.tsx`
- `supabase/functions/elevenlabs-agent-token/index.ts`

Expected result
- If you choose Romanian before the call, the greeting and the ongoing voice replies should be in Romanian.
- If you choose another language, both the greeting and the rest of the conversation should follow that language.
- The selected language should affect the live call itself, not only the text prompt behind the scenes.

Technical note
- Right now the app is doing “language by prompt only”.
- The fix is to do “language by prompt + explicit agent override + localized first utterance”.
- That combination is much more reliable for ElevenLabs conversational agents than prompt-only control.
