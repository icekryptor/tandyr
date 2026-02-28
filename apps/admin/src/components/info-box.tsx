'use client';

export function InfoBox({
  label, value, children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-muted/40 rounded-lg p-2.5">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      {children ?? <p className="font-medium text-xs">{value ?? '—'}</p>}
    </div>
  );
}
