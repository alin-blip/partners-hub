

# Fix: Imagine statică pentru preview-ul social pe /card/:slug

## Problema
Facebook crawlează `/card/:slug` și primește `index.html` cu o imagine OG care pointează la un URL Google Storage expirat. Rezultatul: preview gol sau generic.

## Soluția
Actualizăm `index.html` să folosească imaginea statică `eduforyou-facebook-banner.jpg` (care deja există în `public/images/`) cu URL-ul de producție. Astfel, ORICE pagină partajată pe Facebook (inclusiv `/card/:slug`) va afișa bannerul EduForYou.

Link-ul special de social media (og-share) rămâne funcțional pentru preview-uri personalizate cu avatar.

## Modificări

### 1. `index.html` — OG image corect
- Înlocuim URL-ul Google Storage expirat cu: `https://agents-eduforyou.co.uk/images/eduforyou-facebook-banner.jpg`
- Actualizăm atât `og:image` cât și `twitter:image`
- Dimensiuni corecte: 1200x630

### Detalii tehnice
- Imaginea `eduforyou-facebook-banner.jpg` (44KB) există deja în `public/images/`
- Schimbarea este doar în `index.html`, o singură linie per tag
- Nu sunt necesare modificări de bază de date sau edge functions
- Link-ul de social media personalizat (cu avatar) continuă să funcționeze separat

