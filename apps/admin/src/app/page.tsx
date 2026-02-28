import Link from 'next/link';
import { Monitor, Smartphone } from 'lucide-react';

export default function HubPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-3xl">Т</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">Tandyr</h1>
        <p className="text-muted-foreground mt-2">Система управления сменами пекарни</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl w-full">
        <Link
          href="/overview"
          className="group relative bg-card border border-border rounded-2xl p-8 hover:border-primary/40 hover:shadow-lg transition-all duration-200"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
            <Monitor className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Админ-панель</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Управление сотрудниками, магазинами, сменами, зарплатой и инвентарём
          </p>
          <div className="mt-5 inline-flex items-center text-sm font-medium text-primary">
            Открыть
            <svg className="ml-1.5 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        <Link
          href="/employee"
          className="group relative bg-card border border-border rounded-2xl p-8 hover:border-accent/40 hover:shadow-lg transition-all duration-200"
        >
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
            <Smartphone className="h-7 w-7 text-accent" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Приложение сотрудника</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Веб-версия мобильного приложения для тестирования клиентской части
          </p>
          <div className="mt-5 inline-flex items-center text-sm font-medium text-accent">
            Открыть
            <svg className="ml-1.5 h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

      <p className="text-xs text-muted-foreground mt-12">
        Tandyr v0.1.0 — Continuum
      </p>
    </div>
  );
}
