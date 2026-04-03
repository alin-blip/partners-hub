
Obiectiv: să nu mai apară preview gol când linkul cardului este pus pe Facebook/LinkedIn.

Plan recomandat

1. Schimbăm strategia pentru `og:image`
- Nu ne bazăm pe “screenshot live” al paginii React.
- Pentru social preview, folosim o imagine garantată și publică, servită direct din asset-uri publice.
- Varianta rapidă și stabilă: imagine generală branded pentru toate slug-urile.
- Varianta mai bună, ca pas 2: imagine dinamică branded per agent (avatar + nume + titlu), nu screenshot real al paginii.

2. Actualizăm `supabase/functions/og-share/index.ts`
- Setăm mereu un `og:image` valid, absolut, pe domeniul de producție.
- Folosim fallback către `https://agents-eduforyou.co.uk/images/eduforyou-facebook-banner.jpg`.
- Dacă există avatar agent și vrem să-l păstrăm, îl folosim doar dacă este valid; altfel fallback la bannerul general.
- Adăugăm și tag-uri suplimentare pentru compatibilitate:
  - `og:image:secure_url`
  - `og:image:type`
  - `og:image:width`
  - `og:image:height`
  - `og:image:alt`
  - `twitter:image`
- Fixăm și `og:url` / redirect-ul să folosească consistent domeniul public al cardului.

3. Păstrăm URL-ul de share prin `og-share`
- Linkul din card settings rămâne cel care trece prin `og-share?slug=...`.
- Asta este corect pentru crawlers și nu necesită schimbări de produs majore.

4. Opțional, după fixul rapid, facem varianta premium
- Adăugăm un endpoint de imagine OG dedicat per slug, care generează o imagine branded cu:
  - avatar agent
  - nume
  - job title
  - branding EduForYou
- `og-share` va ponta către acea imagine generată.
- Asta oferă “card digital în preview” fără să depindem de screenshot-uri reale ale UI-ului.

De ce nu recomand screenshot real al cardului
- Facebook nu “face screenshot” la SPA.
- Screenshot server-side per slug ar cere un mecanism de randare/headless browser și este mai fragil și mai greu de întreținut.
- O imagine OG statică sau generată este soluția standard și robustă pentru social preview.

Fișiere vizate
- `supabase/functions/og-share/index.ts`
- reutilizare asset existent: `public/images/eduforyou-facebook-banner.jpg`

Impact
- Fără modificări de bază de date.
- Fără impact pe auth sau flow-ul cardului.
- Preview-ul nu va mai depinde de avatar sau de execuția JS.

Detalii tehnice
- Fixul minim: banner general pentru toate cardurile.
- Fixul ideal în 2 faze:
  1. fallback general imediat
  2. imagine OG dinamică per agent

Rezultatul așteptat
- Când agentul pune linkul cardului pe Facebook/LinkedIn, preview-ul va afișa sigur o imagine branded, plus titlul și descrierea cardului.
- Dacă vrem, în pasul următor preview-ul poate arăta și numele/poza agentului într-un layout de tip card.
