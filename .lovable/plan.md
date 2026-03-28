

## Insert GBS Timetable Data from Document

### Analysis of the Document

The image shows a **course-timetable matrix for Global Banking School (GBS)** with two sections:

**1. Group Schedules (bottom section):**

| Group | Days & Times |
|-------|-------------|
| A | Mon & Tue 09:45–14:45 |
| B | Wed & Thu 09:45–14:45 |
| C | Mon, Tue & Wed 18:00–21:20 |
| E | Fri & Sat 09:45–14:45 |
| G | (appears once, no schedule shown) |
| K | Thu & Fri 16:30–21:30 |
| N | Mon 15:00–18:00 & Sun 10:00–16:00 |
| P | (Pearson HND courses, no schedule shown) |

**2. Course × Campus × Groups matrix (top section):**

Each course has specific groups available at each campus (East London, West London, Birmingham, Manchester, Leeds).

### Campus Mapping

| Image | DB Campus ID |
|-------|-------------|
| East London | `4c59d6a8` (London - Stratford) |
| West London | `b7f3ce1e` (London - Greenford) |
| Birmingham | `50ae957d` |
| Manchester | `bd1ddb19` |
| Leeds | `1e3668af` |

### Plan

**Step 1: Delete existing timetable_options** for GBS (14 records with split-day labels)

**Step 2: Insert 8 timetable_options** with combined-day labels:
- "Group A – Mon & Tue 09:45-14:45"
- "Group B – Wed & Thu 09:45-14:45"
- "Group C – Mon, Tue & Wed 18:00-21:20"
- "Group E – Fri & Sat 09:45-14:45"
- "Group G"
- "Group K – Thu & Fri 16:30-21:30"
- "Group N – Mon 15:00-18:00 & Sun 10:00-16:00"
- "Group P"

**Step 3: Insert ~250+ course_timetable_groups** records mapping each course × campus × group combination from the matrix.

**Note:** There are duplicate courses in the DB (e.g., two "BSc (Hons) Computing with Foundation Year"). I'll pick one ID per course name for the mappings.

### Technical Detail
All done via SQL INSERT statements using the insert tool — no code changes needed.

