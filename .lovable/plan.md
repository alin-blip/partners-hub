
Goal: keep the 2 modes, make all panel text English, and fix Call Mode so it no longer depends on the failing WebRTC path.

What the actual issue is:
- The current Call Mode still starts with `conversationToken`, which makes the SDK try a WebRTC peer connection.
- Your logs show the real blocker: `v1 RTC path not found` / `could not establish pc connection`.
- The `ConversationProvider` error was fixed, but there is still a secondary integration problem: the provider is mounted in a way that triggers a React ref warning.
- The panel copy is still mixed Romanian/English, and the backend prompts still tell the AI to answer in the user’s language.

Implementation plan

1. Standardize everything to English
- Update all visible AI panel copy in `src/components/AIChatPanel.tsx`:
  - header labels
  - buttons
  - placeholders
  - history labels
  - quick actions
  - status texts
  - transcript labels
  - toast messages
  - avatar fallback labels (`YOU` instead of `TU`)
- Replace the Romanian default greeting and all Romanian UI strings.

2. Force English responses in both modes
- Update `supabase/functions/ai-chat/index.ts`:
  - remove the “respond in the same language the user writes in” rule
  - replace it with “always respond in English”
- Update `supabase/functions/elevenlabs-agent-token/index.ts` the same way.
- Change the call-mode first message to English as well.

3. Fix Call Mode by switching transport
- Keep Call Mode as live voice, but stop using the WebRTC token flow as the primary connection path.
- Change `supabase/functions/elevenlabs-agent-token/index.ts` to return a `signedUrl` from ElevenLabs `get-signed-url` instead of only returning a WebRTC token, or return both during transition.
- Update `src/components/AIChatPanel.tsx` so `startCall()` uses:
  - microphone permission
  - fetch signed URL
  - `startSession({ signedUrl })`
- This moves Call Mode away from the failing peer-connection path and uses the more compatible socket-based session.

4. Clean up the ElevenLabs React integration
- Keep `ConversationProvider`, but mount it on a stable wrapper element instead of directly around a plain function child that causes the ref warning.
- Refactor Call Mode to follow the SDK pattern more closely:
  - provider owns callbacks/options
  - call UI consumes state via `useConversation` or granular hooks
- Ensure call session ends when:
  - switching from Call to Text mode
  - closing the sheet
  - leaving the page

5. Make Call Mode UX clearer
- Keep the 2-mode toggle: `Text` and `Call`
- In Call Mode show English-only states:
  - `Ready to start`
  - `Connecting...`
  - `Listening...`
  - `Speaking...`
  - `Call ended`
- Keep live transcript in English UI, with clear `You` / `AI` labels.
- Show a specific failure toast if signed URL/session creation fails.

6. Keep Text Mode stable
- Leave the current text-to-text + TTS flow in place because it is already the reliable path.
- Only translate the UI and prompts to English.
- Keep history for text chats only; call transcript remains session-local unless you want it stored later.

Files to update
- `src/components/AIChatPanel.tsx`
- `supabase/functions/elevenlabs-agent-token/index.ts`
- `supabase/functions/ai-chat/index.ts`

Technical details
- Root-cause fix: replace WebRTC-first call startup with signed-URL session startup.
- Secondary fix: remove the provider/ref warning by adjusting the provider subtree structure.
- No database changes needed.
- No auth changes needed.
- Package changes should be minimal; if signed URL flow works cleanly, no extra dependency churn is needed.

Validation after implementation
- Open AI panel and confirm every visible label is English.
- Text Mode:
  - send a message in Romanian and confirm reply still comes back in English
  - confirm transcript + voice still work
- Call Mode:
  - click Start Call
  - confirm mic permission prompt appears
  - confirm status reaches `Listening...` instead of failing at peer connection
  - confirm live transcript updates in English UI
  - confirm End Call fully disconnects
- Confirm console no longer shows the provider/ref warning and no longer hits the `v1 RTC path not found` flow.
