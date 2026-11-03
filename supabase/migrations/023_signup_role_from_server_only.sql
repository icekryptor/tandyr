-- ============================================================
-- 023: New profiles always start as 'employee'
-- ============================================================
-- handle_new_user() (001) took `role` from raw_user_meta_data, which the
-- caller of the public /auth/v1/signup endpoint controls: anyone with the
-- anon key could sign up with {"data":{"role":"admin"}} and become admin.
-- 022 guards UPDATE only, so the INSERT path stayed open.
--
-- Privileged roles are now set only by server code with the service role
-- (signup/invite/employee actions and infra/supabase/scripts/create-admin.sh
-- already UPDATE role/company_role after createUser).
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Новый пользователь'),
    NEW.email,
    'employee'
  );
  RETURN NEW;
END;
$$;
