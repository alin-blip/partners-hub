

## Audit: EduForYou (yours) vs Puapi — Feature Comparison

### What you HAVE already

| Feature | Status |
|---|---|
| Student file management (full CRUD) | ✅ |
| AI Chat personalizat | ✅ |
| Document storage per student | ✅ |
| Commission system with tiers | ✅ |
| Multi-role: Owner / Admin / Agent | ✅ |
| AI image generation for marketing | ✅ |
| AI caption generation | ✅ |
| Knowledge base for AI | ✅ |
| AI monitoring (conversations) | ✅ |
| Resources page (tutorials/guides) | ✅ |
| Feedback system | ✅ |
| Profile with avatar | ✅ |
| Document processor (AI import) | ✅ |
| Promotions / bonuses | ✅ |
| Multi-step enrollment form | ✅ |
| University/Campus/Course/Intake/Timetable settings | ✅ |
| Brand settings (logo, voice) | ✅ |

### What Puapi HAS that you DON'T (yet)

| Puapi Feature | Priority | Difficulty |
|---|---|---|
| **Agent landing page / digital card** (public link per agent with contact, WhatsApp, social links, "Book consultation", "Check Eligibility", "Apply Now") | HIGH | Medium |
| **Lead management system** (track potential students before they become applicants) | HIGH | Medium |
| **SMS & Email system** with automations | MEDIUM | High |
| **Task management** for team | MEDIUM | Medium |
| **Consent form digital** (GDPR compliant, auto-generated) | MEDIUM | Low |
| **CV & Personal Statement generation** with AI | MEDIUM | Low (you already have AI infra) |
| **Clock-in system** for office staff | LOW | Medium |
| **Calendar planner with booking** | LOW | High |
| **Accounting & invoicing** | LOW | High |
| **Student form → file conversion** (public form that creates a student record) | HIGH | Medium |
| **Mobile app** (iOS/Android) | LOW | Very High |

### Recommended Implementation Order

The highest-impact, lowest-effort features to close the gap:

**Phase 1 — Quick wins (can implement now)**
1. **Agent Digital Card / Landing Page** — Public page at `/card/:agent-slug` showing agent photo, name, role, phone, WhatsApp, email, social links, "Book Consultation" and "Apply Now" buttons. Uses existing profile + new fields (WhatsApp, social links, booking URL). This is their key differentiator and very doable.
2. **Public Student Application Form** — A public form at `/apply/:agent-ref` that creates a student record directly (no login needed). Replaces manual enrollment for self-service.
3. **GDPR Consent Form** — Auto-generated digital consent as part of the enrollment flow.

**Phase 2 — Medium effort**
4. **Lead Management** — New `leads` table with status pipeline (New → Contacted → Qualified → Converted). Leads convert to students.
5. **AI CV & Personal Statement Generator** — Edge function using existing AI infra to generate documents from student data.
6. **Task Management** — Simple kanban/list for team task tracking.

**Phase 3 — Larger features**
7. **Email automations** (enrollment status changes trigger emails)
8. **Calendar/Booking** integration
9. **Invoicing basics**

### What do you want to start with?

I recommend starting with the **Agent Digital Card** (public landing page per agent) since that's the most visible feature from the Puapi screenshot you shared, and it directly helps agents market themselves. It would include:
- Public route `/card/:slug` (no auth required)
- Agent photo, name, title, accreditation badge
- Phone, WhatsApp, Email links
- "Book a Free Consultation" button (external link or built-in)
- "Check Eligibility" / "Apply Now" buttons
- Company info tab with working hours
- Social media links
- vCard download ("Add to contacts")
- New `agent_card_settings` table for social links, booking URL, working hours

