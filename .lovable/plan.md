

# Plan: Adăugare căutare/filtru după campus și locație + afișare locație pe card

## Ce se schimbă

### 1. Fetch campuses și legăturile campus-curs
- Adăugăm un query pentru `campuses` (deja există în DB cu `name` și `city`)
- Adăugăm un query pentru `course_timetable_groups` (legătura `course_id` → `campus_id`)
- Construim un map: `courseId → [campus names/cities]`

### 2. Extindere filtru de căutare
- Termenul de search va căuta și în numele campus-urilor și în orașul (`city`) asociat fiecărui curs
- Dacă scrii "London" sau "Birmingham", vor apărea cursurile de la campusurile din acel oraș

### 3. Afișare locație pe cardul cursului
- Sub badges-urile existente (level, study_mode), adăugăm o linie cu icon `MapPin` care arată campusurile/orașele asociate cursului
- Format: "Campus Name (City)" sau doar "City" dacă sunt multiple, trunchiate la primele 2-3

## Fișiere modificate
1. **`src/pages/shared/UniversitiesCoursesPage.tsx`**
   - Query nou: `campuses` + `course_timetable_groups`
   - Build `courseCampusMap: Map<courseId, {name, city}[]>`
   - Filtru extins cu campus name + city matching
   - Pe fiecare card: afișare locație cu `MapPin` icon

2. **`src/components/DashboardSearchCard.tsx`**
   - Aceleași query-uri noi (campuses + course_timetable_groups)
   - Filtru extins cu campus/locație
   - Afișare locație sub universitate pe fiecare rezultat

## Detalii tehnice
- `campuses` are `name` și `city` — folosim ambele
- `course_timetable_groups` face legătura `course_id` ↔ `campus_id` — grupăm pe `course_id`
- Fallback: dacă un curs nu are campus-uri asociate prin `course_timetable_groups`, nu afișăm nimic la locație
- Nu necesită migrații DB — datele există deja

