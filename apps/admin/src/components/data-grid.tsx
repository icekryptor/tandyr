'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutList, Sheet, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InlineValue } from '@tandyr/shared';

export type SaveCell = (value: InlineValue) => Promise<{ error?: string } | undefined>;

export function ViewToggle({ view }: { view: 'list' | 'table' }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const href = (v: 'list' | 'table') => {
    const next = new URLSearchParams(params);
    if (v === 'table') next.set('view', 'table');
    else next.delete('view');
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  const item = (v: 'list' | 'table', label: string, Icon: typeof Sheet) => (
    <Link
      href={href(v)}
      aria-current={view === v ? 'page' : undefined}
      className={cn(
        'flex items-center gap-1.5 px-3 h-8 rounded-md text-sm transition-colors',
        view === v ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted">
      {item('list', 'Список', LayoutList)}
      {item('table', 'Таблица', Sheet)}
    </div>
  );
}

/** Scrollable spreadsheet frame: sticky header row and sticky first column. */
export function GridTable({ columns, children }: { columns: { label: string; width: number }[]; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-auto max-h-[calc(100vh-13rem)]">
      <table className="table-fixed text-sm border-separate border-spacing-0" style={{ width: columns.reduce((s, c) => s + c.width, 0) }}>
        <colgroup>
          {columns.map((c) => <col key={c.label} style={{ width: c.width }} />)}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={c.label}
                className={cn(
                  'sticky top-0 z-10 bg-muted text-left font-medium text-muted-foreground text-xs px-2 py-2 border-b border-border whitespace-nowrap',
                  i === 0 && 'left-0 z-20',
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function GridCell({ sticky, className, children }: { sticky?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <td className={cn('border-b border-border p-0 align-middle', sticky && 'sticky left-0 z-[5] bg-card', className)}>
      {children}
    </td>
  );
}

type Status = { state: 'idle' | 'saving' | 'saved' } | { state: 'error'; message: string };

const cellBase =
  'w-full h-9 bg-transparent px-2 text-sm outline-none rounded-none border border-transparent ' +
  'hover:border-border focus:border-ring focus:bg-background';

function useCellSave(onSave: SaveCell) {
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const save = async (value: InlineValue): Promise<boolean> => {
    setStatus({ state: 'saving' });
    try {
      const res = await onSave(value);
      if (res?.error) {
        setStatus({ state: 'error', message: res.error });
        return false;
      }
      setStatus({ state: 'saved' });
      setTimeout(() => setStatus((s) => (s.state === 'saved' ? { state: 'idle' } : s)), 1200);
      return true;
    } catch {
      setStatus({ state: 'error', message: 'Не удалось сохранить' });
      return false;
    }
  };
  return { status, setStatus, save };
}

function StatusFrame({ status, children }: { status: Status; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'relative transition-colors',
        status.state === 'saved' && 'bg-green-500/10',
        status.state === 'error' && 'bg-destructive/10 ring-1 ring-inset ring-destructive',
      )}
      title={status.state === 'error' ? status.message : undefined}
    >
      {children}
      {status.state === 'saving' && (
        <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

/** Moves focus to the same column one row down, like Enter in a spreadsheet. */
function focusBelow(el: HTMLElement) {
  const col = el.dataset.col;
  const next = el.closest('tr')?.nextElementSibling?.querySelector<HTMLElement>(`[data-col="${col}"]`);
  next?.focus();
}

/**
 * Text-like cell. A draft exists only while the user's text differs from the server's;
 * after a successful save it is dropped, so the (normalised) server value shows again.
 */
export function TextCell({
  value, onSave, col, type = 'text', placeholder, list,
}: {
  value: string | number | null;
  onSave: SaveCell;
  col: string;
  type?: 'text' | 'email' | 'tel' | 'date' | 'number';
  placeholder?: string;
  list?: string;
}) {
  const base = value == null ? '' : String(value);
  const [draft, setDraft] = useState<string | null>(null);
  const inFlight = useRef<string | null>(null);
  const { status, setStatus, save } = useCellSave(onSave);
  const text = draft ?? base;

  const commit = async (el: HTMLInputElement) => {
    if (draft === null) return;
    // A half-typed number or date reads as "" — never save that as a cleared value.
    if (el.validity.badInput) {
      setStatus({ state: 'error', message: 'Некорректное значение — допишите или нажмите Esc' });
      return;
    }
    if (draft === base) {
      setDraft(null);
      return;
    }
    // Enter commits and moves focus, which blurs: the same text must not go out twice.
    if (draft === inFlight.current) return;
    const sent = draft;
    inFlight.current = sent;
    const ok = await save(sent);
    inFlight.current = null;
    // Keep whatever the user typed after this save started; a failed save keeps its text for fixing.
    if (ok) setDraft((d) => (d === sent ? null : d));
  };

  return (
    <StatusFrame status={status}>
      <input
        data-col={col}
        type={type}
        list={list}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(e.currentTarget);
            focusBelow(e.currentTarget);
          } else if (e.key === 'Escape') {
            setDraft(null);
            setStatus({ state: 'idle' });
            // Blur after the revert has rendered, so onBlur finds nothing to save.
            const el = e.currentTarget;
            requestAnimationFrame(() => el.blur());
          }
        }}
        className={cn(cellBase, type === 'number' && 'text-right tabular-nums')}
      />
    </StatusFrame>
  );
}

export function SelectCell({
  value, onSave, col, options, emptyLabel = '—',
}: {
  value: string | null;
  onSave: SaveCell;
  col: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  emptyLabel?: string | null;
}) {
  const { status, save } = useCellSave(onSave);
  const [pending, setPending] = useState<string | null>(null);
  const current = pending ?? value ?? '';
  return (
    <StatusFrame status={status}>
      <select
        data-col={col}
        value={current}
        onChange={async (e) => {
          const chosen = e.target.value;
          setPending(chosen);
          await save(chosen);
          // Saved: the server value now matches. Rejected: snap back — unless a newer choice is pending.
          setPending((p) => (p === chosen ? null : p));
        }}
        className={cn(cellBase, 'cursor-pointer pr-6')}
      >
        {emptyLabel != null && <option value="">{emptyLabel}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </StatusFrame>
  );
}
