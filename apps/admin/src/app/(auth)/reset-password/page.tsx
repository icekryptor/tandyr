'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { MIN_PASSWORD_LENGTH } from '@tandyr/shared';

type Status = 'verifying' | 'ready' | 'invalid';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}

function ResetPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  const [status, setStatus] = useState<Status>('verifying');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const consumedRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (consumedRef.current === code) return;
    consumedRef.current = code;
    let cancelled = false;
    const exchange = async () => {
      if (!code) {
        if (!cancelled) setStatus('invalid');
        return;
      }
      const supabase = createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;
      if (exchangeError) {
        setStatus('invalid');
        return;
      }
      setStatus('ready');
      router.replace('/reset-password', { scroll: false });
    };
    void exchange();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError('Пароль должен быть не короче 6 символов');
      return;
    }
    if (password !== confirm) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError('Не удалось обновить пароль. Попробуйте ещё раз.');
      return;
    }

    router.replace('/login?reset=1');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <span className="text-white text-3xl font-bold">Т</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Новый пароль</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Придумайте надёжный пароль для входа
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {status === 'verifying' && (
            <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Проверяем ссылку…
            </div>
          )}

          {status === 'invalid' && (
            <div className="space-y-4">
              <div role="alert" className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                <p className="text-destructive text-sm">Ссылка недействительна или устарела.</p>
              </div>
              <Link href="/forgot-password" className="block">
                <Button type="button" className="w-full">
                  Запросить новую ссылку
                </Button>
              </Link>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Новый пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm">Повторите пароль</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div role="alert" className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить пароль
              </Button>
            </form>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Назад ко входу
          </Link>
        </div>
      </div>
    </div>
  );
}
