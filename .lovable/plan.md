

# Eliminare referințe "Ask33" din baza de date

## Problema
Textul "Our Ask33 CV template can be used" apare în 3 locuri — toate legate de LSC:

| Locație | Tabel | ID |
|---------|-------|----|
| CertHe in Business Studies with FY — personal_statement_guidelines | course_details | `0665e12c-...` |
| CertHe in Health and Social Care with FY — personal_statement_guidelines | course_details | `e183ea65-...` |
| LSC Course Details (Requirements) | ai_knowledge_base | `4aca298a-...` |

## Plan

### 1. Migrare SQL — Update `course_details`
Înlocuim "Our Ask33 CV template can be used" cu "Our CV template can be used" în câmpul `personal_statement_guidelines` pentru ambele cursuri LSC.

### 2. Migrare SQL — Update `ai_knowledge_base`
Înlocuim orice referință "Ask33" din conținutul articolului de knowledge base LSC cu text neutru (fără brand terț).

### Rezultat
Zero mențiuni "Ask33" în toată baza de date.

