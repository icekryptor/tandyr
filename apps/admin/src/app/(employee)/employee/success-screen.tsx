import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

/** Full-screen success state with a link back to the hub (web analog of the mobile OK-alert). */
export function SuccessScreen({ title, text }: { title: string; text?: string }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-3">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <p role="status" className="text-lg font-bold text-foreground">
        {title}
      </p>
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
      <Link
        href="/employee"
        className="mt-4 w-full max-w-xs h-12 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
      >
        На главную
      </Link>
    </div>
  );
}
