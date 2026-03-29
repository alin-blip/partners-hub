

## Comparație: Consent Form actual vs. PDF-ul uploadat

### Ce avem acum (5 clauze simple)
1. Data Processing Consent
2. Document Sharing Consent
3. Communication Consent
4. Student Finance Consent
5. Declaration of Accuracy

### Ce cere noul PDF (13 secțiuni complete)
1. Role and Purpose
2. Student Responsibilities (5 bullet points)
3. EduForYou Responsibilities (4 bullet points)
4. Authorisation
5. Data Protection (UK GDPR)
6. No Guarantee Clause
7. Commission Disclosure
8. Limitation of Liability
9. Document Authenticity & Liability
10. Withdrawal & Termination
11. Confidentiality
12. Marketing & Third-Party Consent (4 checkboxes — including opt-out)
13. Declaration

Plus: Header-ul e "EduForYou — CONSENT & AUTHORISATION AGREEMENT" cu subtitlu, secțiune PARTIES (Student Name, Representative, Date), și la final semnături pentru ambele părți (Student + EduForYou).

### Ce lipsește / trebuie schimbat

| Element | Status |
|---------|--------|
| Titlu document | Trebuie schimbat din "Student Enrollment Consent Form" → "CONSENT & AUTHORISATION AGREEMENT" |
| Secțiunea PARTIES | **Lipsește** — trebuie adăugat EduForYou Representative + Date |
| Secțiunile 1-11 | **Lipsesc** — avem doar 5 clauze simplificate, nu cele 13 din noul format |
| Secțiunea 12 (Marketing checkboxes) | **Lipsește complet** — 4 opțiuni de marketing consent cu checkbox-uri |
| Secțiunea 13 (Declaration) | Parțial — avem ceva similar dar textul diferă |
| Semnătură EduForYou | **Lipsește** — acum avem doar semnătura studentului |
| PDF pe 2 pagini | Actualul e doar 1 pagină — noul conținut necesită 2 pagini |

### Plan de implementare

**Locații de modificat** (3 fișiere cu CONSENT_CLAUSES + edge function + UI):

**1. Actualizare CONSENT_CLAUSES** în toate cele 3 fișiere:
- `src/components/EnrollStudentDialog.tsx`
- `src/pages/agent/EnrollStudent.tsx`
- `src/components/student-detail/StudentDocumentsTab.tsx`

Noile clauze vor fi cele 13 secțiuni din PDF. Secțiunea 12 (Marketing) va avea 4 sub-checkboxuri separate (consent contact, data sharing, marketing yes, marketing no — mutual exclusive pe ultimele 2).

**2. Actualizare edge function `generate-consent-pdf`**:
- Schimbare titlu și header
- Adăugare secțiune PARTIES cu câmpurile completate
- Înlocuire cele 5 clauze cu cele 13 secțiuni noi (cu bullet points pentru secțiunile 2 și 3)
- Adăugare suport multi-pagină (a doua pagină PDF)
- Adăugare checkboxuri vizuale pentru secțiunea 12
- Adăugare loc semnătură EduForYou (cu numele agentului)
- Adăugare a doua dată lângă semnătura EduForYou

**3. Actualizare UI consent step**:
- Secțiunea 12 necesită UI special: 4 checkboxuri separate pentru marketing consent
- Restul clauzelor rămân cu checkbox "I agree" per secțiune
- Transmitere selecții marketing către edge function

**4. Actualizare parametri trimiși către edge function**:
- Adăugare `marketingConsent` object (contact, dataSharing, marketingYes, marketingNo)
- Agentul semnează automat ca "EduForYou Representative"

### Risc
- Mediu — edge function-ul de generare PDF e custom (fără librărie), adăugarea paginii 2 necesită extinderea builder-ului `buildTextOnlyPdf` și `buildPdfWithImage` pentru multi-page
- UI changes sunt straightforward

### Estimare
- 1 sesiune de implementare

