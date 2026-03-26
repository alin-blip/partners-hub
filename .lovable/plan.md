

## Plan: Public Application Form, Digital Card Page, Sidebar Link & QR Code

### Overview
Four interconnected features: (1) a public lead/application form at `/apply/:slug`, (2) link it from the agent's digital card, (3) add "Digital Card" as a dedicated sidebar menu item + separate page, (4) QR code generation for the card URL.

### 1. Database: Create `leads` table
New migration to create a `leads` table for public form submissions:
- `id`, `agent_id` (uuid, references the agent), `first_name`, `last_name`, `email`, `phone`, `nationality`, `course_interest` (text), `status` (default `'new'`), `created_at`
- RLS: anon can INSERT (public form), authenticated users read based on role (owner=all, admin=team, agent=own)
- Also add anon SELECT on `profiles` for slug lookup (already exists) and anon SELECT on `universities`/`courses` for dropdown options

### 2. Public Application Form — `/apply/:slug`
New file: `src/pages/public/PublicApplicationPage.tsx`
- Public route, no auth required
- Fetches agent profile by slug (reuses existing anon RLS on profiles)
- Shows agent name/photo at top for trust
- Form fields: First Name, Last Name, Email, Phone, Nationality, Course Interest (free text or dropdown from universities/courses)
- On submit: inserts into `leads` table with `agent_id`
- Success screen: "Thank you! We'll be in touch."
- Add route in `App.tsx`: `<Route path="/apply/:slug" element={<PublicApplicationPage />} />`

### 3. Link from Digital Card
In `AgentCardPage.tsx`:
- Replace the current "Check Eligibility" / "Apply Now" buttons to point to `/apply/:slug` instead of `settings.apply_url` (or use apply_url as fallback, with `/apply/:slug` as default)
- The apply_url field in CardSettings becomes optional override

### 4. Sidebar: Add "Digital Card" menu item
In `AppSidebar.tsx`:
- Add a "Digital Card" item to `actionItems` array for all roles, pointing to `${prefix}/digital-card`
- Icon: `CreditCard` from lucide-react

### 5. Dedicated Digital Card Page
New file: `src/pages/shared/DigitalCardPage.tsx`
- Wraps `DashboardLayout` with `CardSettingsSection` (currently embedded in ProfilePage)
- Remove `CardSettingsSection` from `ProfilePage.tsx`
- Add routes in `App.tsx` for all roles: `/owner/digital-card`, `/admin/digital-card`, `/agent/digital-card`

### 6. QR Code Generation
In `CardSettingsSection.tsx`:
- Install/use `qrcode.react` library (or generate via canvas)
- When card is published, show a QR code below the URL preview
- QR code encodes the `cardUrl`
- Add a "Download QR" button that saves the QR as PNG
- Also show QR for the `/apply/:slug` URL

### Files to create/modify
| File | Action |
|------|--------|
| Migration SQL | Create `leads` table + RLS |
| `src/pages/public/PublicApplicationPage.tsx` | New — public form |
| `src/pages/shared/DigitalCardPage.tsx` | New — wraps CardSettingsSection |
| `src/App.tsx` | Add routes for `/apply/:slug` and `*/digital-card` |
| `src/components/AppSidebar.tsx` | Add "Digital Card" to actionItems |
| `src/components/CardSettingsSection.tsx` | Add QR code display + download |
| `src/pages/shared/ProfilePage.tsx` | Remove CardSettingsSection import |
| `src/pages/public/AgentCardPage.tsx` | Link "Apply Now" to `/apply/:slug` |
| `package.json` | Add `qrcode.react` dependency |

