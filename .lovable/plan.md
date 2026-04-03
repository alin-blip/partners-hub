

# Fix: Afișarea URL-ului corect pentru share în UI

## Problema
UI-ul din CardSettingsSection afișează URL-ul direct SPA (`agents-eduforyou.co.uk/card/slug`) ca text vizibil, iar butonul Copy copiază URL-ul og-share. Agentul a copiat manual textul vizibil pe Facebook, nu a folosit butonul Copy, așa că a lipit URL-ul SPA care nu are OG tags.

## Soluție
1. **`src/components/CardSettingsSection.tsx`** — Schimbă textul vizibil din `{cardUrl}` în `{ogCardUrl}` pe linia 249, astfel încât agentul vede și copiază mereu URL-ul care generează preview
2. Adaugă un label mic sub link: "Link optimizat pentru social media" ca să fie clar de ce URL-ul arată diferit
3. Păstrează QR code-ul cu `cardUrl` direct (fără proxy)

## Fișiere modificate
- `src/components/CardSettingsSection.tsx` — o singură modificare la linia 249

## Risc
Zero — doar schimbă ce text vede agentul în settings. Nu afectează funcționalitatea existentă.

