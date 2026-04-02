
Problem identified: ultima modificare de RLS pe `profiles` a rupt platforma live pentru owner și probabil pentru alte ecrane care depind indirect de `profiles`.

What happened
1. În ultimele modificări a fost adăugată politica:
   ```sql
   CREATE POLICY "Agent reads own admin profile" ON public.profiles
   USING (id = (SELECT p.admin_id FROM public.profiles p WHERE p.id = auth.uid()));
   ```
2. Această politică face query în `profiles` din interiorul unei politici aplicate tot pe `profiles`.
3. Asta produce exact eroarea confirmată în request logs:
   ```text
   infinite recursion detected in policy for relation "profiles"
   ```
4. Pentru că multe pagini și permisiuni folosesc `profiles` direct sau indirect, efectul s-a propagat:
   - owner nu mai vede agenți/admini
   - meniul owner dispare/parțial se degradează când rolul/profile-ul nu se încarcă corect
   - pagini precum AI Monitoring arată „No conversations found”
   - query-uri pe tasks/enrollments pot pica deoarece RLS-urile lor se bazează pe join/subquery cu `profiles`

Why owner looks broken
- `AuthContext` încarcă profilul din `profiles`
- `AgentsPage` citește toate profile-urile
- multe politici din tabele precum `enrollments`, `ai_conversations`, `ai_messages`, `commission_*` folosesc `profiles`
- când `profiles` intră în recursion, owner-ul rămâne fără date și fără context complet de rol/profil în UI

Analysis of the last 4 changes
1. Transfer requests migration: nu pare cauza principală a regresiei actuale.
2. `StudentEnrollmentsTab` + transfer flow: nu explică dispariția agenților/adminilor din owner.
3. `MessagesPage` filtering: schimbare locală pe dialogul de conversații, nu explică regresia globală.
4. RLS migration `20260402182407_09d83e98-0855-46b8-a436-bf2cd9ae1e5c.sql`: aceasta este cauza critică și directă.

Live platform impact
Având 20+ agenți activi, impactul este mare:
- owner poate pierde vizibilitatea globală
- admin/agent pot avea erori pe mesagerie și pe alte pagini care ating `profiles`
- orice query cu dependență pe `profiles` poate deveni instabil
- este o regresie de securitate/availability, nu doar de UI

Safe fix plan
1. Roll back logic-ul problematic din politica actuală:
   - remove policy `Agent reads own admin profile`
2. Replace cu o variantă fără self-reference pe `profiles`
   - soluția sigură este printr-o funcție `SECURITY DEFINER`, de exemplu una care returnează `admin_id` pentru utilizatorul curent, apoi politica să compare `id = public.get_my_admin_id()`
   - alternativ, o funcție `can_read_profile(_target_id uuid)` care citește server-side fără recursion
3. Verify owner-critical flows first:
   - load profile in `AuthContext`
   - owner sidebar management items
   - owner agents page (admins + agents visible)
   - AI Monitoring list
4. Verify messaging change still works after fix:
   - agent can see only own admin in new conversation list
   - admin can see team + owner
   - owner visibility remains intact
5. Add explicit regression checks for live safety before future releases:
   - owner login sees management menu
   - owner `/owner/agents` returns data
   - agent `/messages` can see admin only
   - admin-created agent gets welcome conversation without breaking chat permissions

Technical note
The exact anti-pattern is:
```sql
USING (id = (SELECT p.admin_id FROM public.profiles p WHERE p.id = auth.uid()))
```
A policy on `profiles` must not query `profiles` directly. It should use a `SECURITY DEFINER` function instead.

Recommended implementation
- New migration:
  - `DROP POLICY IF EXISTS "Agent reads own admin profile" ON public.profiles;`
  - create `public.get_my_admin_id()` as `SECURITY DEFINER`
  - recreate policy using function result
- No broadening of owner/admin access beyond current model
- No changes to live user roles/data, only RLS repair

What I would change next
1. Replace the broken policy with a security-definer-based version
2. Re-test owner views first because they are the highest-impact live regression
3. Re-test chat restrictions after the RLS fix to ensure the original agent→admin messaging requirement still holds

Risk note for live environment
This is exactly the kind of change I should flag going forward: a small messaging-related RLS update ended up affecting cross-platform data visibility because `profiles` is central to authorization across the whole app.
