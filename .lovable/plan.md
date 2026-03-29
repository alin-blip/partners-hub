

## Plan: Backup automat pe Google Drive

### Structura folderelor in Drive

```text
EduForYou Backup (root folder shared)
├── Admin_NumeAdmin/
│   ├── Agent_NumeAgent1/
│   │   ├── Student_NumePrenume1/
│   │   │   ├── Student_Profile.pdf       (toate detaliile)
│   │   │   ├── Passport_1234.pdf         (documente uploadate)
│   │   │   ├── Consent_Form_5678.pdf
│   │   │   └── Transcript_9012.pdf
│   │   └── Student_NumePrenume2/
│   └── Agent_NumeAgent2/
└── Agent_FaraAdmin/              (agenți fără admin)
    └── Student_X/
```

### Cerințe

Google Drive API necesită un **Service Account** (cont de serviciu Google). Nu există un connector Google Drive disponibil în Lovable, deci trebuie configurare manuală:

1. Creezi un **Service Account** în Google Cloud Console
2. Partajezi folderul root din Drive cu email-ul service account-ului
3. Adaugi cheia JSON ca secret în proiect

### Ce se implementează

#### 1. Edge Function `sync-to-drive`
- Primește acțiunea (student_created, document_uploaded, enrollment_updated)
- Creează automat ierarhia de foldere dacă nu există (Admin → Agent → Student)
- Generează un PDF sumar cu toate detaliile studentului (date personale, enrollments, funding, note)
- Uploadează PDF-ul sumar + copiază documentele existente
- Stochează mapping-urile folder ID-uri într-un tabel `drive_folder_mappings`

#### 2. Tabel nou: `drive_folder_mappings`
- Coloane: `id`, `entity_type` (admin/agent/student), `entity_id`, `drive_folder_id`, `created_at`
- Evită recrearea folderelor la fiecare sync

#### 3. Trigger-e automate (apeluri din frontend)
- La **crearea unui student** → creează folderul + generează PDF
- La **upload document** → copiază fișierul în Drive
- La **schimbare status enrollment** → regenerează PDF sumar
- La **re-generare consent** → uploadează noul consent în Drive

#### 4. PDF Sumar Student
Generat cu reportlab/edge function, include:
- Date personale (nume, DOB, naționalitate, adresă, NI, share code)
- Enrollment-uri (universitate, curs, status, funding)
- Note importante
- Lista documentelor uploadate

### Pași de setup pentru tine (user)

1. **Google Cloud Console** → Creează un proiect → Activează Google Drive API
2. **Service Account** → Creează un service account → Descarcă cheia JSON
3. **Google Drive** → Partajează folderul root cu email-ul service account-ului (Editor access)
4. **Lovable** → Adaugă secretul `GOOGLE_DRIVE_SERVICE_ACCOUNT` cu conținutul JSON

### Fișiere modificate/create

| Fișier | Schimbare |
|--------|-----------|
| `supabase/functions/sync-to-drive/index.ts` | Edge function nouă — logica Drive API |
| Migration nouă | Tabel `drive_folder_mappings` |
| `src/components/student-detail/StudentDocumentsTab.tsx` | Apel sync după upload/consent |
| `src/pages/agent/EnrollStudent.tsx` | Apel sync după creare student |
| `src/components/EnrollStudentDialog.tsx` | Apel sync după creare student |

### Limitări
- Google Drive API are limită de 300 requests/min per user — suficient pentru usage normal
- PDF-ul sumar se regenerează la fiecare schimbare, nu doar append

