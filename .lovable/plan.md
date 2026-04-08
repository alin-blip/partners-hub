
Problema reală:
- Nu mai e eroare de provider sau de cheie API.
- Blocajul actual este la conexiunea audio: logurile arată `v1 RTC path not found` și apoi `could not establish pc connection`.

Do I know what the issue is?
- Da.
- Din ce se vede în cod și în lockfile:
  - `src/components/AIChatPanel.tsx` pornește corect sesiunea cu `conversationToken`
  - edge function-ul `elevenlabs-agent-token` pare să dea token valid
  - `bun.lock` rezolvă `livekit-client@2.18.1`
  - această versiune încearcă ruta `/rtc/v1`, iar aici asta produce exact eroarea din consolă

Fișiere implicate:
- `package.json`
- lockfile-ul activ (`bun.lock`, și doar dacă e nevoie `package-lock.json`)
- posibil un mic cleanup în `src/components/AIChatPanel.tsx`

Plan:
1. Voi fixa cauza de bază prin pin/override pentru `livekit-client` la o versiune compatibilă cu SDK-ul ElevenLabs folosit aici.
2. Voi actualiza rezolvarea dependențelor în lockfile, ca proiectul să nu mai încarce `2.18.1`.
3. Voi păstra pornirea sesiunii în forma simplă `startSession({ conversationToken })`, fără `overrides` și fără `connectionType`.
4. Voi curăța codul din `AIChatPanel.tsx` ca să nu mai folosească/deserializeze valori nefolosite (`systemPrompt`, `firstMessage`) și voi lăsa mesaje de eroare mai clare.
5. Voi verifica după fix că:
   - dispare `v1 RTC path not found`
   - dispare `could not establish pc connection`
   - butonul nu mai rămâne blocat pe „Se conectează…”

Detalii tehnice:
- Problema nu mai pare să fie în token, agent ID sau cheia API.
- Este foarte probabil un conflict de versiuni transitive între `@elevenlabs/react` și `livekit-client`.
- Soluția corectă este să repar compatibilitatea dependenței, nu să mai adaug încă un workaround în UI.
