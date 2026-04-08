

# Fix: ELEVENLABS_API_KEY conține Agent ID în loc de API Key

## Problema

Ai introdus **Agent ID-ul** în câmpul `ELEVENLABS_API_KEY` în loc de cheia API reală. Edge function-ul `elevenlabs-agent-token` folosește `ELEVENLABS_API_KEY` pentru autentificare la ElevenLabs API — dacă acolo e un Agent ID, cererea eșuează.

## Ce trebuie făcut

1. **Actualizează secretul `ELEVENLABS_API_KEY`** cu cheia API reală de la ElevenLabs
   - Mergi la [ElevenLabs Dashboard → API Keys](https://elevenlabs.io/app/settings/api-keys)
   - Copiază cheia (începe de obicei cu `sk_...`)
   - O setăm ca valoare nouă pentru `ELEVENLABS_API_KEY`

2. **Verifică `ELEVENLABS_AGENT_ID`** — acesta trebuie să conțină Agent ID-ul (nu cheia API)

## Fișiere modificate

Niciun fișier nu trebuie modificat — doar secretele trebuie corectate.

## Detalii tehnice

- `ELEVENLABS_API_KEY` → se trimite în header-ul `xi-api-key` pentru autentificare
- `ELEVENLABS_AGENT_ID` → se trimite ca query parameter `agent_id` pentru a identifica agentul

