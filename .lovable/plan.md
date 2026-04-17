
User wants Google Sheets export instead of XLSX/ZIP. Structure: one Google Sheet per Admin, with one tab/worksheet per Agent under that admin. Owner gets all admins.

We already have a Google service account (`GOOGLE_DRIVE_SERVICE_ACCOUNT`) and a root folder (`GOOGLE_DRIVE_ROOT_FOLDER_ID`) used by `sync-to-drive`. We can reuse the same service account by enabling Sheets API scope.

Approach: Edge function `export-to-sheets` that:
1. Auths with service account (Drive + Sheets scopes)
2. Groups data: admins → agents → students/enrollments
3. For each admin: creates/updates a Google Sheet in the root folder, named `Admin - {Name}.xlsx-style sheet`
4. Inside the sheet: one tab per agent + a "Summary" tab
5. Returns links to all created sheets

Keep concise.
