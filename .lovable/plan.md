

# Imagine dinamica OG pentru social preview — Card header cu avatar + "Agent certificat EduForYou"

## Problema
Imaginea de social preview apare taiata sau e doar bannerul generic. Utilizatorul vrea ca preview-ul sa arate ca header-ul cardului digital: gradient, poza de profil a agentului si textul "Agent certificat EduForYou".

## Solutie
Cream un **nou Edge Function** (`generate-og-card`) care genereaza dinamic o imagine PNG 1200x630 folosind Canvas API (disponibil in Deno via `jsr:@nicolo-ribaudo/2d-canvas@0.4.4`) cu:
- Background gradient (primary -> accent, ca pe card)
- Avatar-ul agentului (cerculet centrat)
- Numele agentului
- Textul "Agent certificat EduForYou"

Apoi actualizam `og-share` sa pointeze `og:image` catre acest nou endpoint in loc de bannerul static.

## Fisiere modificate

### 1. `supabase/functions/generate-og-card/index.ts` (NOU)
- Primeste `?slug=xxx` ca parametru
- Fetch-uieste din DB: `profiles.full_name`, `profiles.avatar_url`, `agent_card_settings.job_title`
- Genereaza pe Canvas o imagine 1200x630:
  - Gradient background (negru -> portocaliu, ca pe card)
  - Avatar circular centrat (fetch-uit si desenat pe canvas)
  - Sub avatar: numele agentului (bold, alb/negru)
  - Sub nume: "Agent certificat EduForYou" (portocaliu)
- Returneaza `image/png` cu cache headers
- Fallback: daca avatar-ul nu se poate incarca, deseneaza initialele

### 2. `supabase/functions/og-share/index.ts` (ACTUALIZAT)
- Schimba `ogImage` de la bannerul static la URL-ul dinamic:
  ```
  ogImage = `${SUPABASE_URL}/functions/v1/generate-og-card?slug=${slug}`
  ```
- Pastreaza fallback la bannerul static daca ceva nu merge

## Design imagine OG (1200x630)

```text
+--------------------------------------------------+
|  ████████████████████████████████████████████████  |
|  ██  gradient negru -> portocaliu               ██  |
|  ██                                             ██  |
|  ██              ┌──────────┐                   ██  |
|  ██              │  AVATAR  │                   ██  |
|  ██              │ (cercle) │                   ██  |
|  ██              └──────────┘                   ██  |
|  ██                                             ██  |
|  ██           Numele Agentului                  ██  |
|  ██      Agent certificat EduForYou             ██  |
|  ██                                             ██  |
|  ████████████████████████████████████████████████  |
+--------------------------------------------------+
```

## Detalii tehnice
- Canvas in Deno: folosim `jsr:@nicolo-ribaudo/2d-canvas` care suporta `createCanvas`, `loadImage` — compatibil cu Deno Deploy
- Alternativ, daca canvas nu e disponibil in Deno edge, generam un SVG inline convertit la PNG, sau folosim Lovable AI image generation (`google/gemini-3.1-flash-image-preview`) ca fallback
- Abordare pragmatica: **generam un SVG care returneaza direct** (Facebook accepta SVG ca og:image? Nu.) — deci cel mai sigur e sa generam PNG via canvas sau sa folosim AI image gen
- **Cea mai robusta abordare**: Folosim API-ul Lovable AI (`google/gemini-3.1-flash-image-preview`) din edge function pentru a genera imaginea branded, apoi o cache-uim in storage bucket `generated-images`. La request-uri ulterioare, servim din cache.

## Plan final (cel mai robust)

### Pas 1: `generate-og-card` Edge Function
- Check daca exista deja in `generated-images/og-cards/{slug}.png`
- Daca da, redirect 302 catre URL-ul public din storage
- Daca nu, genereaza imaginea:
  - Construieste un SVG 1200x630 cu gradient, avatar (embedded base64), nume, text "Agent certificat EduForYou"
  - Converteste SVG -> PNG folosind `resvg-wasm` (disponibil pe Deno) sau serveste SVG direct cu content-type image/svg+xml (mai simplu, dar Facebook nu accepta SVG)
  - **Varianta cea mai simpla si garantata**: construim HTML/inline-CSS si il convertim la imagine cu `resvg-wasm`, SAU generam imaginea cu Lovable AI
- Salveaza in storage bucket si returneaza imaginea

### Pas 2: `og-share/index.ts` — pointeaza og:image la noul endpoint

### Pas 3: Invalidare cache — cand agentul isi schimba avatarul sau setarile cardului, stergem `og-cards/{slug}.png` din storage (in `CardSettingsSection` save mutation si in `BrandedProfilePicture` upload)

## Impact
- Fara modificari de baza de date
- Fara impact pe auth
- Noul endpoint e public (fara JWT)
- Imaginile sunt cache-uite in storage pentru performanta

