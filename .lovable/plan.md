

# Plan: Organizare Optimă Documente Studenți în Lovable Cloud

## Ce avem acum
- Bucket `student-documents` (privat, securizat) — documentele sunt deja aici
- Structura: `{student_id}/{docType}_{timestamp}.ext` — fără organizare pe agent

## Ce îmbunătățim

### 1. Structură de foldere organizată
Schimbăm path-ul de stocare la: `{agent_name}_{agent_id}/{student_name}_{student_id}/{docType}_{timestamp}.ext`

Exemplu: `John_Smith_abc123/Maria_Garcia_def456/Passport_1711234567.pdf`

Așa, dacă vreodată exportezi bucket-ul, ai foldere clare pe agent > student.

### 2. Tabel `student_documents` pentru tracking metadata
În loc să ne bazăm doar pe Storage API (care nu păstrează metadata), creăm un tabel DB:

- `id` (uuid), `student_id` (uuid, FK), `agent_id` (uuid), `doc_type` (text), `file_name` (text — original), `file_path` (text — storage path), `file_size` (bigint), `uploaded_by` (uuid), `created_at`
- RLS: Agent=proprii studenți, Admin=echipă, Owner=toate

Beneficii: căutare, filtrare, raportare, nu pierzi niciodată track-ul documentelor chiar dacă Storage API are probleme.

### 3. Pagină centralizată documente (Owner/Admin)
Un nou tab sau secțiune în admin unde Owner-ul vede TOATE documentele din platformă, filtrate pe agent/student/tip document.

### 4. Storage RLS policies
Adăugăm politici pe bucket-ul `student-documents` pentru ca fiecare agent să acceseze doar documentele studenților proprii.

---

## Fișiere de modificat

- `supabase/migrations/xxx_student_documents.sql` — tabel nou + RLS + storage policies
- `src/pages/shared/StudentDetailPage.tsx` — upload/download/delete folosind noul tabel + path structurat
- `src/pages/owner/DocumentsPage.tsx` — pagină nouă centralizată
- `src/App.tsx` + `src/components/AppSidebar.tsx` — routing + nav

## Note
- Documentele existente rămân unde sunt (backward compatible)
- Noile documente vor folosi structura organizată
- Backup: Lovable Cloud are backup automat. Documentele sunt sigure.

