

# Plan: Mobile Optimization for All Pages and Forms

## Problem
Most users access the platform from their phone. Currently, many pages use fixed-width layouts, multi-column grids, and desktop-oriented components that don't adapt well on small screens.

## Changes

### 1. DashboardLayout — Mobile padding + header
- Reduce main padding from `p-6` to `p-4 sm:p-6`
- Make header more compact on mobile

### 2. MessagesPage — Mobile chat view
- Currently: fixed `w-80` sidebar + message area side-by-side — breaks on mobile
- Fix: On mobile, show conversation list full-width. When a conversation is selected, show only the message area with a back button. Toggle between the two views
- Chat input area: make it sticky at the bottom, properly sized for touch

### 3. EnrollStudentDialog — Responsive form grids
- Change `grid-cols-3` to `grid-cols-1 sm:grid-cols-3` (Title/First/Last name)
- Change all `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`
- Step indicator: make circles smaller on mobile (`w-6 h-6` vs `w-8 h-8`)

### 4. EnrollStudent page — Same grid fixes
- Same grid responsive changes as the dialog
- All `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- All `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`

### 5. StudentsPage — Responsive table
- On mobile: hide Phone and Immigration columns, keep Name/Email/Created
- Make action buttons stack or wrap
- Search + filter: stack vertically on mobile (already uses `flex-col sm:flex-row`)

### 6. LeadsPage — Responsive table
- Hide less important columns on mobile
- Wrap header actions

### 7. AgentsPage — Responsive table
- Hide Online/Joined columns on mobile, keep Name/Role/Status/Actions

### 8. OwnerDashboard — Metric cards + charts
- Metric cards grid: ensure `grid-cols-2` on mobile (already likely works)
- Charts: ensure `ResponsiveContainer` fills properly

### 9. Global CSS touch improvements
- Add touch-friendly tap targets (min 44px height for buttons/rows)
- Ensure select triggers and inputs have adequate height on mobile

## Files modified
1. `src/components/DashboardLayout.tsx` — mobile padding
2. `src/pages/shared/MessagesPage.tsx` — mobile chat toggle view
3. `src/components/EnrollStudentDialog.tsx` — responsive grids
4. `src/pages/agent/EnrollStudent.tsx` — responsive grids
5. `src/pages/shared/StudentsPage.tsx` — hide columns on mobile
6. `src/pages/shared/LeadsPage.tsx` — hide columns on mobile
7. `src/pages/owner/AgentsPage.tsx` — hide columns on mobile
8. `src/index.css` — touch target improvements

The most impactful change is the MessagesPage mobile view, since chat is impossible to use on phone with the current side-by-side layout.

