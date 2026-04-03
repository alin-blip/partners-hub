

# Fix: Social media preview nu funcționează cu URL-ul direct

## Problema
Când postezi `https://agents-eduforyou.co.uk/card/dalina` pe Facebook, crawler-ul Facebook primește `index.html` cu metadata generică ("EduForYou UK – Agent Management Platform") pentru că aplicația este un SPA (Single Page Application) — nu poate servi OG tags dinamice fără server-side rendering.

Funcția `og-share` generează metadata corectă, dar doar dacă este accesată direct (prin URL-ul Supabase). Copy button-ul deja copiază acest URL, dar utilizatorii postează URL-ul direct.

## Soluția
Adăugăm un **`public/_redirects`** file care redirecționează crawler-ele sociale (Facebook, LinkedIn, Twitter, Telegram) de la `/card/:slug` către funcția `og-share`, iar utilizatorii normali primesc SPA-ul.

Dacă hosting-ul Lovable nu suportă `_redirects` (posibil), implementăm un **plan B**: afișăm clar în UI că link-ul de social media este cel copiat, și schimbăm QR-ul + link-ul vizibil la proxy URL.

## Modificări

### 1. `public/_redirects` (NOU) — încercare de redirect pentru crawlere
```
/card/:slug  https://wyvbfjyuhpnmceudgmrh.supabase.co/functions/v1/og-share?slug=:slug  200  conditions[User-Agent]=facebookexternalhit,Twitterbot,LinkedInBot,TelegramBot
/card/:slug  /index.html  200
```

### 2. `src/components/CardSettingsSection.tsx` — UI mai clar
- Afișăm **două link-uri separate**: 
  - "Link pentru social media" — afișează og-share URL cu label clar "Folosește acest link pe Facebook/LinkedIn"
  - "Link direct" — URL-ul normal pentru browser
- QR code-ul Digital Card pointează la `ogCardUrl` (nu `cardUrl`)
- Mesaj explicit: "Pentru Facebook/LinkedIn, copiază link-ul de social media"

### 3. `src/pages/shared/AgentSocialFeedPage.tsx` — sharing flow
- Verificăm că `handleShareForPlatform` folosește `ogCardUrl` nu `cardUrl`

## Detalii tehnice
- `_redirects` cu condiții User-Agent funcționează pe Netlify; pe Lovable hosting s-ar putea să nu fie suportat
- Dacă nu funcționează, Plan B (UI clar) este soluția garantată — utilizatorii vor ști exact ce link să copieze
- Nu sunt necesare modificări de bază de date

