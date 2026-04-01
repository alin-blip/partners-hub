

# Audit Complet Pre-Lansare — EduForYou UK Agent Platform

---

## Rezumat Executiv

Scanarea de securitate a identificat **4 probleme critice (error)** si **7 avertizmente (warn)**. De asemenea, exista o eroare React in consola (ref pe Badge). Mai jos, fiecare problema este clasificata cu prioritate si solutie propusa.

---

## A. Probleme Critice (ERROR) — Necesita rezolvare inainte de lansare

### 1. Security Definer View (`public_agent_profiles`)
- **Problema**: View-ul ruleaza cu permisiunile creatorului, nu ale utilizatorului.
- **Fix**: Recrearea view-ului fara `SECURITY DEFINER`, sau cu `SECURITY INVOKER`.

### 2. Student Finance Forms — Agent ALL policy prea permisiva
- **Problema**: Politica `ALL` permite agentilor sa si stearga formularele financiare. Datele contin NI numbers, parole, share codes — date extrem de sensibile.
- **Fix**: Inlocuirea politicii `ALL` cu politici granulare (`SELECT`, `INSERT`, `UPDATE`). Eliminarea `DELETE` pentru agenti. Verificarea ca parolele nu sunt stocate in clar.

### 3. Profile expuse partenerilor de conversatie
- **Problema**: Oricine e intr-o conversatie poate citi telefonul, adresa si postcode-ul celuilalt.
- **Fix**: Crearea unui view `conversation_partner_view` cu doar `id`, `full_name`, `avatar_url`, `slug`. Inlocuirea politicii RLS cu acces la view in loc de tabela `profiles`.

### 4. Politici INSERT pe `students` aplicate rolului `{public}`
- **Problema**: Politicile INSERT/UPDATE pentru agenti si admini pe tabela `students` sunt pe rolul `public` in loc de `authenticated`, ceea ce teoretic permite acces fara autentificare.
- **Fix**: Modificarea tuturor politicilor relevante de pe `{public}` la `{authenticated}`.

---

## B. Avertizmente (WARN) — Recomandate pentru lansare

### 5. Leaked Password Protection dezactivata
- **Fix**: Activarea HIBP check din Cloud → Users → Auth Settings → Email → Password HIBP Check.

### 6. Generated-images bucket — upload fara verificare de ownership
- **Problema**: Orice utilizator autentificat poate uploada in folderul altui utilizator.
- **Fix**: Adaugarea conditiei `(storage.foldername(name))[1] = auth.uid()::text` in politica INSERT.

### 7. Realtime direct_messages — fara restrictie pe canal
- **Problema**: Orice utilizator autentificat poate asculta orice canal Realtime.
- **Impact**: Moderat — datele sunt filtrate de RLS la nivel Postgres, dar metadata canalului e vizibila.
- **Fix**: Adaugarea de politici RLS pe `realtime.messages` (necesita configurare avansata, poate fi amanata post-lansare).

### 8. Agent streaks vizibile pentru toti
- **Impact**: Scazut — intentionat pentru leaderboard. Acceptabil.

### 9. Consent tokens in clar
- **Impact**: Moderat — tokenurile sunt read-only de agentul creator. Riscul e limitat.
- **Fix post-lansare**: Hash-uirea tokenurilor stocate.

### 10. Email send log fara retentie
- **Impact**: Scazut — doar owner si service_role au acces.
- **Fix post-lansare**: Politica de retentie automata (DELETE dupa 90 zile).

### 11. Suppressed emails fara DELETE policy
- **Impact**: Scazut.
- **Fix post-lansare**: Adaugarea politicii DELETE pentru owner.

---

## C. Eroare React in Consola

- **Problema**: `UniversitiesCoursesPage` paseaza un `ref` catre `Badge` si `CourseDetailsInfoCard` care nu folosesc `forwardRef`.
- **Fix**: Adaugarea `React.forwardRef` pe componenta `CourseDetailsInfoCard`, sau eliminarea ref-ului.

---

## D. Verificari Suplimentare Confirmate OK

| Zona | Status |
|------|--------|
| RBAC (Owner/Admin/Agent) | OK — `user_roles` + `has_role()` security definer |
| Signup public blocat | OK — doar `create-owner` edge function |
| Idle timeout 30 min | OK — cu warning la 25 min |
| Rate limiting login | OK — 5 incercari/min, lockout 60s |
| Audit log + triggers | OK — INSERT/UPDATE/DELETE pe students, enrollments, documents, notes |
| Audit log protejat | OK — INSERT doar `service_role` |
| Agent field locks | OK — first_name, last_name, DOB, immigration_status blocate server-side (trigger) + UI |
| Enrollment workflow locks | OK — agentii nu pot edita daca enrollment e in status final |
| Anti-copy (watermark, shortcuts) | OK |
| Document versioning | OK — `version` + `is_current` pe `student_documents` |
| Consent extern functional | OK — `/sign-consent/:token` via Edge Functions |
| Domain live | OK — `agents-eduforyou.co.uk` |
| Export CSV restrictionat | OK — doar owner/admin |

---

## E. Plan de Implementare

### Inainte de lansare (Prioritate 1-4)

1. **Migratia SQL**: Modificarea politicilor RLS pe `students` de la `{public}` la `{authenticated}`
2. **Migratia SQL**: Splitarea politicii `ALL` pe `student_finance_forms` in SELECT + INSERT + UPDATE (fara DELETE pentru agenti)
3. **Migratia SQL**: Crearea view-ului `conversation_partner_view` si ajustarea politicii de profil
4. **Migratia SQL**: Recrearea view-ului `public_agent_profiles` ca `SECURITY INVOKER`
5. **Migratia SQL**: Adaugarea conditiei de ownership pe bucket-ul `generated-images`
6. **Activare HIBP**: Din interfata Cloud → Auth Settings
7. **Fix React warning**: `CourseDetailsInfoCard` forwardRef

### Post-lansare (Prioritate 5+)

8. Realtime channel restrictions
9. Token hashing pe consent_signing_tokens
10. Email log retention policy

---

## Estimare

- Fixuri pre-lansare: **5-6 migratii SQL + 1 fix React minor**
- Timp estimat: **~1 sesiune de implementare**
- Risc daca nu se rezolva: **Ridicat** pentru punctele 2-4 (date PII expuse/modificabile)

