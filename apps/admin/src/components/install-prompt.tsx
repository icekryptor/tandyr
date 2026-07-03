'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Chromium's install-prompt event. Not part of lib.dom (never standardized
 * beyond Chromium), so declared locally.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

const DISMISS_KEY = 'tandyr-install-dismissed';

/**
 * Dismissible "add to home screen" banner for the employee PWA.
 * Renders only after the browser fires `beforeinstallprompt`
 * (Chromium on Android; already-installed apps never fire it).
 */
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      if (window.localStorage.getItem(DISMISS_KEY) === '1') return;
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!installEvent) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setInstallEvent(null);
  };

  const install = async () => {
    await installEvent.prompt();
    await installEvent.userChoice;
    // Hide regardless of outcome: accepted → installing; dismissed → the
    // browser won't allow another prompt() on this stashed event anyway.
    setInstallEvent(null);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
          <span className="text-lg font-bold text-white">Т</span>
        </div>
        <p className="min-w-0 flex-1 text-sm text-foreground">
          Установите Tandyr на главный экран
        </p>
        <Button type="button" size="sm" onClick={install}>
          Установить
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Закрыть"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
