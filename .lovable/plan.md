

## Plan: UK Postcode Address Lookup for Agent Registration

### What We're Building

A reusable address lookup component that lets you type a UK postcode, fetch matching addresses from the free **postcodes.io** API (no API key needed), and select the correct one. This will be added to the agent creation dialogs on both the Owner and Admin pages.

### Steps

| # | What | Details |
|---|------|---------|
| 1 | **Add address/postcode columns to profiles** | Migration: add `postcode VARCHAR(10)` and `address TEXT` columns to the `profiles` table |
| 2 | **Create `AddressLookupInput` component** | New `src/components/AddressLookupInput.tsx` — a postcode input field + "Find Address" button. Calls `https://api.postcodes.io/postcodes/{postcode}` to validate the postcode, then shows the formatted address. User can also manually edit the address field. |
| 3 | **Add to Owner AgentsPage** | Add postcode + address fields to the "Create New User" dialog, save to profiles on creation via the `create-owner` edge function |
| 4 | **Add to Admin AdminAgentsPage** | Same fields added to the "Create New Agent" dialog |
| 5 | **Update `create-owner` edge function** | Accept `postcode` and `address` params, save them to the profiles table after user creation |

### How the Component Works

1. User types a UK postcode (e.g. "SW1A 1AA")
2. Clicks "Find Address" or presses Enter
3. Component calls `postcodes.io` — returns ward, parish, admin district, region etc.
4. Displays the resolved location (e.g. "Westminster, London, SW1A 1AA")
5. Address is stored in an editable text field so the user can refine it
6. Both `postcode` and `address` values are passed up via `onChange` callbacks

### Why postcodes.io

- Completely free, no API key required
- UK-specific (perfect for this use case)
- Returns structured location data (admin_district, region, country)
- No rate limit concerns for typical usage

### Files Changed

| File | Action |
|------|--------|
| `src/components/AddressLookupInput.tsx` | **New** — reusable postcode lookup component |
| `src/pages/owner/AgentsPage.tsx` | Add address fields to create dialog |
| `src/pages/admin/AdminAgentsPage.tsx` | Add address fields to create dialog |
| `supabase/functions/create-owner/index.ts` | Accept & save postcode/address |
| Database migration | Add `postcode` and `address` to `profiles` |

