

# Comisioane calculate pe Intake (nu global pe agent)

## Ce se schimbă

Acum tier-ul se aplică pe numărul total de studenți ai agentului. Cerința: tier-ul și comisionul se calculează **per intake** — un agent cu 3 studenți pe Intake A și 4 pe Intake B nu are 7 studenți pentru tier, ci 3 și 4 separat.

## Modificări necesare

### 1. Migrare DB — Rescriere `create_commission_snapshot()`

Funcția trigger trebuie modificată astfel:
- Când numără studenții pentru tier matching, filtrează și pe `intake_id` (din enrollment-ul curent)
- Contorizarea: `WHERE s.agent_id = _agent_id AND e.intake_id = NEW.intake_id AND e.university_id = _uni_id AND e.status IN (...)`
- Tier upgrade detection: compară per intake, nu global
- Admin rate counting: tot per intake

Același principiu pentru toate cele 3 priorități (uni tiers, uni commission, global tiers).

### 2. Frontend — CommissionsPage.tsx

- Grupare snapshots per agent + per intake (nu doar per agent)
- Afișare breakdown pe intake în tabelul expandat
- Eligibilitatea 25% (5+ studenți) se calculează per intake
- Fetch intake info din enrollments join (adăugăm `intakes(label)` la query-ul de snapshots)

### 3. Frontend — AgentDashboard.tsx

- `qualifiesFor25` trebuie calculat per intake, nu pe total snapshots
- Groupare snapshots pe intake_id, verificare 5+ per fiecare

### 4. Frontend — AdminDashboard.tsx

- Similar: commission summary per intake

### 5. Lib — commissions.ts

- `calcCommission` și `calcCommissionByEnrollments` primesc intake_id ca parametru de grupare
- `buildUniversityBreakdown` devine `buildIntakeBreakdown` sau adaugă intake dimension

## Detalii tehnice

### DB function changes (pseudo-SQL)
```sql
-- Instead of counting all agent enrollments:
SELECT count(*) INTO _count 
FROM enrollments e JOIN students s ON e.student_id = s.id
WHERE s.agent_id = _agent_id 
  AND e.university_id = _uni_id
  AND e.intake_id = NEW.intake_id  -- NEW: filter by intake
  AND e.status IN ('funding','enrolled','active','paid_by_university');
```

### Commission snapshot table
- Nu necesită coloane noi — deja are `enrollment_id` care linkuieste la `enrollments.intake_id`
- Query-urile frontend pot join-ui `enrollments.intake_id → intakes.label`

### UI changes
- CommissionsPage: snapshots grouped by `agent → intake`, eligibility shown per intake
- Expanded row shows intake label alongside university
- "5+ needed" badge shown per intake group

## Pași de implementare

1. **Migrare SQL**: Rescriere `create_commission_snapshot()` cu logică per-intake
2. **CommissionsPage.tsx**: Query include `intakes(label)`, groupare per intake, UI breakdown
3. **AgentDashboard.tsx**: Eligibilitate per intake
4. **AdminDashboard.tsx**: Commission totals per intake
5. **commissions.ts**: Update utility functions pentru intake grouping

## Verificare

```text
Test 1: Agent cu 3 studenți pe Intake A, 4 pe Intake B → tier Starter (nu Silver)
Test 2: Agent cu 5+ studenți pe un singur intake → qualifies for 25% pe acel intake
Test 3: CommissionsPage afișează breakdown pe intake
Test 4: Snapshot-urile noi folosesc rate calculat per intake
```

