

## Problemă

Organizația ta Google Cloud are politica `iam.disableServiceAccountKeyCreation` activă, ceea ce blochează generarea de JSON keys pentru service accounts. Edge function-ul `sync-to-drive` actual folosește exact acest tip de autentificare (service account JSON key).

## Soluție: Folosim Google Drive Connector

Lovable are un **Google Drive connector** integrat care gestionează autentificarea OAuth automat prin gateway. Nu mai ai nevoie de service account keys.

### Pași

**1. Conectare Google Drive connector**
- Conectăm connector-ul Google Drive la proiect
- Acesta va furniza automat `GOOGLE_DRIVE_API_KEY` și `LOVABLE_API_KEY` ca environment variables

**2. Rescrierea edge function `sync-to-drive`**
- Eliminăm complet logica de service account JWT signing (`getAccessToken`)
- Eliminăm dependența de `GOOGLE_DRIVE_SERVICE_ACCOUNT` secret
- Înlocuim toate apelurile directe către `https://www.googleapis.com/drive/v3/...` cu apeluri prin connector gateway: `https://connector-gateway.lovable.dev/google_drive/drive/v3/...`
- Toate request-urile vor folosi headerele:
  - `Authorization: Bearer ${LOVABLE_API_KEY}`
  - `X-Connection-Api-Key: ${GOOGLE_DRIVE_API_KEY}`
- Păstrăm logica existentă de folder hierarchy, upload, și PDF generation — doar transportul se schimbă

**3. Configurare folder root**
- `GOOGLE_DRIVE_ROOT_FOLDER_ID` rămâne necesar ca secret — ID-ul folderului root din Drive unde se salvează datele
- Dacă nu e setat, îl cerem

### Ce NU se schimbă
- Structura de foldere (Admin > Agent > Student)
- Tabelul `drive_folder_mappings`
- PDF-ul generat pentru profil student
- Logica de upload documente
- Client-side code (`src/lib/drive-sync.ts`)

### Risc
Scăzut — schimbăm doar mecanismul de autentificare, toată logica de business rămâne identică.

