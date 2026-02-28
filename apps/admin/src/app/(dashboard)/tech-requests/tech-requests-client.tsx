'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Eye, PlayCircle, CheckCheck, CalendarClock,
  Wrench, AlertTriangle, Clock, DollarSign,
} from 'lucide-react';
import {
  updateTechRequestStatus, takeIntoWork, setDeadline, resolveRequest,
} from './actions';
import { formatDateTime, TECH_REQUEST_STATUS_LABELS, TECH_REQUEST_STATUS_COLORS } from '@tandyr/shared';
import type { TechRequest } from '@tandyr/shared';
import { InfoBox } from '@/components/info-box';

// Extended type — includes migration 013 fields (optional until migration is applied)
type ExtTechRequest = TechRequest & {
  user: { id: string; full_name: string; email: string } | null;
  store: { id: string; name: string } | null;
  assigned_to?: string | null;
  taken_at?: string | null;
  deadline?: string | null;
  resolution_photo_url?: string | null;
  resolution_description?: string | null;
  resolution_cost?: number | null;
  resolved_at?: string | null;
};

const STATUS_LABELS = TECH_REQUEST_STATUS_LABELS;
const STATUS_COLORS = TECH_REQUEST_STATUS_COLORS;

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <AlertTriangle className="h-3 w-3" />,
  in_progress: <Clock className="h-3 w-3" />,
  resolved: <CheckCheck className="h-3 w-3" />,
};

