-- ============================================================
-- Tandyr Bakery Management System — Initial Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS (extends auth.users)
-- ============================================================
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
  phone         TEXT,
  store_id      UUID,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STORES
-- ============================================================
CREATE TABLE public.stores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  address     TEXT NOT NULL,
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from users to stores (after stores table exists)
ALTER TABLE public.users ADD CONSTRAINT users_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

-- ============================================================
-- SHIFTS
-- ============================================================
CREATE TABLE public.shifts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  start_photo_url TEXT NOT NULL,
  start_lat       DOUBLE PRECISION NOT NULL,
  start_lng       DOUBLE PRECISION NOT NULL,
  start_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_photo_url   TEXT,
  end_lat         DOUBLE PRECISION,
  end_lng         DOUBLE PRECISION,
  end_time        TIMESTAMPTZ,
  production_kg   DOUBLE PRECISION,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shifts_user_id ON public.shifts(user_id);
CREATE INDEX idx_shifts_store_id ON public.shifts(store_id);
CREATE INDEX idx_shifts_status ON public.shifts(status);

-- ============================================================
-- PROGRESS REPORTS
-- ============================================================
CREATE TABLE public.progress_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id        UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  production_kg   DOUBLE PRECISION NOT NULL,
  reported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_progress_reports_shift_id ON public.progress_reports(shift_id);

-- ============================================================
-- TECH REQUESTS
-- ============================================================
CREATE TABLE public.tech_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shift_id    UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  photo_url   TEXT,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tech_requests_user_id ON public.tech_requests(user_id);
CREATE INDEX idx_tech_requests_status ON public.tech_requests(status);

-- ============================================================
-- CHAT ROOMS
-- ============================================================
CREATE TABLE public.chat_rooms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'group' CHECK (type IN ('direct', 'group')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CHAT MEMBERS
-- ============================================================
CREATE TABLE public.chat_members (
  room_id     UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE public.messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_room_id ON public.messages(room_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- ============================================================
-- SALARY RECORDS
-- ============================================================
CREATE TABLE public.salary_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  total_kg      DOUBLE PRECISION NOT NULL DEFAULT 0,
  rate_per_kg   DOUBLE PRECISION NOT NULL,
  total_amount  DOUBLE PRECISION NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'calculated' CHECK (status IN ('calculated', 'paid')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_salary_records_user_id ON public.salary_records(user_id);

-- ============================================================
-- INVENTORY
-- ============================================================
CREATE TABLE public.inventory (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_name   TEXT NOT NULL,
  quantity    DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit        TEXT NOT NULL DEFAULT 'кг',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_store_id ON public.inventory(store_id);

-- ============================================================
-- SUPPLIES
-- ============================================================
CREATE TABLE public.supplies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_name   TEXT NOT NULL,
  quantity    DOUBLE PRECISION NOT NULL,
  unit        TEXT NOT NULL DEFAULT 'кг',
  supplier    TEXT,
  supplied_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supplies_store_id ON public.supplies(store_id);

-- ============================================================
-- TRIGGER: auto-create user profile on auth.users signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Новый пользователь'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: update inventory on supply insert
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_inventory_on_supply()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.inventory (store_id, item_name, quantity, unit, updated_at)
  VALUES (NEW.store_id, NEW.item_name, NEW.quantity, NEW.unit, NOW())
  ON CONFLICT DO NOTHING;

  UPDATE public.inventory
  SET quantity = quantity + NEW.quantity, updated_at = NOW()
  WHERE store_id = NEW.store_id AND item_name = NEW.item_name AND unit = NEW.unit;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_supply_inserted
  AFTER INSERT ON public.supplies
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_on_supply();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- USERS policies
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "Admins can manage users" ON public.users
  FOR ALL USING (is_admin());
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- STORES policies
CREATE POLICY "Anyone authenticated can read stores" ON public.stores
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage stores" ON public.stores
  FOR ALL USING (is_admin());

-- SHIFTS policies
CREATE POLICY "Employees see own shifts" ON public.shifts
  FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Employees can create own shifts" ON public.shifts
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Employees can update own open shifts" ON public.shifts
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- PROGRESS REPORTS policies
CREATE POLICY "Employees see own progress reports" ON public.progress_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.shifts WHERE id = shift_id AND user_id = auth.uid())
    OR is_admin()
  );
CREATE POLICY "Employees can insert progress reports" ON public.progress_reports
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.shifts WHERE id = shift_id AND user_id = auth.uid())
  );

-- TECH REQUESTS policies
CREATE POLICY "Employees see own tech requests" ON public.tech_requests
  FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Employees can create tech requests" ON public.tech_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update tech requests" ON public.tech_requests
  FOR UPDATE USING (is_admin());

-- CHAT ROOMS policies
CREATE POLICY "Members can see their rooms" ON public.chat_rooms
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_members WHERE room_id = id AND user_id = auth.uid())
    OR is_admin()
  );
CREATE POLICY "Admins can manage chat rooms" ON public.chat_rooms
  FOR ALL USING (is_admin());

-- CHAT MEMBERS policies
CREATE POLICY "Members can see room members" ON public.chat_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_members cm WHERE cm.room_id = room_id AND cm.user_id = auth.uid())
    OR is_admin()
  );
CREATE POLICY "Admins can manage members" ON public.chat_members
  FOR ALL USING (is_admin());

-- MESSAGES policies
CREATE POLICY "Room members can read messages" ON public.messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_members WHERE room_id = messages.room_id AND user_id = auth.uid())
    OR is_admin()
  );
CREATE POLICY "Room members can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.chat_members WHERE room_id = messages.room_id AND user_id = auth.uid())
  );

-- SALARY RECORDS policies
CREATE POLICY "Employees see own salary" ON public.salary_records
  FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Admins can manage salary records" ON public.salary_records
  FOR ALL USING (is_admin());

-- INVENTORY policies
CREATE POLICY "Authenticated users can read inventory" ON public.inventory
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage inventory" ON public.inventory
  FOR ALL USING (is_admin());

-- SUPPLIES policies
CREATE POLICY "Admins can manage supplies" ON public.supplies
  FOR ALL USING (is_admin());
CREATE POLICY "Authenticated can read supplies" ON public.supplies
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Enable Realtime for messages
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
