

## Analiza Plan — Ce s-a implementat și ce a rămas

### BUGS — Status

| # | Issue | Status | Detalii |
|---|-------|--------|---------|
| 1 | Duplicate table headers in StudentEnrollmentsTab | **REZOLVAT** | Header-ul are acum 5 coloane corecte (University, Course, Status, Date, expand) |
| 2 | EnrollmentsPage missing statuses | **REZOLVAT** | STATUSES array are acum toate cele 11 statusuri |
| 3 | React ref warning in AIChatPanel | **NEREZOLVAT** | `AIChatPanel` nu folosește `forwardRef` |
| 4 | EnrollStudent route not registered | **REZOLVAT** | Rutele `/owner/enroll`, `/admin/enroll`, `/agent/enroll` sunt toate în App.tsx |
| 5 | Enrollments page rows not clickable | **REZOLVAT** | Rândurile au `onClick={() => navigate(...)}` și `cursor-pointer` |

### MISSING FEATURES — Status

| # | Feature | Status | Detalii |
|---|---------|--------|---------|
| 1 | Loading skeletons on tables | **PARȚIAL** | EnrollmentsPage are skeleton-uri. StudentsPage **NU** are (folosește doar empty state). LeadsPage — neverificat |
| 2 | Student edit from overview | **NEREZOLVAT** | Lipsește ghidaj vizual |
| 3 | Notification system (bell) | **NEREZOLVAT** | |
| 4 | Bulk actions | **NEREZOLVAT** | |
| 5 | Agent-to-student link in enrollments | **REZOLVAT** | (rezolvat prin Bug #5) |
| 6 | Dark mode toggle | **NEREZOLVAT** | |
| 7 | Admin CSV export | **REZOLVAT** | Condiția este `role === "owner" || role === "admin"` |
| 8 | Password visibility toggle | **NEREZOLVAT** | |
| 9 | Breadcrumbs | **NEREZOLVAT** | |
| 10 | Mobile table responsiveness | **NEREZOLVAT** | |

### FEATURE NOU — Social Post Sharing (brainstorm)

**Nicio implementare** — doar discuția inițială. Funcționalitatea de creare și distribuire a postărilor către agenți nu a fost începută.

---

## Plan de implementare — Etape rămase

### Faza 1: Bug-uri rămase (risc scăzut)

**1.1** Fix AIChatPanel ref warning — wrap component cu `forwardRef` sau restructurare Dialog usage.

### Faza 2: UX Improvements (risc scăzut-mediu)

**2.1** Loading skeletons pe StudentsPage și LeadsPage (la fel ca EnrollmentsPage)

**2.2** Mobile table scroll — wrap toate tabelele în `<div className="overflow-x-auto">`

**2.3** Password visibility toggle pe Login și ProfilePage

**2.4** Breadcrumbs pe StudentDetailPage (ex: Students > John Doe)

### Faza 3: Funcționalități medii

**3.1** Notification bell — dropdown în sidebar/header cu ultimele schimbări de status, mesaje noi, task-uri asignate. Fără tabel nou — agregare din tabelele existente (direct_messages, tasks, enrollments).

### Faza 4: Social Post Sharing (feature nou major)

Conceptul: Owner/Admin creează o postare (imagine + text) și o distribuie agenților selectați. Agenții o văd în platformă cu buton de Share care atașează automat link-ul cardului lor digital.

**4.1 Database** — Tabel nou `social_posts` (id, created_by, image_url, caption, target_role, created_at) + tabel `social_post_recipients` (id, post_id, agent_id, seen_at). RLS: owner vede tot, admin vede echipa, agent vede ce i s-a trimis.

**4.2 UI Owner/Admin** — Pagină/secțiune nouă "Social Posts" cu:
- Formular: upload imagine (sau selectare din galeria AI), câmp text pentru caption
- Selector destinatari: "Toți agenții" / "Echipa mea" / selectare individuală
- Buton "Publish"

**4.3 UI Agent** — Secțiune "Social Posts" în dashboard sau pagină dedicată:
- Feed cu postările primite (imagine + caption)
- Buton "Share" per postare care copiază caption + link card digital (`/card/:slug`)
- Dacă agentul nu are card digital creat, butonul arată "Create your card first" cu link spre `/agent/digital-card`

**4.4 Rute noi** — `/owner/social-posts`, `/admin/social-posts`, `/agent/social-posts` + link în sidebar

### Dependențe feature Social Posts
- Agentul trebuie să aibă `agent_card_settings` cu `is_public = true` și `slug` setat pentru ca link-ul să funcționeze
- Dacă nu are, UI-ul afișează un prompt de creare card, nu blochează vizualizarea postării

### Faza 5: Nice-to-have (post-lansare)
- Dark mode toggle
- Bulk actions pe tabele
- Student edit guidance (tooltips)

---

### Ordine recomandată

Fazele 1-2 sunt safe, fără risc de breaking changes. Faza 3 adaugă funcționalitate nouă dar folosește date existente. Faza 4 necesită tabel nou + UI nou — cel mai mare efort.

**Estimare**: Faza 1-2 = rapid (1 sesiune). Faza 3 = 1 sesiune. Faza 4 = 2-3 sesiuni.

