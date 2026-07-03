import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Нет соединения — Tandyr',
};

/**
 * Offline fallback, precached by the service worker (`public/sw.js`).
 * Must stay statically prerenderable — no cookies/auth here.
 * The retry control is a plain anchor (not a JS button): when offline,
 * the page's JS chunks may not be in cache, but a link click always
 * triggers a navigation, which the SW retries network-first.
 */
export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <WifiOff className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Нет соединения</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Проверьте интернет и обновите страницу
        </p>
        <a
          href="/employee"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Обновить
        </a>
      </div>
    </div>
  );
}
