

# Personal Statement: Reducere AI detection + afișare scor + menționare curs/universitate

## Probleme
1. Personal statement-ul este detectat ~30% AI — trebuie sub 15%
2. Lipsește menționarea explicită: "I want to study [course] at [university] ([duration])"
3. Nu se afișează un scor AI estimat după generare

## Modificări

### 1. Edge function — Prompt îmbunătățit (`generate-student-document/index.ts`)

**A. Adăugare instrucțiune obligatorie de deschidere:**
- Prompt-ul va cere explicit ca personal statement-ul să înceapă cu o propoziție de tipul: "I want to study [course name] at [university name]" incluzând durata cursului
- Fetch-ul de enrollments va include și `courses.duration` pentru a-l transmite în profileSummary

**B. Tehnici anti-AI-detection mai agresive:**
- Adăugare instrucțiuni: folosește greșeli gramaticale minore ocazionale, fraze incomplete, repetiții naturale
- Evitare structură perfect echilibrată de paragrafe
- Adăugare cuvinte de umplutură tipic umane ("like", "sort of", "kind of", "basically")
- Evitare tranziții fluide între paragrafe — uneori sari direct la alt subiect
- Nu folosi vocabular avansat academic — scrie ca un student de 18-22 ani
- Adaugă o propoziție sau două care par oarecum off-topic dar autentice

**C. Două treceri de generare:**
- Prima generare: creează personal statement-ul
- A doua generare: "humanize" pass — rescrie textul pentru a-l face mai natural/uman, fără a schimba conținutul

### 2. Edge function — Returnare scor AI estimat

După generarea + humanizarea textului, se face un al 3-lea apel AI care evaluează textul pe o scară de 0-100% cât de probabil este generat de AI. Se returnează `ai_score` în response alături de `content`.

### 3. Frontend — Afișare scor AI (`StudentAIDocumentsTab.tsx`)

- Salvează `ai_score` din response în state
- Afișează sub personal statement un badge colorat:
  - Verde (< 15%): "AI Score: X% ✓"  
  - Galben (15-25%): "AI Score: X% ⚠"
  - Roșu (> 25%): "AI Score: X% ✗"

### 4. Enrollment query update

Adăugare `courses(name, level, study_mode, duration)` în query-ul de enrollments din edge function pentru a include durata.

## Fișiere modificate
1. `supabase/functions/generate-student-document/index.ts` — prompt + humanize pass + AI score check + duration fetch
2. `src/components/student-detail/StudentAIDocumentsTab.tsx` — afișare AI score badge

