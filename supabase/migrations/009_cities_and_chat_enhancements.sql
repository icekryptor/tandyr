-- ============================================================
-- 009: Cities system + enhanced messages
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── Cities ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cities (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed cities
INSERT INTO public.cities (name) VALUES
  ('Москва'),
  ('Санкт-Петербург'),
  ('Нижний Новгород'),
  ('Казань'),
  ('Киров'),
  ('Ярославль'),
  ('Владимир'),
  ('Набережные Челны')
ON CONFLICT (name) DO NOTHING;

-- ── User ↔ City (many-to-many, primarily for tech specialists) ─
CREATE TABLE IF NOT EXISTS public.user_cities (
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  city_id    UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, city_id)
);

CREATE INDEX IF NOT EXISTS idx_user_cities_user ON public.user_cities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cities_city ON public.user_cities(city_id);

ALTER TABLE public.user_cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage user_cities" ON public.user_cities
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users read own cities" ON public.user_cities
  FOR SELECT USING (user_id = auth.uid());

-- ── Enhanced messages ─────────────────────────────────────────
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_url   TEXT,
  ADD COLUMN IF NOT EXISTS media_type  TEXT CHECK (media_type IN ('image', 'video')),
  ADD COLUMN IF NOT EXISTS edited_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_deleted  BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Chat room: optional city_id for tech-city rooms ──────────
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS city_id     UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS room_type   TEXT NOT NULL DEFAULT 'general'
    CHECK (room_type IN ('general', 'admin_support', 'tech_city'));

-- ── Storage bucket for chat media ─────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users upload chat media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone reads chat media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-media');

CREATE POLICY "Owner deletes chat media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ── RLS on cities (read for all authenticated) ────────────────
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read cities" ON public.cities
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage cities" ON public.cities
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
