

# Plan: Notificare post nou + ultimul post pe dashboard agent

## Ce se face

1. **Notificare în NotificationBell** — când un post social nou e trimis către agent (din `social_post_recipients`), apare o notificare "📢 New social post ready" cu link spre `/agent/social-feed`.

2. **Card compact pe AgentDashboard** — un card mic sub DashboardSearchCard care afișează ultimul post primit (imagine thumbnail + caption truncat + data), cu buton "View all" spre `/agent/social-feed`. Dacă nu există posturi, cardul nu apare.

3. **Responsive** — pe desktop: imagine mică la stânga + text la dreapta (o singură linie). Pe mobil: layout stacked compact, tot o singură linie de spațiu.

---

## Fișiere modificate

### `src/components/NotificationBell.tsx`
- Adaug secțiunea 6 în query: fetch din `social_post_recipients` unde `agent_id = user.id` și `seen_at IS NULL`, join cu `social_posts` pentru caption + created_at.
- Creez notificări de tip `"social"` cu titlul "New social post ready", description = caption truncat, link = `${prefix}/social-feed`.
- Adaug `social: "📢"` în `typeIcon`.

### `src/pages/agent/AgentDashboard.tsx`
- Adaug un `useQuery` care fetch-uiește ultimul post din `social_post_recipients` (join `social_posts`) pentru agentul curent, `LIMIT 1`, ordonat desc.
- Randez un `Card` compact între `DashboardSearchCard` și `CommissionOfferCards`:
  - Pe desktop: `flex-row`, thumbnail 48px, caption truncat pe un rând, data, buton "View all →".
  - Pe mobil: același layout dar full-width.
  - Dacă postul e unseen, are un accent ring subtil.
  - Dacă nu există posturi, cardul nu se afișează.

### Estimare impact
- Zero modificări pe tabele existente
- Zero risc pentru agenții activi — doar adăugări UI
- Două query-uri noi (lightweight, indexed pe `agent_id`)

