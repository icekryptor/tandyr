'use client';

export function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
      {message}
    </div>
  );
}
