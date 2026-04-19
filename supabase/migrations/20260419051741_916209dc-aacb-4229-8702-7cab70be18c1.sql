DROP POLICY IF EXISTS "Public submits company applications" ON public.company_applications;
DROP POLICY IF EXISTS "Authenticated submits company applications" ON public.company_applications;

CREATE POLICY "Public submits company applications" ON public.company_applications
  FOR INSERT TO anon
  WITH CHECK (
    length(trim(company_name)) > 1
    AND length(trim(contact_name)) > 1
    AND contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND status = 'new'
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
    AND approved_company_id IS NULL
  );

CREATE POLICY "Authenticated submits company applications" ON public.company_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    length(trim(company_name)) > 1
    AND length(trim(contact_name)) > 1
    AND contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND status = 'new'
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
    AND approved_company_id IS NULL
  );