// ─── Detail body ───────────────────────────────────────────────────────────────
function TechRequestDetail({
  req, onUpdate,
}: {
  req: ExtTechRequest;
  onUpdate: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [deadlineVal, setDeadlineVal] = useState(req.deadline ?? '');

  const act = (fn: () => Promise<{ error?: string } | undefined>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      else onUpdate();
    });
  };

  const handleDeadlineSave = () => {
    if (!deadlineVal) return;
    act(() => setDeadline(req.id, deadlineVal));
  };

  const handleResolve = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const description = fd.get('description') as string;
    const photoUrl = fd.get('photo_url') as string;
    const costStr = fd.get('cost') as string;
    const cost = costStr ? parseFloat(costStr) : null;
    act(() => resolveRequest(req.id, {
      resolution_description: description,
      resolution_photo_url: photoUrl || undefined,
      resolution_cost: cost,
    }));
    setShowResolveForm(false);
  };

  return (
    <div className="space-y-5">
      {/* Basic info grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <InfoBox label="Сотрудник" value={req.user?.full_name ?? '—'} />
        <InfoBox label="Магазин" value={req.store?.name ?? '—'} />
        <InfoBox label="Создана" value={formatDateTime(req.created_at)} />
        <InfoBox label="Статус">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[req.status]}`}>
            {STATUS_ICONS[req.status]}
            {STATUS_LABELS[req.status]}
          </span>
        </InfoBox>
        {req.taken_at && <InfoBox label="Взято в работу" value={formatDateTime(req.taken_at)} />}
        {req.resolved_at && <InfoBox label="Завершено" value={formatDateTime(req.resolved_at)} />}
      </div>

      {/* Problem description */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Описание проблемы</p>
        <p className="text-sm bg-muted rounded-xl p-3 leading-relaxed">{req.description}</p>
      </div>

      {/* Photo from baker */}
      {req.photo_url && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Фото проблемы</p>
          <img src={req.photo_url} alt="Фото заявки" className="w-full rounded-xl object-cover max-h-60" />
        </div>
      )}

      {/* Deadline (only for pending/in_progress) */}
      {req.status !== 'resolved' && (
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> Срок выполнения
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={deadlineVal}
              onChange={(e) => setDeadlineVal(e.target.value)}
              className="h-8 text-sm max-w-[180px]"
            />
            <Button size="sm" variant="outline" onClick={handleDeadlineSave} disabled={isPending || !deadlineVal}>
              Сохранить
            </Button>
          </div>
        </div>
      )}

      {/* Take into work button (pending only) */}
      {req.status === 'pending' && (
        <div className="border-t border-border pt-4">
          <Button className="w-full" onClick={() => act(() => takeIntoWork(req.id))} disabled={isPending}>
            <PlayCircle className="h-4 w-4 mr-2" />
            Взять в работу
          </Button>
        </div>
      )}

      {/* Complete button (in_progress only) */}
      {req.status === 'in_progress' && !showResolveForm && (
        <div className="border-t border-border pt-4">
          <Button className="w-full" onClick={() => setShowResolveForm(true)}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Завершить заявку
          </Button>
        </div>
      )}

      {/* Resolution form */}
      {req.status === 'in_progress' && showResolveForm && (
        <form onSubmit={handleResolve} className="border-t border-border pt-4 space-y-4">
          <p className="text-sm font-semibold flex items-center gap-2">
            <CheckCheck className="h-4 w-4 text-green-600" />
            Отчёт о выполнении
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Описание выполненных работ <span className="text-destructive">*</span>
            </Label>
            <Textarea name="description" placeholder="Опишите что было сделано..." rows={3} required className="text-sm resize-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">URL фото отчёта</Label>
            <Input name="photo_url" type="url" placeholder="https://..." className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Стоимость работ (₽)
            </Label>
            <Input name="cost" type="number" step="0.01" min="0" placeholder="0" className="text-sm" />
            <p className="text-[10px] text-muted-foreground">Не отображается пекарю</p>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Сохранение...' : 'Сохранить и завершить'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowResolveForm(false)}>
              Отмена
            </Button>
          </div>
        </form>
      )}

      {/* Resolution details (resolved) */}
      {req.status === 'resolved' && (req.resolution_description || req.resolution_photo_url || req.resolution_cost != null) && (
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
            <CheckCheck className="h-3.5 w-3.5" /> Отчёт о выполнении
          </p>
          {req.resolution_description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Выполненные работы</p>
              <p className="text-sm bg-green-50 dark:bg-green-950/30 rounded-xl p-3 leading-relaxed">
                {req.resolution_description}
              </p>
            </div>
          )}
          {req.resolution_photo_url && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Фото отчёта</p>
              <img src={req.resolution_photo_url} alt="Фото выполненных работ" className="w-full rounded-xl object-cover max-h-60" />
            </div>
          )}
          {req.resolution_cost != null && (
            <div className="flex items-center justify-between bg-muted rounded-xl p-3">
              <p className="text-sm text-muted-foreground">Стоимость работ</p>
              <p className="text-sm font-bold">{req.resolution_cost.toLocaleString('ru-RU')} ₽</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-destructive text-sm mt-2">{error}</p>}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function TechRequestsClient({ requests }: { requests: ExtTechRequest[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ExtTechRequest | null>(null);

  const handleUpdate = () => {
    setSelected(null);
    router.refresh();
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Технические заявки</h1>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <p className="text-muted-foreground text-sm">{requests.length} всего</p>
          {pendingCount > 0 && (
            <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 px-2 py-0.5 rounded-full font-medium">
              {pendingCount} ожидают
            </span>
          )}
          {inProgressCount > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
              {inProgressCount} в работе
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Сотрудник</TableHead>
              <TableHead>Магазин</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead>Дедлайн</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  <Wrench className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p>Нет заявок</p>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => {
                const deadlineDate = req.deadline ? new Date(req.deadline) : null;
                const now = new Date();
                const isOverdue = deadlineDate && deadlineDate < now && req.status !== 'resolved';
                const isDueSoon = deadlineDate && !isOverdue && (deadlineDate.getTime() - now.getTime()) < 2 * 86400000;

                return (
                  <TableRow
                    key={req.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setSelected(req)}
                  >
                    <TableCell>
                      <p className="font-medium text-sm">{req.user?.full_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{req.user?.email}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {req.store?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs">
                      <p className="truncate">{req.description}</p>
                    </TableCell>
                    <TableCell>
                      {deadlineDate ? (
                        <span className={[
                          'text-xs font-medium',
                          isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-500' : 'text-muted-foreground',
                        ].join(' ')}>
                          {isOverdue ? '⚠ ' : ''}
                          {deadlineDate.toLocaleDateString('ru-RU')}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(req.created_at)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[req.status]}`}>
                        {STATUS_ICONS[req.status]}
                        {STATUS_LABELS[req.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); setSelected(req); }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Заявка #{selected?.id.slice(-6).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <TechRequestDetail req={selected} onUpdate={handleUpdate} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
