'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/compress-image';
import { initialsOf } from '@/lib/initials';
import { ruError } from '@/lib/ru-error';
import { uploadPhoto } from '@/lib/upload-photo';
import { updateProfile } from '../actions';
import { ScreenHeader } from '../screen-header';

/* Shape pinned by the server page via .returns<>() (nested select). */
export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  store: { name: string; address: string | null } | null;
};

export function ProfileClient({ profile }: { profile: ProfileRow }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [phone, setPhone] = useState(profile.phone ?? '');
  const [savedPhone, setSavedPhone] = useState(profile.phone ?? '');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneChanged = phone.trim() !== savedPhone;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!file || avatarUploading) return;

    setError(null);
    setAvatarUploading(true);
    try {
      const blob = await compressImage(file, { maxDim: 512 });
      const url = await uploadPhoto('avatars', `avatars/${profile.id}/${Date.now()}.jpg`, blob);

      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: url })
        .eq('id', profile.id);
      if (updateError) throw new Error(ruError(updateError.message));

      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить фото');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSavePhone = async () => {
    if (phoneSaving) return;
    setError(null);
    setPhoneSaved(false);
    setPhoneSaving(true);

    const trimmed = phone.trim();
    try {
      const result = await updateProfile({ phone: trimmed.length === 0 ? null : trimmed });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSavedPhone(trimmed);
      setPhoneSaved(true);
    } catch {
      // Server action rejected (network drop, stale action id after redeploy).
      setError('Не удалось отправить. Проверьте соединение и попробуйте ещё раз.');
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    if (!window.confirm('Выйти из аккаунта?')) return;
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <ScreenHeader title="Профиль" />

      <div className="px-6 pt-6 space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={avatarUploading}
            aria-label="Изменить фото профиля"
            className="relative w-28 h-28 rounded-full bg-primary/10 border-2 border-primary/20 overflow-hidden flex items-center justify-center"
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary text-3xl font-extrabold">
                {initialsOf(profile.full_name)}
              </span>
            )}
            {avatarUploading && (
              <span className="absolute inset-0 rounded-full bg-white/70 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </span>
            )}
          </button>
          <p className="text-xs text-muted-foreground mt-3">Нажмите, чтобы изменить</p>
        </div>

        {/* Identity */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <Field label="Имя" value={profile.full_name ?? '—'} />
          <Field label="Email" value={profile.email} />
          {profile.store && (
            <Field
              label="Магазин"
              value={profile.store.name}
              sub={profile.store.address ?? undefined}
            />
          )}
        </div>

        {/* Editable phone */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
          <Label htmlFor="phone" className="text-sm font-semibold">
            Телефон
          </Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 (___) ___-__-__"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setPhoneSaved(false);
            }}
            className="h-12 text-base"
          />
          {phoneSaved && (
            <p role="status" className="text-green-700 text-sm">
              Телефон обновлён
            </p>
          )}
          {phoneChanged && (
            <Button
              className="w-full h-11 rounded-xl"
              disabled={phoneSaving}
              onClick={handleSavePhone}
            >
              {phoneSaving ? 'Сохранение…' : 'Сохранить'}
            </Button>
          )}
        </div>

        {error && (
          <div role="alert" className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-4 text-left hover:border-destructive/40 transition-colors disabled:opacity-60"
        >
          <span className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0">
            <LogOut className="h-5 w-5 text-destructive" />
          </span>
          <span className="flex-1 text-destructive text-base font-bold">
            {loggingOut ? 'Выход…' : 'Выйти из аккаунта'}
          </span>
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold text-foreground mt-0.5">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
