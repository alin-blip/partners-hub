

## Protecție Anti-Copiere pentru Platformă

### Realitate importantă
Protecția 100% este imposibilă pe web — un utilizator determinat poate ocoli orice măsură client-side. Dar putem adăuga **straturi de descurajare** care opresc copierea casuală.

### Ce implementăm

**1. Dezactivare Copy/Paste și Select pe conținut sensibil**
- `user-select: none` CSS pe zonele cu date (tabele studenți, detalii, documente)
- Blocare `Ctrl+C`, `Ctrl+A`, right-click context menu
- Păstrăm funcționalitatea în input-uri și formulare

**2. Blocare Print / Save as PDF**
- CSS `@media print` care ascunde tot conținutul și afișează un mesaj "Printing not allowed"
- Interceptare `Ctrl+P` / `Cmd+P`

**3. Watermark overlay**
- Overlay semi-transparent pe paginile autentificate cu email-ul utilizatorului logat
- Vizibil subtil pe ecran, dar apare clar în orice screenshot → identifică sursa scurgerii

**4. Dezactivare screenshot (limitat)**
- Nu putem bloca screenshot-ul nativ, dar putem:
  - Detecta `visibilitychange` și afișa un blur temporar
  - Adăuga CSS `-webkit-user-drag: none` pe imagini

### Fișiere modificate
- **`src/index.css`** — adăugare `@media print` blocker și `user-select: none` pe clase specifice
- **`src/components/DashboardLayout.tsx`** — adăugare watermark overlay cu email-ul userului + event listeners pentru keyboard shortcuts (Ctrl+P, Ctrl+C, Ctrl+U, F12)
- **`src/App.css`** — clase helper pentru protecție

### Ce NU putem face
- Blocarea screenshot-urilor native (OS-level)
- Blocarea extensiilor de browser
- Blocarea Developer Tools complet (putem doar descuraja)

### Abordare
Straturile combinate (no-select + no-print + watermark + shortcut blocking) creează o barieră suficientă pentru utilizatorii obișnuiți și fac orice scurgere trasabilă prin watermark.

