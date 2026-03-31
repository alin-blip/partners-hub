

## Populate GBS Course Details from PDF Documents

### Overview
Update `course_details` for all 21 GBS courses + 1 MLA College course using the operational data extracted from the 9 uploaded PDFs. The PDFs contain agent-facing details (document checklists, interview booking process, campus-specific info) organized by awarding university (UOS, OBU, CCCU, BSU, Pearson, MLA).

### Data Mapping from PDFs to Courses

The PDFs organize courses by awarding body. Here's the mapping:

| PDF | Awarding Body | Courses |
|-----|--------------|---------|
| GBS-UOS | University of Suffolk | BA Global Business (Business Mgmt) with FY; BA Global Business & Entrepreneurship with FY |
| GBS-OBU | Oxford Brookes University | BA Global Business & Entrepreneurship with FY; BSc Health, Wellbeing & Social Care with FY |
| GBS-CCCU | Canterbury Christ Church | BSc Accounting & Financial Mgmt; BSc Business & Tourism Mgmt |
| GBS-BSU (x3) | Bath Spa University | BSc Computing with FY; BSc Construction Mgmt with FY; BSc Project Mgmt with FY; BSc Psychology with Counselling with FY; BSc Psychology with Counselling Integrated FY; MSc Global Business; MSc Counselling & Psychotherapy; MSc Project Mgmt |
| GBS-Pearson (x2) | Pearson | HND Business; HND Construction Mgmt; HND Digital Technologies; HND/BTEC Health & Social Care |
| GBS-MLA | MLA College | MSc Global Sustainable Development |

### What Gets Updated (per course)

**1. `documents_required`** — Full Standard Route + Non-Standard Route document lists:
- Standard (under 21): Passport/ID, Diploma+Transcript, Proof of address, Share Code, NINo, SFE Screenshot Proof, Ask33 Consent Form, Immigration Status Document
- Non-Standard (21+): Same minus Diploma+Transcript (replaced by work experience for Pearson courses)
- Pearson-specific: Non-Standard adds 2 Years work experience, HMRC work history OR P60s/tax calculations

**2. `interview_info`** — Enhance existing with operational booking details:
- Interview on campus only (Campus Assessment)
- Booking: Agent finds available day/time, leaves message on platform (Mon-Fri 10AM-3PM)
- Date format: dd/mm and hour hh:mm
- SFE Proofs tutorial link reference

**3. `admission_test_info`** — Standardize per awarding body:
- All: OPT 81 score required (exceptions depend on previous qualifications)
- UOS: English Test 2 questions totalling 350 words
- CCCU: English Test 3 questions ~250 words (80 words each); Math Test ONLY for Accounting & Financial Mgmt
- BSU: English Test 3 questions totalling 350 words
- Pearson: English Test 2-3 questions totalling 350 words; NOTE: Pearson classes 9:45-15:15

**4. `additional_info`** — Campus addresses, qualification proof requirements:
- ID/Passport must be valid 6+ months
- Qualification proof rules (UK vs non-UK obtained)
- Course-specific campus addresses (Stratford/Bow Road/Greenford/Leeds/Birmingham/Manchester)
- Top-Up courses: exclusively for GBS HND graduates
- MLA: self-learning, part-time/unemployed only, awarded by University of Plymouth

### Implementation
- Use the database insert tool (which supports UPDATE) to upsert all 22 course_details records
- Batch by awarding body groups to keep data consistent
- Preserve existing `entry_requirements` data (already good from website scrape) — only update if currently NULL
- Overwrite `documents_required`, `admission_test_info`, `interview_info`, `additional_info` with comprehensive PDF data

### Technical Details
- 22 UPDATE statements via the insert tool against `course_details` table
- Each update uses the course_id as the key
- No schema changes needed — all fields already exist
- No code changes needed — the `CourseDetailsInfoCard` component already renders all these fields

