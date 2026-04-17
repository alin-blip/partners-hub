
User is confused about Google Cloud Console settings. They're asking about "Add domains to allowlist" in Google Admin — this is yet another wrong screen. They keep clicking around in GCP trying to find the right place.

Reality:
- Service accounts do NOT need: OAuth consent, domain allowlists, Google Admin, branding, etc.
- Service accounts ONLY need:
  1. The JSON key file (downloaded from Service Accounts page)
  2. Sheets API enabled in the project
  3. The target Sheet shared with the service account email as Editor

"Add domains to allowlist" is for OAuth user-facing apps, completely irrelevant.

I need to give crystal-clear step-by-step instructions in Romanian, with exact URLs, telling them to STOP clicking on OAuth/Branding/Admin screens. Just 3 simple steps.

No code changes needed — pure guidance. Keep it tight and visual.
