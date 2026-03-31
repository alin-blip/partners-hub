

## Plan: EduForYou Landing Page (Index)

Build a high-converting landing page using Alex Hormozi's value-stack framework — leading with a bold offer, stacking benefits, showing social proof, and driving action. Styled with the EduForYou brand (navy primary, orange accent, Inter font).

### Page Sections

| # | Section | Content |
|---|---------|---------|
| 1 | **Navbar** | EduForYou logo (left), nav links (Features, How It Works, Pricing, Contact), Login + "Start Free" buttons |
| 2 | **Hero** | Bold headline: "Manage Your Education Agency Like a Machine" / subheadline with pain-point solution / CTA "Get Started" + "Book a Demo" / AI-generated hero image (agent dashboard mockup or education visual) |
| 3 | **Social Proof Bar** | Stats strip: "500+ Agents", "10,000+ Students Enrolled", "50+ Universities" |
| 4 | **Problem/Agitate** | 3 pain points with icons: manual tracking chaos, commission disputes, scattered student data |
| 5 | **Features Stack** | 6 feature cards with icons: Agent Management, Student Tracking, Enrollment Pipeline, Commission Engine, AI Assistant, Digital Agent Cards |
| 6 | **How It Works** | 3 steps: Sign Up → Add Agents → Scale Enrollments (numbered steps with connecting line) |
| 7 | **Value Stack (Hormozi)** | "Everything You Get" — list features with individual "value" prices, crossed out, then show one bundled price / "Contact Us" CTA |
| 8 | **Testimonials** | 3 testimonial cards (placeholder data) |
| 9 | **CTA Section** | Final dark section with "Ready to Scale?" headline + Contact form (name, email, message) or mailto/WhatsApp link |
| 10 | **Footer** | Logo, links, copyright |

### Image Generation

Use Nano Banana (`google/gemini-2.5-flash-image`) via the `generate-image` edge function pattern to create 1-2 hero/section images. Store in Supabase storage `brand-assets` bucket. If generation is complex, use static gradients + icons instead.

### Technical Changes

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | **Replace entirely** — full landing page with all sections above |
| `src/App.tsx` | Update route: `/` renders `Index` directly (not redirect to `/login`) |

### Design Details

- Navy gradient hero background with white text
- Orange accent for all CTAs and highlights
- Cards with subtle shadows and hover effects
- Smooth scroll between sections
- Responsive: mobile-first with stacked layout on small screens
- Animations: fade-in on scroll using Tailwind + intersection observer or simple CSS animations
- Login button in navbar links to `/login`
- Contact section with a simple form or direct link

### Hormozi Framework Applied

1. **Dream Outcome**: "Manage hundreds of agents and thousands of students from one dashboard"
2. **Perceived Likelihood**: Social proof + feature demonstration
3. **Time Delay**: "Set up in minutes, not weeks"
4. **Effort & Sacrifice**: "We handle the complexity — you focus on growing"
5. **Value Stack**: Show individual feature values, then bundle price

