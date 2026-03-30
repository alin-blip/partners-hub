

## Plan: Fix QR Codes + Add Digital Business Card Features

### Problem 1: QR Codes Point to Wrong URL

The QR codes use `window.location.origin` which resolves to the Lovable preview URL (e.g. `id-preview--...lovable.app`) instead of the published domain (`agentseduforyou.lovable.app`). Need to hardcode the production base URL or use the published URL.

**Fix**: Use the published URL `https://agentseduforyou.lovable.app` as the base for QR codes and shareable links, with a fallback to `window.location.origin` for dev.

**File**: `src/components/CardSettingsSection.tsx`
- Add constant: `const BASE_URL = import.meta.env.PROD ? "https://agentseduforyou.lovable.app" : window.location.origin`
- Update `cardUrl` and `applyFormUrl` to use `BASE_URL`

---

### Problem 2: Digital Business Card (vCard Enhancement)

A basic vCard download already exists in `AgentCardPage.tsx`. It needs enrichment to include email, website URL, social links, and photo — so when saved on iPhone it creates a rich contact card.

**File**: `src/pages/public/AgentCardPage.tsx`
- Enhance `handleVCard()` to include:
  - `URL:` (link to the agent's card page)
  - `EMAIL:` (from profile or card settings)
  - `NOTE:` (bio text)
  - All social links as `X-SOCIALPROFILE` fields

This vCard file is natively supported by iOS — tapping it opens "Add to Contacts" directly. No Apple Wallet certificate needed.

---

### About Apple Wallet (.pkpass) and NFC

| Feature | Feasibility | Complexity |
|---------|------------|------------|
| **vCard (.vcf)** | Works now on all phones | Already implemented, just needs enrichment |
| **Apple Wallet (.pkpass)** | Requires Apple Developer certificate + server-side signing | High — needs Apple Developer Program enrollment + edge function |
| **NFC** | Physical hardware (NFC tags/cards) programmed with the card URL | Not a software feature — agents buy NFC cards and program them with their `/card/slug` URL |

**Recommendation**: Enhance the vCard for now. Apple Wallet passes can be added later if you get Apple Developer certificates. For NFC, agents simply buy NFC business cards and write their card URL to them.

---

### Files to Edit

| File | Change |
|------|--------|
| `src/components/CardSettingsSection.tsx` | Fix QR code base URL to use published domain |
| `src/pages/public/AgentCardPage.tsx` | Enrich vCard with URL, social profiles, and note |

