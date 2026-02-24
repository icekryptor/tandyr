'use client';

import { useState, useTransition } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import { updateTechRequestStatus } from './actions';
import { formatDateTime } from '@tandyr/shared';
import type { TechRequest } from '@tandyr/shared';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  in_progress: 'В работе',
  resolved: 'Решено',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
};

export function TechRequestsClient({
  requests,
}: {
  requests: (TechRequest & { user: { full_name: string; email: string } | null })[];
}) {
  const [selected, setSelected] = useState<(typeof requests)[0] | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => { await updateTechRequestStatus(id, status); });
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Технические заявки</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {requests.length} заявок{pendingCount > 0 && ` · ${pendingCount} ожидают`}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Сотрудник</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  Нет заявок
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{req.user?.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{req.user?.email}</p>
                  </TableCell>
                  <TableCell className="text-sm max-w-xs">
                    <p className="truncate">{req.description}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(req.created_at)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={req.status}
                      onValueChange={(v) => handleStatusChange(req.id, v)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-7 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelected(req)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Детали заявки</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Сотрудник</p>
                  <p className="font-medium mt-0.5">{selected.user?.full_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Дата</p>
                  <p className="font-medium mt-0.5">{formatDateTime(selected.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Статус</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${STATUS_COLORS[selected.status]}`}>
                    {STATUS_LABELS[selected.status]}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Описание</p>
                <p className="text-sm bg-muted rounded-lg p-3">{selected.description}</p>
              </div>
              {selected.photo_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Фото</p>
                  <img
                    src={selected.photo_url}
                    alt="Фото заявки"
                    className="w-full rounded-xl object-cover max-h-60"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
