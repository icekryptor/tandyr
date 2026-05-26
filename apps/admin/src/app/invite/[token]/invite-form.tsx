'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { acceptInvite } from './actions';

interface InviteFormProps {
  token: string;
  preEmail: string;
  preStoreId: string;
  preRole: string;
  stores: { id: string; name: string }[];
  roleLabels: Record<string, string>;
}

export function InviteForm(props: InviteFormProps) {
  return (
    <Suspense fallback={null}>
      <InviteFormInner {...props} />
    </Suspense>
  );
}

function InviteFormInner({
  token, preEmail, preStoreId, preRole, stores, roleLabels,
}: InviteFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [storeId, setStoreId] = useState<string>('');
  const [role, setRole] = useState<string>('');

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    formData.set('token', token);
    if (!preStoreId) formData.set('store_id', storeId && storeId !== '__none__' ? storeId : '');
    if (!preRole) formData.set('company_role', role && role !== '__none__' ? role : '');
    const result = await acceptInvite(formData);
    if (result.ok) {
      setSuccess(true);
      setTimeout(() => router.replace('/login?invited=1'), 1500);
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
              <span className="text-white text-3xl font-bold">Т</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Аккаунт создан</h1>
          </div>
          <div
            role="status"
            className="bg-green-50 border border-green-200 rounded-2xl p-6 shadow-sm text-center"
          >
            <p className="text-sm text-green-700">Перенаправляем на страницу входа…</p>
          </div>
        </div>
      </div>
    );
  }

  const preStoreName = preStoreId
    ? (stores.find((s) => s.id === preStoreId)?.name ?? '—')
    : '';
  const preRoleLabel = preRole ? (roleLabels[preRole] ?? preRole) : '';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <span className="text-white text-3xl font-bold">Т</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Регистрация сотрудника</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Заполните данные — они привязаны к вашему приглашению.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">ФИО</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Иван Иванов"
                required
                autoComplete="name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="employee@tandyr.kz"
                required
                autoComplete="email"
                defaultValue={preEmail}
                readOnly={Boolean(preEmail)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="store_id">Магазин</Label>
              {preStoreId ? (
                <>
                  <Input value={preStoreName} readOnly />
                  <input type="hidden" name="store_id" value={preStoreId} />
                </>
              ) : (
                <Select value={storeId} onValueChange={setStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите магазин" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Не указано —</SelectItem>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company_role">Роль в компании</Label>
              {preRole ? (
                <>
                  <Input value={preRoleLabel} readOnly />
                  <input type="hidden" name="company_role" value={preRole} />
                </>
              ) : (
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Не указано —</SelectItem>
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {error && (
              <div role="alert" className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Зарегистрироваться
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
