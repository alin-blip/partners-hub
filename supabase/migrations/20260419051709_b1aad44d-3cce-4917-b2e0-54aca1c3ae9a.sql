-- 1. Companies (B2B partners)
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  business_type text,
  logo_url text,
  contact_email text,
  contact_phone text,
  contract_terms text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Branches
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  postcode text,
  phone text,
  email text,
  slug text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_branches_company_id ON public.branches(company_id);

CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Company users
CREATE TABLE public.company_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'company_admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_company_users_user_id ON public.company_users(user_id);

-- 4. Branch users
CREATE TABLE public.branch_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'consultant',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, user_id)
);
ALTER TABLE public.branch_users ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_branch_users_user_id ON public.branch_users(user_id);

-- 5. Branch widget settings
CREATE TABLE public.branch_widget_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL UNIQUE REFERENCES public.branches(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  primary_color text DEFAULT '#0A1628',
  accent_color text DEFAULT '#D4AF37',
  greeting_text text DEFAULT 'Interested in studying in the UK? Let us help.',
  button_text text DEFAULT 'Get info',
  required_fields jsonb NOT NULL DEFAULT '["first_name","last_name","email","phone"]'::jsonb,
  notification_emails text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.branch_widget_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_widget_settings_updated_at
  BEFORE UPDATE ON public.branch_widget_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Widget leads
CREATE TABLE public.widget_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  course_interest text,
  message text,
  source_url text,
  status text NOT NULL DEFAULT 'new',
  converted_lead_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.widget_leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_widget_leads_branch_id ON public.widget_leads(branch_id);
CREATE INDEX idx_widget_leads_status ON public.widget_leads(status);

-- 7. Company applications
CREATE TABLE public.company_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  business_type text,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  website text,
  branches_count integer,
  estimated_referrals_per_month integer,
  message text,
  status text NOT NULL DEFAULT 'new',
  reviewed_at timestamptz,
  reviewed_by uuid,
  reviewer_notes text,
  approved_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_applications ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_company_applications_updated_at
  BEFORE UPDATE ON public.company_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Generated email sequences
CREATE TABLE public.generated_email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  sequence_name text NOT NULL,
  audience text,
  goal text,
  emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.generated_email_sequences ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_email_sequences_updated_at
  BEFORE UPDATE ON public.generated_email_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- POLICIES
-- ============================================================================

CREATE POLICY "Owner manages companies" ON public.companies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Company admin reads own company" ON public.companies FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'company_admin')
    AND id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "Owner manages branches" ON public.branches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Public reads active branches" ON public.branches FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Authenticated reads active branches" ON public.branches FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Owner manages company users" ON public.company_users FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "User reads own company memberships" ON public.company_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owner manages branch users" ON public.branch_users FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "User reads own branch memberships" ON public.branch_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owner manages widget settings" ON public.branch_widget_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Public reads enabled widgets" ON public.branch_widget_settings FOR SELECT TO anon USING (is_enabled = true);
CREATE POLICY "Authenticated reads enabled widgets" ON public.branch_widget_settings FOR SELECT TO authenticated USING (is_enabled = true);

CREATE POLICY "Owner manages widget leads" ON public.widget_leads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Public submits widget leads" ON public.widget_leads FOR INSERT TO anon
  WITH CHECK (branch_id IN (SELECT branch_id FROM public.branch_widget_settings WHERE is_enabled = true));
CREATE POLICY "Authenticated submits widget leads" ON public.widget_leads FOR INSERT TO authenticated
  WITH CHECK (branch_id IN (SELECT branch_id FROM public.branch_widget_settings WHERE is_enabled = true));
CREATE POLICY "Branch users read own branch widget leads" ON public.widget_leads FOR SELECT TO authenticated
  USING (branch_id IN (SELECT branch_id FROM public.branch_users WHERE user_id = auth.uid()));
CREATE POLICY "Company admin reads own company widget leads" ON public.widget_leads FOR SELECT TO authenticated
  USING (branch_id IN (
    SELECT b.id FROM public.branches b
    WHERE b.company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
  ));

CREATE POLICY "Owner manages company applications" ON public.company_applications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Public submits company applications" ON public.company_applications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated submits company applications" ON public.company_applications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Owner manages email sequences" ON public.generated_email_sequences FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Creator manages own email sequences" ON public.generated_email_sequences FOR ALL TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- ============================================================================
-- Add nullable company_id / branch_id to existing tables
-- ============================================================================
ALTER TABLE public.profiles    ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.profiles    ADD COLUMN IF NOT EXISTS branch_id  uuid REFERENCES public.branches(id)  ON DELETE SET NULL;
ALTER TABLE public.leads       ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.leads       ADD COLUMN IF NOT EXISTS branch_id  uuid REFERENCES public.branches(id)  ON DELETE SET NULL;
ALTER TABLE public.students    ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.students    ADD COLUMN IF NOT EXISTS branch_id  uuid REFERENCES public.branches(id)  ON DELETE SET NULL;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS branch_id  uuid REFERENCES public.branches(id)  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_company_id    ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id     ON public.profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_leads_branch_id        ON public.leads(branch_id);
CREATE INDEX IF NOT EXISTS idx_students_branch_id     ON public.students(branch_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_branch_id  ON public.enrollments(branch_id);
