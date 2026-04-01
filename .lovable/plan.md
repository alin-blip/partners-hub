

# Plan: Protejare documente la transfer + eliminare ștergere agent

## Ce se face

1. **RLS Migration** — Înlocuire `"Agent manages own documents" FOR ALL` cu două politici separate: `FOR SELECT` și `FOR INSERT` (fără UPDATE/DELETE pentru agenți)
2. **StudentDocumentsTab.tsx** — Eliminare buton "Cancel" pentru agenți (liniile 589-593) și logica de soft-delete din `handleDeleteDoc` (liniile 228-237)
3. **StudentEnrollmentsTab.tsx** — După transfer reușit, invalidare queries `["student-documents", studentId]` și `["student-documents-cancelled", studentId]`

## Detalii tehnice

### Migration SQL
```sql
DROP POLICY "Agent manages own documents" ON public.student_documents;

CREATE POLICY "Agent reads own documents"
  ON public.student_documents FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Agent inserts own documents"
  ON public.student_documents FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid());
```

### StudentDocumentsTab.tsx
- Ștergere bloc liniile 228-237 (agent cancel logic din `handleDeleteDoc`)
- Ștergere bloc liniile 589-593 (butonul Cancel din UI)

### StudentEnrollmentsTab.tsx
- În `handleTransfer`, după `qc.invalidateQueries(["student-enrollments"])`, adăugare:
  - `qc.invalidateQueries(["student-documents", studentId])`
  - `qc.invalidateQueries(["student-documents-cancelled", studentId])`

## Fișiere modificate
1. Nouă migrare SQL — RLS update
2. `src/components/student-detail/StudentDocumentsTab.tsx`
3. `src/components/student-detail/StudentEnrollmentsTab.tsx`

