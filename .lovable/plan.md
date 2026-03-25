

# Plan: Reorganizare Sidebar + Restricții Acces

## Problema actuală
- Owner are **13 linkuri** într-o listă plată — greu de navigat
- Admin are **11 linkuri**
- Knowledge Base și AI Monitoring sunt accesibile Admin-ului, dar ar trebui să fie doar Owner
- "Enroll Student" și "Create Image" sunt acțiuni de creare amestecate cu paginile de vizualizare

## Propunere: Grupuri vizuale cu secțiuni

```text
┌─────────────────────┐
│ 🎓 EduForYou UK     │
├─── MAIN ────────────┤
│  Dashboard          │
│  Students           │
│  Enrollments        │
│  Documents          │
├─── ACTIONS ─────────┤
│  Enroll Student     │
│  Create Image       │
│  Resources          │
├─── MANAGEMENT ──────┤  ← Owner only
│  Agents             │
│  Commissions        │
│  Knowledge Base     │
│  AI Monitoring      │
│  Settings           │
├─── TEAM ────────────┤  ← Admin only
│  My Agents          │
├─────────────────────┤
│  Profile            │
│  Sign Out           │
└─────────────────────┘
```

**Agent** vede doar MAIN + ACTIONS + footer (Profile/Sign Out) = **7 items, 2 grupuri**
**Admin** vede MAIN + ACTIONS + TEAM = **8 items, 3 grupuri**
**Owner** vede MAIN + ACTIONS + MANAGEMENT = **12 items, 3 grupuri**

## Restricții acces

- **Knowledge Base**: doar Owner (scoatem din Admin sidebar + `allowedRoles` devine `["owner"]`)
- **AI Monitoring**: doar Owner (la fel)
- Admin pierde acces la aceste 2 pagini → sidebar-ul Admin scade la **8 items**

## Ce se modifică

### `src/components/AppSidebar.tsx`
- Împărțim linkurile în grupuri separate cu `SidebarGroup` + `SidebarGroupLabel` (Main, Actions, Management/Team)
- Profile mutat în footer lângă Sign Out
- Knowledge Base și AI Monitoring rămân doar la Owner

### `src/pages/owner/KnowledgeBasePage.tsx`
- `allowedRoles` de la `["owner", "admin"]` → `["owner"]`

### `src/pages/owner/AIMonitoringPage.tsx`
- `allowedRoles` de la `["owner", "admin"]` → `["owner"]`

### `src/App.tsx`
- Eliminăm rutele `/admin/knowledge-base` și `/admin/ai-monitoring`

### Opțional
- Documents rămâne vizibil și pentru Admin (are sens să vadă documentele echipei)

