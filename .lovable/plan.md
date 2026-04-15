

# Add /reset-password Page for Password Recovery

## Problem
Password reset emails are sent successfully, but when agents click the recovery link, they land on `/login` which has no logic to detect the recovery token and show a "set new password" form. The password never actually gets reset.

## Solution

### 1. Create `/reset-password` page (`src/pages/ResetPassword.tsx`)
- On mount, listen for `PASSWORD_RECOVERY` event via `supabase.auth.onAuthStateChange`
- Show a form with: New Password, Confirm Password (with show/hide toggles)
- On submit, call `supabase.auth.updateUser({ password })` 
- On success, redirect to `/login` with a toast confirmation
- Handle edge cases: expired/invalid token shows an error message

### 2. Update `Login.tsx` redirect URL
- Change `redirectTo` in `handleForgotPassword` from `/login` to `/reset-password`

### 3. Add route in `App.tsx`
- Add `<Route path="/reset-password" element={<ResetPassword />} />` as a public route

## Files to modify

| File | Change |
|------|--------|
| `src/pages/ResetPassword.tsx` | New page — password reset form |
| `src/pages/Login.tsx` | Update `redirectTo` to `/reset-password` |
| `src/App.tsx` | Add `/reset-password` route |

