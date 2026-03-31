

## Plan: Onboarding Wizard with Section Highlighting

Build a step-by-step onboarding tour that overlays the Agent Dashboard, highlighting each section with a glowing border and showing an explanation tooltip/card for each step.

### Approach

Use a custom `OnboardingWizard` component (no external library) that renders a spotlight overlay with a floating explanation card. Each step targets a DOM element via `data-onboarding` attributes.

### Steps to Highlight

| Step | Target | Title | Description |
|------|--------|-------|-------------|
| 1 | Sidebar | Navigation | "Use the sidebar to access Students, Enrollments, Messages, Tasks and more." |
| 2 | Promo Banner | Promotions | "Track active promotions and bonuses. Hit your targets to earn extra rewards." |
| 3 | Commission Cards | Commission Offers | "See university-specific commission rates. Each card shows what you earn per student." |
| 4 | Metric Cards | Your Stats | "Quick overview of your students, active enrollments, and current commission tier." |
| 5 | Monthly Target | Monthly Target | "Track your monthly enrollment progress against your target." |
| 6 | Enrollments Table | Enrollments | "View all your student enrollments, their status, university and course details." |
| 7 | New Student Button | Enroll Students | "Click here to start enrolling a new student." |

### Technical Implementation

| File | Change |
|------|--------|
| `src/components/OnboardingWizard.tsx` | **New** — renders overlay with spotlight cutout around the active element, floating card with title/description, Next/Back/Skip buttons, step dots indicator |
| `src/pages/agent/AgentDashboard.tsx` | Add `data-onboarding="step-N"` attributes to each section; render `<OnboardingWizard />` |
| `src/contexts/AuthContext.tsx` | No change — use `localStorage` key `onboarding-completed` to track if wizard was shown |

### Wizard Behavior

- Shows automatically on first login (checks `localStorage`)
- Calculates target element position with `getBoundingClientRect()` and renders a dark overlay with a cutout
- Active section gets a pulsing border highlight (ring animation)
- Floating card positioned dynamically next to the highlighted element
- "Skip", "Back", "Next", "Finish" buttons
- On finish/skip, sets `localStorage` flag so it doesn't show again
- A "Restart Tour" button in the dashboard header to re-trigger it

