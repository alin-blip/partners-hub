
## Ce se întâmplă acum

Sunt 2 probleme reale, separate:

1. `paid_by_university` există în UI, dar nu este permis în baza de date.
   - Am verificat migrarea `supabase/migrations/20260331094522_a0a8f3bc-1de2-4fce-be6e-7158a4e205a0.sql`
   - Constraint-ul `enrollments_status_check` permite doar:
     `applied, documents_pending, documents_submitted, processing, offer_received, accepted, funding, enrolled, active, rejected, withdrawn`
   - `paid_by_university` lipsește, de aceea apare eroarea:
     `violates check constraint enrollments_status_check`

2. Comisioanele nu apar “de la funding în jos” pentru că logica actuală le creează doar când `funding_status = approved`.
   - Funcția `create_commission_snapshot()` creează snapshot doar la:
     `IF NEW.funding_status = 'approved' ...`
   - Asta înseamnă că un enrollment aflat doar în status `funding` nu intră încă în `commission_snapshots`
   - Deci nu apare în `Commissions`, nici la agent, nici la admin

Mai este și un risc suplimentar:
- contextul backend spune că în prezent nu există trigger-uri active în DB, chiar dacă există migrare SQL pentru ele
- deci trebuie refăcute explicit în migrare

## Ce trebuie schimbat

### 1. Reparăm statusul `paid_by_university`
Voi face o migrare nouă care:
- șterge constraint-ul vechi `enrollments_status_check`
- îl recreează incluzând și `paid_by_university`

Asta rezolvă imediat eroarea când schimbi statusul din UI.

### 2. Clarificăm regula pentru apariția comisioanelor
Din mesajul tău, regula dorită este:
- comisioanele să apară din stadiul `funding` încolo, nu doar după `funding_status = approved`

Asta înseamnă că trebuie să schimbăm logica de snapshot astfel:

```text
Enrollment status:
funding / enrolled / active / paid_by_university
    -> apare în commissions

Funding status:
approved
    -> marchează eligibilitatea pentru payout 25%
```

Adică:
- snapshot-ul se creează mai devreme, când enrollment-ul intră în `funding` sau mai sus
- payout logic rămâne separată:
  - 25% când `funding_status = approved`
  - 75% când `status = paid_by_university`

### 3. Refacem trigger-ele lipsă
Voi include în aceeași reparație:
- `trg_commission_snapshot` pe `enrollments`
- `audit_commission_snapshots`
- `audit_commission_payments`

Ca să fim siguri că automatizarea chiar rulează.

## Implementare propusă

### Migrare nouă
Voi adăuga o migrare care face 3 lucruri:

1. Update la `enrollments_status_check`
2. Înlocuiește `create_commission_snapshot()` cu o versiune care:
   - creează snapshot când statusul intră în `funding`, `enrolled`, `active` sau `paid_by_university`
   - nu dublează snapshot-urile pentru același enrollment
   - setează:
     - `snapshot_status = pending_25` inițial
     - `snapshot_status = ready_full` dacă enrollment-ul ajunge la `paid_by_university`
3. Reface trigger-ele lipsă

### Ajustare logică snapshot
Voi muta regula de creare din:
- `funding_status = approved`

în:
- `status IN ('funding', 'enrolled', 'active', 'paid_by_university')`

și voi păstra separat:
- dacă `funding_status` devine `approved`, snapshot-ul rămâne eligibil pentru 25%
- dacă `status` devine `paid_by_university`, snapshot-ul trece la `ready_full`

### UI
Nu e nevoie de schimbări majore în UI pentru eroarea asta, pentru că:
- `paid_by_university` este deja prezent în:
  - `StudentEnrollmentsTab`
  - `EnrollmentsPage`
  - `StatusBadge`

Dar după repararea backend-ului, datele vor începe să apară corect și în:
- `CommissionsPage`
- `AgentDashboard`
- `AdminDashboard`

## Rezultat după implementare

După fix:

1. vei putea seta fără eroare:
   - `paid_by_university`

2. enrollment-urile vor apărea în Commissions din momentul în care ajung în:
   - `funding`
   - `enrolled`
   - `active`
   - `paid_by_university`

3. payout flow rămâne:
   - 25% la `funding_status = approved`
   - restul la `paid_by_university`

## Detaliu tehnic important

Acum există o nealiniere între:
- UI statuses
- DB check constraint
- trigger logic

Fixul corect trebuie să le alinieze pe toate 3 într-o singură iterație, altfel:
- ori UI permite un status pe care DB îl respinge
- ori DB îl acceptă dar comisioanele tot nu apar
- ori triggerul nu rulează deloc

## Ce voi implementa exact

1. Migrare pentru `enrollments_status_check` cu `paid_by_university`
2. Rescriere `create_commission_snapshot()` pentru apariție din `funding` în sus
3. Re-creare trigger `trg_commission_snapshot`
4. Re-creare triggere audit
5. Păstrarea logicii de tier approval existente

## Ce să verifici după implementare

```text
Test 1:
funding -> apare în Commissions

Test 2:
funding_status = approved -> snapshot rămâne eligibil pentru 25%

Test 3:
status = paid_by_university -> fără eroare + snapshot devine ready_full

Test 4:
agent și admin văd valorile în dashboardurile lor
```
