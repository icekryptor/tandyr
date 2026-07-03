import Link from 'next/link';

/**
 * Primary-colored screen header with a back link — mirrors the mobile
 * app's rounded-b-3xl header on every employee screen.
 */
export function ScreenHeader({
  title,
  subtitle,
  backHref = '/employee',
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
}) {
  return (
    <header className="bg-primary px-6 pt-4 pb-6 rounded-b-3xl">
      <Link
        href={backHref}
        className="inline-flex items-center min-h-11 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors"
      >
        ← Назад
      </Link>
      <h1 className="text-primary-foreground text-2xl font-extrabold">{title}</h1>
      {subtitle && <p className="text-primary-foreground/80 text-sm mt-1">{subtitle}</p>}
    </header>
  );
}
