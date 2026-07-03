import { InstallPrompt } from '@/components/install-prompt';

/**
 * Employee PWA layout: a plain mobile-first column. On phones it is
 * full-width; on desktop it renders as a centered max-w-md column.
 * (The old desktop "phone frame" simulator is gone — this route group
 * now IS the production employee client for Android browsers.)
 */
export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md">{children}</div>
      <InstallPrompt />
    </div>
  );
}
