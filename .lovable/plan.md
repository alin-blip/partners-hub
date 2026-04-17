
User is on the Google Cloud OAuth consent screen ("Google Auth Platform / Create branding"). They're asking if they should fill this in to get access to the Sheet, and whether they need Drive.

Reality check:
- The error is "Service account JSON missing private_key field" — the secret `GOOGLE_DRIVE_SERVICE_ACCOUNT` was saved but the JSON is malformed/incomplete (likely missing the `private_key` field).
- The OAuth consent screen they're filling out is **completely unrelated**. OAuth consent is for end-user "Sign in with Google" flows. Service accounts don't use OAuth consent at all — they use a JSON key file.
- They already have a service account (used by `sync-to-drive`). They just need its **JSON key file** (the full one), then re-paste it into the secret.
- Drive: not strictly needed for this feature (only Sheets API). But the existing service account is already used for Drive sync, so reusing it is fine. They only need the **Google Sheets API enabled** in the GCP project + share the sheet with the service account email.

What to tell them (concise):
1. Don't fill out OAuth consent — wrong screen, not needed.
2. They need to: (a) enable Google Sheets API in GCP, (b) get/regenerate the service account JSON key, (c) paste the COMPLETE JSON into the secret.
3. Drive API is already enabled (sync-to-drive works), so just enable Sheets API on the same project.

This is a guidance/explanation answer — no code changes. Keep it tight in Romanian.
