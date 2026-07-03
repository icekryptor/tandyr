'use client';

// NOTE: transitional version — start/end shift moved to dedicated pages
// (/employee/start-shift, /employee/end-shift) with camera + geolocation.
// This hub is fully rebuilt in Phase A4.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Play,
  Square,
  BarChart3,
  Wrench,
  Clock,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  X,
} from 'lucide-react';
import { submitProgress, submitTechRequest } from './actions';

type Screen = 'home' | 'progress' | 'tech-request';

type EmployeeProfile = { full_name: string | null; email: string };
type ShiftRow = {
  id: string;
  status: string;
  created_at: string;
  start_time: string;
  store_id: string;
  production_kg: number | null;
  store: { name: string; address?: string | null } | null;
};

interface Props {
  profile: EmployeeProfile | null;
  openShift: ShiftRow | null;
  recentShifts: ShiftRow[];
}

export function EmployeeHome({ profile, openShift, recentShifts }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [screen, setScreen] = useState<Screen>('home');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [progressKg, setProgressKg] = useState('');

  const reset = () => {
    setError(null);
    setSuccess(null);
    setProgressKg('');
  };

  const goHome = () => {
    reset();
    setScreen('home');
    router.refresh();
  };

  const handleProgress = () => {
    if (!progressKg || !openShift) return setError('Укажите кг');
    startTransition(async () => {
      const result = await submitProgress(openShift.id, parseFloat(progressKg.replace(',', '.')));
      if (result.error) return setError(result.error);
      setSuccess('Прогресс отправлен!');
      setTimeout(goHome, 1200);
    });
  };

  const handleTechRequest = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const description = String(formData.get('description') ?? '');
    startTransition(async () => {
      const result = await submitTechRequest({ description });
      if (result.error) return setError(result.error);
      setSuccess('Заявка отправлена!');
      setTimeout(goHome, 1200);
    });
  };

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <p className="text-lg font-semibold text-foreground">{success}</p>
      </div>
    );
  }

  if (screen === 'progress') {
    return (
      <div className="p-5">
        <Header title="Промежуточный прогресс" onBack={goHome} />
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label>Сколько кг произведено?</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={progressKg}
              onChange={(e) => setProgressKg(e.target.value)}
              className="text-2xl font-bold h-14 text-center"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button onClick={handleProgress} className="w-full" disabled={isPending}>
            {isPending ? 'Отправка...' : 'Отправить прогресс'}
          </Button>
        </div>
      </div>
    );
  }

  if (screen === 'tech-request') {
    return (
      <div className="p-5">
        <Header title="Техническая заявка" onBack={goHome} />
        <form onSubmit={handleTechRequest} className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label>Описание</Label>
            <Textarea name="description" placeholder="Подробное описание..." rows={4} required />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Отправка...' : 'Отправить заявку'}
          </Button>
        </form>
      </div>
    );
  }

  // Home screen
  return (
    <div className="p-5">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-muted-foreground text-sm">Добро пожаловать,</p>
        <h1 className="text-xl font-bold text-foreground">
          {profile?.full_name ?? 'Сотрудник'}
        </h1>
      </div>

      {/* Shift status */}
      {openShift ? (
        <div className="rounded-2xl bg-green-50 border border-green-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-semibold text-green-700">Смена активна</span>
          </div>
          <p className="text-sm text-green-800 font-medium">{openShift.store?.name}</p>
          <p className="text-xs text-green-600 mt-0.5">{openShift.store?.address}</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
            <Clock className="h-3 w-3" />
            <span>
              С {new Date(openShift.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-muted/50 border border-border p-4 mb-6 text-center">
          <p className="text-sm text-muted-foreground">Нет активной смены</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {!openShift ? (
          <Link
            href="/employee/start-shift"
            className="col-span-2 flex items-center gap-3 p-4 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Play className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Начать смену</p>
              <p className="text-xs opacity-80">Фото + геолокация</p>
            </div>
          </Link>
        ) : (
          <>
            <Link
              href="/employee/end-shift"
              className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <Square className="h-5 w-5" />
              <div className="text-left">
                <p className="font-semibold text-xs">Завершить</p>
              </div>
            </Link>
            <button
              onClick={() => { reset(); setScreen('progress'); }}
              className="flex items-center gap-3 p-4 rounded-2xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-colors"
            >
              <BarChart3 className="h-5 w-5" />
              <div className="text-left">
                <p className="font-semibold text-xs">Прогресс</p>
              </div>
            </button>
          </>
        )}
        <button
          onClick={() => { reset(); setScreen('tech-request'); }}
          className="col-span-2 flex items-center justify-between p-4 rounded-2xl border border-border hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-orange-500" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-foreground">Техзаявка</p>
              <p className="text-xs text-muted-foreground">Сообщить о поломке</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <Link
          href="/chats"
          className="col-span-2 flex items-center justify-between p-4 rounded-2xl border border-border hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-foreground">Чаты</p>
              <p className="text-xs text-muted-foreground">Связь с руководством</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Recent shifts */}
      {recentShifts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Последние смены</h2>
          <div className="space-y-2">
            {recentShifts.map((shift) => (
              <div key={shift.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${shift.status === 'open' ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                  <div>
                    <p className="text-sm font-medium">{shift.store?.name ?? '—'}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(shift.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                {shift.production_kg && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {shift.production_kg} кг
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
        <X className="h-4 w-4" />
      </button>
      <h1 className="text-lg font-bold text-foreground">{title}</h1>
    </div>
  );
}
