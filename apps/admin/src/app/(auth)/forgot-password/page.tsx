'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const GENERIC_SUCCESS_MESSAGE =
  'Если такой email зарегистрирован, мы отправили на него ссылку для восстановления пароля.';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    // Intentionally ignore the result to avoid enumeration: show the same
    // confirmation regardless of whether the email exists.
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <span className="text-white text-3xl font-bold">Т</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Восстановление пароля</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Укажите email — мы пришлём ссылку для сброса
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {submitted ? (
            <div className="space-y-4">
              <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                <p className="text-foreground text-sm">{GENERIC_SUCCESS_MESSAGE}</p>
              </div>
              <p className="text-muted-foreground text-xs">
                Проверьте входящие и папку «Спам». Письмо может идти до нескольких минут.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@tandyr.kz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Отправить ссылку
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
