-- ============================================================
-- 022: Block self-service privilege escalation
-- ============================================================
-- "Users can update own profile" (001) allows updating ANY column,
-- including role / company_role / is_active. RLS WITH CHECK cannot
-- compare OLD vs NEW, so enforce with a trigger: non-admins cannot
-- change privilege columns. Service-role writes bypass RLS but NOT
-- triggers — so the trigger must allow when there is no authenticated
-- uid (service role) or when the actor is an admin.
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_privilege_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.company_role IS DISTINCT FROM OLD.company_role
      OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
    -- service role / postgres: auth.uid() is NULL — allow
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    -- admins may change anyone
    IF public.is_admin() THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Изменение ролей и статуса доступно только администратору';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_privilege_columns ON public.users;
CREATE TRIGGER trg_protect_privilege_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_privilege_columns();
