

## Plan: Add Postcode Lookup to Student Enrollment Forms

Replace the plain "Full UK Address" textarea in both enrollment forms with the existing `AddressLookupInput` component, enabling automatic UK address lookup via postcodes.io when creating a new student.

### Changes

| File | Change |
|------|--------|
| `src/components/EnrollStudentDialog.tsx` | 1. Import `AddressLookupInput` component. 2. Add `postcode` state variable. 3. Replace the "Full UK Address" textarea (line ~425) with `<AddressLookupInput>`, passing `postcode`/`fullAddress` and their setters. 4. Include `postcode` in the student insert data sent to Supabase. 5. Show postcode in the Review step. |
| `src/pages/agent/EnrollStudent.tsx` | Same changes as above — import component, add `postcode` state, replace textarea (line ~527), include in insert, show in review. |

### How It Works

The `AddressLookupInput` component already exists and handles everything:
- User types a UK postcode → clicks "Find" or presses Enter
- Calls `postcodes.io` API → auto-fills formatted address (ward, district, region)
- Address field remains editable for manual refinement
- Both `postcode` and `address` values are saved to the `students` table (`full_address` column for address)

### No Database Changes Needed

The `students` table already has a `full_address` column. The postcode can be stored as part of the address string (it's included in the lookup result). No migration required.

