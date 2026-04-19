-- Promote alin@eduforyou.co.uk to Super Admin (owner) once they sign up
-- This uses ON CONFLICT to be safe if re-run.
DO $$
DECLARE
  _user_id uuid;
BEGIN
  SELECT id INTO _user_id FROM auth.users WHERE email = 'alin@eduforyou.co.uk' LIMIT 1;
  IF _user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'owner'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;