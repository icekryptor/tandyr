'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, ArrowLeft, Wifi, Battery, Signal } from 'lucide-react';
import { cn } from '@/lib/utils';

function StatusBar() {
  const now = new Date();
  const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-center justify-between px-5 py-1.5 text-[11px] font-semibold text-foreground">
      <span>{time}</span>
      <div className="flex items-center gap-1">
        <Signal className="h-3 w-3" />
        <Wifi className="h-3 w-3" />
        <Battery className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/employee';

  return (
    <div className="min-h-screen bg-muted/50 flex items-start justify-center p-4 pt-8">
      {/* Back to hub */}
      <Link
        href="/"
        className="fixed top-4 left-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors z-50"
      >
        <ArrowLeft className="h-4 w-4" />
        На главную
      </Link>

      <div className="text-center mb-4 fixed top-4 right-4 z-50">
        <span className="text-xs text-muted-foreground bg-accent/10 text-accent px-3 py-1.5 rounded-full font-medium">
          Тестовый режим сотрудника
        </span>
      </div>

      {/* Phone frame */}
      <div className="w-[390px] min-h-[844px] bg-background rounded-[3rem] shadow-2xl border-[8px] border-foreground/10 overflow-hidden flex flex-col relative">
        <StatusBar />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Bottom navigation */}
        <div className="border-t border-border bg-card px-4 py-2 pb-6">
          <div className="flex items-center justify-around">
            <Link
              href="/employee"
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors',
                isHome ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Home className="h-5 w-5" />
              <span className="text-[10px] font-medium">Главная</span>
            </Link>
            <Link
              href="/chats"
              className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors text-muted-foreground hover:text-foreground"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-[10px] font-medium">Чаты</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
