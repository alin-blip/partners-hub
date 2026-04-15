

# Fix: Self-Service Password Reset on Custom Domain

## Current Status

The **admin/owner password management** (view stored password + reset via edge function) is confirmed working from the network logs — the last reset returned `{"success":true}` and the password query returned the updated value.

## Potential Issue: Forgot Password Flow

The Login page's "Forgot password?" sends a recovery email via `supabase.auth.resetPasswordForEmail()` with `redirectTo: window.location.origin + "/reset-password"`. On your custom domain, this becomes `https://agents-eduforyou.co.uk/reset-password`.

Supabase Auth validates redirect URLs against an allow-list. If `agents-eduforyou.co.uk` is not in that list, the recovery email link will redirect to the default Supabase URL instead of your custom domain, which will fail.

## Plan

### 1. Add custom domain to auth redirect allow-list
Use the auth configuration tool to add `https://agents-eduforyou.co.uk` as an allowed redirect URL for Supabase Auth. This ensures the forgot-password email links correctly point to your custom domain.

### 2. Test the forgot password flow
Trigger a test password reset email to verify the recovery link correctly points to `https://agents-eduforyou.co.uk/reset-password` and that the `ResetPassword` page properly handles the recovery token.

### Files to modify
None — this is a configuration-only change to the auth redirect allow-list.

