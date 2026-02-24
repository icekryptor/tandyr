-- ============================================================
-- Storage Buckets Setup
-- ============================================================

-- Shift photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shift-photos',
  'shift-photos',
  TRUE,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Tech request photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tech-request-photos',
  'tech-request-photos',
  TRUE,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- User avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Storage Policies
-- ============================================================

-- shift-photos: authenticated users can upload to their own folder
CREATE POLICY "Employees upload shift photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'shift-photos'
    AND auth.uid() IS NOT NULL
    AND name LIKE 'shifts/' || auth.uid()::text || '/%'
  );

CREATE POLICY "Shift photos are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'shift-photos');

-- tech-request-photos: authenticated users can upload
CREATE POLICY "Employees upload tech photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tech-request-photos'
    AND auth.uid() IS NOT NULL
    AND name LIKE 'tech-requests/' || auth.uid()::text || '/%'
  );

CREATE POLICY "Tech photos are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'tech-request-photos');

-- avatars: public read
CREATE POLICY "Avatars are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
  );
