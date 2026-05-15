'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Store,
  Calendar,
  DollarSign,
  Package,
  MessageSquare,
  Wrench,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type SidebarProfile = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
};

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase() || '?';
}

const navItems = [
  { href: '/overview', label: 'Главная', icon: LayoutDashboard },
  { href: '/employees', label: 'Сотрудники', icon: Users },
  { href: '/stores', label: 'Магазины', icon: Store },
  { href: '/shifts', label: 'Смены', icon: Calendar },
  { href: '/salary', label: 'Зарплата', icon: DollarSign },
  { href: '/inventory', label: 'Инвентарь и поставки', icon: Package },
  { href: '/chats', label: 'Чаты', icon: MessageSquare },
  { href: '/tech-requests', label: 'Техзаявки', icon: Wrench },
  { href: '/settings', label: 'Настройки', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<SidebarProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from('users')
        .select('full_name, email, phone, avatar_url')
        .eq('id', user.id)
        .single();
      if (!cancelled && data) setProfile(data as SidebarProfile);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="w-60 shrink-0 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-lg">Т</span>
          </div>
          <div>
            <p className="font-bold text-foreground text-sm leading-none">Tandyr</p>
            <p className="text-muted-foreground text-xs mt-0.5">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto min-h-0">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/overview' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors group',
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Profile preview */}
      {profile && (
        <div className="px-3 pt-3 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name ?? ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-primary text-xs font-bold">
                  {getInitials(profile.full_name)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {profile.full_name ?? 'Без имени'}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {profile.phone ?? profile.email ?? ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
