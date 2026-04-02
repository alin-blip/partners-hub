

# Plan: Îmbunătățire Dashboard Owner — Grafice și Metrici

## Problema actuală
Graficul "Team Performance Overview" combină Students, Enrollments și Commission pe aceleași axe — commission-ul (în £) domină scala Y, făcând barele de students/enrollments invizibile (apar ca 0). Plus, lipsesc vizualizări cheie pentru un owner.

## Ce adăugăm

### 1. Enrollment Pipeline Funnel (nou)
Un grafic BarChart orizontal care arată câte enrollment-uri sunt în fiecare status (applied → documents_pending → processing → offer_received → accepted → funding → enrolled → active). Oferă vizibilitate asupra blocajelor din pipeline.

### 2. Monthly Trend Line Chart (nou)
Un LineChart care arată evoluția lunară a enrollment-urilor noi (ultimele 6 luni), grupate pe lună din `created_at`. Permite identificarea tendințelor de creștere/scădere.

### 3. Revenue Breakdown Pie/Donut Chart (nou)
Un PieChart care arată distribuția revenue-ului pe universități — fetch din `commission_snapshots` join `enrollments` → `universities`. Arată de unde vin banii.

### 4. Fix graficul existent "Team Performance"
- Separă commission pe un ax Y secundar (dreapta) sau îl mută într-un grafic separat
- Alternativ: scoate commission din bar chart-ul principal și lasă doar Students vs Enrollments (comparație vizuală corectă)

### 5. Top Agents Leaderboard Card (nou)
Un card mic cu top 5 agenți sortați după enrollment-uri active, cu progress bar vizual.

## Detalii tehnice

### Queries noi necesare
- **Pipeline**: reutilizăm `allEnrollments`, grupăm client-side pe `status`
- **Monthly trend**: query nou pe `enrollments` cu `created_at`, grupare client-side pe lună
- **Revenue per uni**: query nou pe `commission_snapshots` join `enrollments` join `universities`

### Fișiere modificate
1. **`src/pages/owner/OwnerDashboard.tsx`** — toate modificările sunt aici:
   - Adăugare 3 query-uri noi (monthly enrollments, snapshots cu uni info)
   - Procesare date client-side pentru pipeline, trend, revenue breakdown
   - Import `LineChart, Line, PieChart, Pie, Cell` din recharts
   - 4 carduri grafice noi sub metric cards
   - Fix bar chart existent (scoate commission, lasă students vs enrollments)
   - Commission mutat în grafic separat sau combinat cu revenue pie

### Layout nou (de sus în jos)
1. Metric Cards (8 — existente)
2. **Row 1**: Pipeline Funnel (50%) + Monthly Trend (50%)
3. **Row 2**: Team Performance — doar Students vs Enrollments (50%) + Revenue per University donut (50%)
4. **Row 3**: Top 5 Agents card
5. Admin → Agent Hierarchy (existent)
6. Recent Enrollments (existent)
7. Email Log (existent)

