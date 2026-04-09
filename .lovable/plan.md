

# Implement: Course Context for Content Creation

This plan was approved previously but never implemented. Here is the full implementation.

## Overview
Add university→course cascading dropdowns to both content creation pages, pass course details to AI, and enforce strict content rules (no university names, no "free", correct finance framing).

## Changes

### 1. Frontend — `src/pages/shared/SocialPostsPage.tsx`
- Add state: `selectedUniId`, `selectedCourseId`
- Add React Query: fetch `universities` (active), `courses` (active)
- Add two `<Select>` dropdowns in Step 1 (above prompt): "Filter by Institution" (filters course list only) and "Select Course" (optional)
- Pass `courseId: selectedCourseId` in both `generate-image` and `generate-caption` fetch bodies

### 2. Frontend — `src/pages/shared/CreateImagePage.tsx`
- Same pattern: add state + queries + two dropdowns + pass `courseId` to `generate-image` and `generate-caption` calls

### 3. Backend — `supabase/functions/generate-image/index.ts`
- Accept optional `courseId` from request body
- If provided, fetch `courses` row (name, level, study_mode, duration, fees) and `course_details` row (entry_requirements, documents_required, interview_info, admission_test_info, personal_statement_guidelines, additional_info)
- Append a `SELECTED COURSE CONTEXT` block to the prompt with all course data (NO university name)
- Append strict content rules block to the prompt

### 4. Backend — `supabase/functions/generate-caption/index.ts`
- Same: accept `courseId`, fetch course + details, append course context and strict rules to system prompt

### 5. Strict Rules (injected into both functions' prompts)
```text
STRICT CONTENT RULES:
- NEVER use university names — refer only to the course name or field of study
- NEVER say "our courses", "our programs" — use "the course", "this program", "the BSc in..."
- NEVER use "free" or "gratuit" or imply anything is free
- Student finance is a LOAN repaid after graduation at 9% of earnings above £25,000/year
  Frame as: "student finance available", "funding support", "government-backed student loan"
```

### 6. Deploy
- Redeploy `generate-image` and `generate-caption` edge functions

## Files Modified
1. `src/pages/shared/SocialPostsPage.tsx` — dropdowns + pass courseId
2. `src/pages/shared/CreateImagePage.tsx` — dropdowns + pass courseId
3. `supabase/functions/generate-image/index.ts` — accept courseId, fetch details, strict rules
4. `supabase/functions/generate-caption/index.ts` — accept courseId, fetch details, strict rules

