
Obiectiv: când se distribuie orice link de tip `/card/:slug`, preview-ul să arate mereu imaginea încărcată de tine, nu avatarul agentului și nu bannerul vechi.

De ce încă nu e stabil:
- `/card/:slug` este o rută SPA, deci crawler-ele sociale văd în primul rând metadatele statice din `index.html`.
- `og-share` încă poate servi altă imagine pentru linkurile “social”.
- `AgentCardPage` injectează client-side `og:image` din avatar, ceea ce poate produce preview-uri inconsistente în unele aplicații.

Implementare propusă:
1. Adaug imaginea ta ca asset public nou, cu nume unic
- Copiez upload-ul în `public/images/` cu un nume nou, versionat, ca să evit cache-ul vechi al Facebook/LinkedIn.
- Nu suprascriu bannerul vechi.

2. Fac această imagine sursa unică de preview pentru toate cardurile
- Actualizez `index.html`:
  - `og:image`
  - `twitter:image`
  - `og:image:secure_url`
  - `og:image:type`
  - `og:image:width`
  - `og:image:height`
- Asta garantează că linkul direct `/card/:slug` va afișa aceeași imagine statică pentru oricine.

3. Aliniez și linkul “social media” la aceeași imagine
- Actualizez `supabase/functions/og-share/index.ts` ca, pentru share de card (fără `post`), să folosească exact aceeași imagine statică.
- Păstrez logica pentru `postId` doar la share-urile de postări sociale, dacă vrei ca postările să rămână cu preview-ul lor propriu.

4. Elimin conflictul din pagina publică a cardului
- Actualizez `src/pages/public/AgentCardPage.tsx` ca injectarea meta client-side să nu mai seteze `og:image` la avatar.
- O setez la aceeași imagine statică, ca preview-ul să fie consistent inclusiv în aplicațiile care execută parțial JS.

5. Corectez mesajele din UI
- În `src/components/CardSettingsSection.tsx` schimb textele care spun că preview-ul va afișa “poza ta și numele tău”.
- Mesajul nou va explica clar că toate cardurile folosesc preview-ul oficial EduForYou.

Fișiere vizate:
- `public/images/<nume-nou-versionat>.png`
- `index.html`
- `supabase/functions/og-share/index.ts`
- `src/pages/public/AgentCardPage.tsx`
- `src/components/CardSettingsSection.tsx`

Detalii tehnice importante:
- Nu folosesc `_redirects`; pe hostingul Lovable nu au efect.
- Pentru linkul direct `/card/:slug`, aceasta este soluția cea mai sigură: o imagine statică unică în head.
- Dacă imaginea ta nu are raportul ideal Open Graph, o pot publica exact așa cum este sau o pot centra într-o variantă OG-safe fără să schimb designul.

Verificare după implementare:
- Testez link direct `/card/:slug`
- Testez linkul “social media”
- Verific recrawl în Facebook Sharing Debugger și LinkedIn Post Inspector
- Confirm că apare exact imaginea nouă, nu avatarul, nu bannerul vechi și nu preview gol

Rezultat așteptat:
- Orice share pentru card va afișa aceeași imagine statică oficială EduForYou, indiferent dacă linkul e distribuit de agent, admin sau owner.
