
# Fix: Add Student button visible on mobile dashboard

The "New Student Enrollment" button is inside a `flex items-center justify-between` row with the title, but on small screens the long text and layout can push it off-screen or make it hard to tap.

## Change

**File**: `src/pages/agent/AgentDashboard.tsx` (lines 123-147)

- Make the header row wrap on mobile: `flex flex-col sm:flex-row items-start sm:items-center`
- Shorten button text on mobile: show "+" icon only or "+ Add Student" instead of "+ New Student Enrollment"
- Ensure the button is full-width on mobile for easy tapping

```tsx
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
  <div className="flex items-center gap-3">
    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">My Dashboard</h1>
    <Button variant="ghost" size="sm" ...>
      <HelpCircle className="h-4 w-4 mr-1" /> Tour
    </Button>
  </div>
  <div data-onboarding="step-new-student" className="w-full sm:w-auto">
    <Button className="w-full sm:w-auto bg-accent ..." onClick={...}>
      <Plus className="w-4 h-4 mr-1" />
      <span className="sm:hidden">Add Student</span>
      <span className="hidden sm:inline">New Student Enrollment</span>
    </Button>
  </div>
</div>
```

Single file edit, ~5 lines changed.
