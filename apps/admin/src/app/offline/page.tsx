import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Нет соединения — Tandyr',
};

/**
 * Offline fallback, precached by the service worker (`public/sw.js`).
 * Must stay statically prerenderable — no cookies/auth here.
 *
 * Styled EXCLUSIVELY with inline styles: the cached copy of this HTML can
 * outlive the CSS chunk hashes it was built with (the SW only re-installs
 * when sw.js changes), so it must render correctly with zero external CSS.
 *
 * The retry control is a plain anchor (not a JS button): when offline,
 * the page's JS chunks may not be in cache, but a link click always
 * triggers a navigation, which the SW retries network-first.
 */
export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F9FAFB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 384,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: '#F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            fontSize: 28,
          }}
          aria-hidden="true"
        >
          📡
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
          Нет соединения
        </h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginTop: 8 }}>
          Проверьте интернет и обновите страницу
        </p>
        <a
          href="/employee"
          style={{
            marginTop: 24,
            display: 'inline-flex',
            height: 44,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            background: '#E8564A',
            padding: '0 24px',
            fontSize: 14,
            fontWeight: 600,
            color: '#FFFFFF',
            textDecoration: 'none',
          }}
        >
          Обновить
        </a>
      </div>
    </div>
  );
}
