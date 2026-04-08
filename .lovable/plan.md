

# AI Chat Bubble & Panel Premium Redesign

## What changes

### 1. Chat Bubble (FAB) — Premium with avatar + wave effect
- Replace the current `Sparkles` icon button with the uploaded avatar image cropped as a circle
- Add animated concentric wave rings around the bubble using CSS keyframes with orange (`accent`) color
- The waves pulse outward continuously to make it look interactive and alive
- Slightly larger bubble (h-16 w-16) with a gold/orange border ring

### 2. Chat Panel Header — Orange branded
- Change header background from the subtle `from-primary/5` gradient to a solid orange gradient (`bg-gradient-to-r from-[#F97316] to-[#EA580C]`)
- All header text (title, subtitle) becomes white
- The AI avatar icon in the header also uses the uploaded avatar image instead of the Bot icon
- Mode toggle pills get a semi-transparent white background style to work on the orange header

### 3. AI Avatar in messages
- Replace the "AI" text fallback in message avatars with the uploaded avatar image (using `AvatarImage`)
- Keep the orange gradient fallback for when image fails to load

### 4. Welcome screen refinements
- Replace the `Sparkles` box with the avatar image in a larger circle with orange glow
- Quick action buttons get subtle orange hover accents
- Voice circle keeps orange gradient, add a subtle pulse animation

### 5. Asset setup
- Copy the uploaded image to `src/assets/ai-avatar.png`
- Import it in `AIChatPanel.tsx`

## Files to update
- `src/components/AIChatPanel.tsx` — all visual changes
- `src/assets/ai-avatar.png` — new file (copy from upload)

## Safety
- Only visual/CSS changes to `AIChatPanel.tsx`
- No backend changes, no table changes
- No impact on existing functionality

