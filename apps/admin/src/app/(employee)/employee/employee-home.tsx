'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { BarChart3, CheckCircle2, User, Wallet, Wrench } from 'lucide-react';
import { formatDate, formatDateTime, formatKg } from '@tandyr/shared';

/* Supabase without generated DB types infers nested selects as arrays;
   the server page pins these shapes via .returns<>(). */
export type HubProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  store_id: string | null;
};

export type HubOpenShift = {
  id: string;
  start_time: string;
  store: { name: string; address: string | null } | null;
};

export type HubRecentShift = {
  id: string;
  start_time: string;
  end_time: string | null;
  production_kg: number | null;
  status: string;
  store: { name: string } | null;
};

interface Props {
  profile: HubProfile | null;
  openShift: HubOpenShift | null;
  recentShifts: HubRecentShift[];
  started: boolean;
  ended: boolean;
}

// SSR-safe "is hydrated" flag: the greeting depends on the device clock,
// which the server cannot know. Renders a neutral greeting on the server
// and swaps to the time-of-day one after hydration.
const emptySubscribe = () => () => {};
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Доброе утро';
  if (hour < 17) return 'Добрый день';
  return 'Добрый вечер';
}

function initialsOf(name: string | null): string {
  return (
    (name ?? '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  );
}

export function EmployeeHome({ profile, openShift, recentShifts, started, ended }: Props) {
  const hydrated = useIsHydrated();
  const greet = hydrated ? timeGreeting() : 'Здравствуйте';
  const firstName = profile?.full_name?.split(' ')[0] || 'Сотрудник';

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <header className="bg-primary px-6 pt-6 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-foreground/80 text-sm">{greet},</p>
            <p className="text-primary-foreground text-xl font-bold">{firstName}</p>
          </div>
          <Link
            href="/employee/profile"
            aria-label="Профиль"
            className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0"
          >
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary-foreground font-bold text-sm">
                {initialsOf(profile?.full_name ?? null)}
              </span>
            )}
          </Link>
        </div>
      </header>

      <div className="px-6 pt-6 space-y-4">
        {/* Success banners */}
        {started && <SuccessBanner text="Смена открыта! Хорошей работы." />}
        {ended && <SuccessBanner text="Смена завершена! Отличная работа." />}

        {/* Active shift / start CTA */}
        {openShift ? (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" aria-hidden />
              <span className="text-sm font-semibold text-green-700">Смена открыта</span>
            </div>
            <p className="text-lg font-bold text-foreground">{openShift.store?.name ?? 'Магазин'}</p>
            {openShift.store?.address && (
              <p className="text-sm text-muted-foreground mt-1">{openShift.store.address}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Начало: {formatDateTime(openShift.start_time)}
            </p>
            <Link
              href="/employee/end-shift"
              className="mt-4 flex h-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Завершить смену
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <p className="text-lg font-bold text-foreground mb-1">Нет активной смены</p>
            <p className="text-sm text-muted-foreground mb-4">
              Сфотографируйте рабочее место для начала смены
            </p>
            <Link
              href="/employee/start-shift"
              className="flex h-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Начать смену
            </Link>
          </div>
        )}

        {/* Actions grid */}
        <h2 className="text-base font-bold text-foreground pt-2">Действия</h2>
        <div className="grid grid-cols-2 gap-3">
          <ActionTile
            href="/employee/progress"
            disabled={!openShift}
            icon={<BarChart3 className="h-6 w-6 text-green-600" />}
            iconBg="bg-green-500/10"
            label="Прогресс"
            sub={openShift ? 'Промежуточные кг' : 'Нужна открытая смена'}
          />
          <ActionTile
            href="/employee/tech-request"
            icon={<Wrench className="h-6 w-6 text-primary" />}
            iconBg="bg-primary/10"
            label="Техзаявка"
            sub="Сообщить о поломке"
          />
          <ActionTile
            href="/employee/salary"
            icon={<Wallet className="h-6 w-6 text-amber-600" />}
            iconBg="bg-amber-500/10"
            label="Зарплата"
            sub="Заработок по неделям"
          />
          <ActionTile
            href="/employee/profile"
            icon={<User className="h-6 w-6 text-blue-600" />}
            iconBg="bg-blue-500/10"
            label="Профиль"
            sub="Телефон и фото"
          />
        </div>

        {/* Recent shifts */}
        {recentShifts.length > 0 && (
          <div className="pt-2">
            <h2 className="text-base font-bold text-foreground mb-3">Последние смены</h2>
            <div className="space-y-2">
              {recentShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {shift.store?.name ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(shift.start_time)}
                    </p>
                  </div>
                  {shift.production_kg !== null && (
                    <span className="text-sm font-semibold text-foreground shrink-0 ml-3">
                      {formatKg(shift.production_kg)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SuccessBanner({ text }: { text: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3"
    >
      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
      <p className="text-green-700 text-sm font-medium">{text}</p>
    </div>
  );
}

function ActionTile({
  href,
  icon,
  iconBg,
  label,
  sub,
  disabled,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  sub: string;
  disabled?: boolean;
}) {
  const content = (
    <>
      <span className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center`}>
        {icon}
      </span>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="text-[11px] text-muted-foreground text-center leading-tight">{sub}</span>
    </>
  );

  if (disabled) {
    return (
      <div
        aria-disabled="true"
        className="flex flex-col items-center gap-2 bg-card border border-border rounded-2xl p-4 opacity-50 select-none"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors"
    >
      {content}
    </Link>
  );
}
