'use client';

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
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Главная', icon: LayoutDashboard },
  { href: '/employees', label: 'Сотрудники', icon: Users },
  { href: '/stores', label: 'Магазины', icon: Store },
  { href: '/shifts', label: 'Смены', icon: Calendar },
  { href: '/salary', label: 'Зарплата', icon: DollarSign },
  { href: '/inventory', label: 'Инвентарь и поставки', icon: Package },
  { href: '/chats', label: 'Чаты', icon: MessageSquare },
  { href: '/tech-requests', label: 'Техзаявки', icon: Wrench },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
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
