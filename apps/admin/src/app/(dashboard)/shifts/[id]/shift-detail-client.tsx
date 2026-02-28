'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft, MapPin, Clock, Package, Camera,
  Banknote, ShieldAlert, Hash, User, Store,
  CalendarClock, AlertCircle,
} from 'lucide-react';
import { setShiftFine, setShiftAccrual } from '../actions';
import { formatDateTime } from '@tandyr/shared';
import type { Shift } from '@tandyr/shared';

type ShiftFull = Shift & {
  user: { id: string; full_name: string; email: string } | null;
  store: { id: string; name: string } | null;
};

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm font-medium">{value ?? '—'}</div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children, action }: {
  icon: React.ElementType; title: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function PhotoCard({ url, label }: { url: string | null; label: string }) {
  if (!url) {
    return (
      <div className="aspect-video rounded-xl border border-dashed border-border flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Camera className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-2">{label}</p>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt={label}
          className="w-full rounded-xl object-cover max-h-64 hover:opacity-90 transition-opacity cursor-zoom-in"
        />
      </a>
    </div>
  );
}

function GeoBlock({ lat, lng, label }: { lat: number | null; lng: number | null; label: string }) {
  if (!lat || !lng) return <InfoRow label={label} value={null} />;
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-mono text-primary hover:underline"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </a>
    </div>
  );
}

function shiftDuration(start: string, end: string | null): string {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return '—';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
}

export function ShiftDetailClient({ shift }: { shift: ShiftFull }) {
  const [fineOpen, setFineOpen] = useState(false);
  const [accrualOpen, setAccrualOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleFine = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await setShiftFine(shift.id, fd);
      if (res?.error) setError(res.error);
      else setFineOpen(false);
    });
  };

  const handleAccrual = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await setShiftAccrual(shift.id, fd);
      if (res?.error) setError(res.error);
      else setAccrualOpen(false);
    });
  };

  const netAmount = (shift.accrual ?? 0) - (shift.fine ?? 0);
  const duration = shiftDuration(shift.start_time, shift.end_time);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <div className="flex items-center justify-between">
        <Link
          href="/shifts"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Все смены
        </Link>
      </div>

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <CalendarClock className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">
                Смена #{shift.shift_number ?? shift.id.slice(0, 6).toUpperCase()}
              </h1>
              <Badge
                className={
                  shift.status === 'open'
                    ? 'bg-green-100 text-green-700 hover:bg-green-100'
                    : 'bg-muted text-muted-foreground hover:bg-muted'
                }
              >
                {shift.status === 'open' ? 'Открыта' : 'Закрыта'}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
              {shift.user && (
                <Link
                  href={`/employees/${shift.user.id}`}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <User className="h-3.5 w-3.5" />
                  {shift.user.full_name}
                </Link>
              )}
              {shift.store && (
                <Link
                  href={`/stores/${shift.store.id}`}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Store className="h-3.5 w-3.5" />
                  {shift.store.name}
                </Link>
              )}
              {shift.production_kg != null && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  {shift.production_kg} кг
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {duration}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Hash className="h-3.5 w-3.5" />
                <span className="font-mono text-xs">{shift.id.slice(0, 8)}…</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Work data grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Opening */}
        <SectionCard icon={CalendarClock} title="Открытие смены">
          <div className="space-y-4">
            <InfoRow label="Дата и время" value={formatDateTime(shift.start_time)} />
            <GeoBlock lat={shift.start_lat} lng={shift.start_lng} label="Геолокация" />
            <PhotoCard url={shift.start_photo_url} label="Фото при открытии" />
          </div>
        </SectionCard>

        {/* Closing */}
        <SectionCard icon={CalendarClock} title="Закрытие смены">
          <div className="space-y-4">
            <InfoRow
              label="Дата и время"
              value={shift.end_time ? formatDateTime(shift.end_time) : null}
            />
            <GeoBlock lat={shift.end_lat} lng={shift.end_lng} label="Геолокация" />
            <PhotoCard url={shift.end_photo_url} label="Фото при закрытии" />
          </div>
        </SectionCard>
      </div>

      {/* Financials */}
      <SectionCard
        icon={Banknote}
        title="Финансы"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setAccrualOpen(true); setError(null); }}>
              Начислить
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive hover:text-white" onClick={() => { setFineOpen(true); setError(null); }}>
              <ShieldAlert className="h-3 w-3 mr-1" />
              Штраф
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-green-50 border border-green-100 p-4 text-center">
            <p className="text-[11px] text-green-700 mb-1">Начислено</p>
            <p className="text-xl font-bold text-green-700">
              {shift.accrual != null ? `${shift.accrual.toLocaleString('ru-RU')} ₽` : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-center">
            <p className="text-[11px] text-red-700 mb-1">Штраф</p>
            <p className="text-xl font-bold text-red-700">
              {shift.fine != null ? `${shift.fine.toLocaleString('ru-RU')} ₽` : '—'}
            </p>
            {shift.fine_reason && (
              <p className="text-[10px] text-red-600 mt-1 leading-tight">{shift.fine_reason}</p>
            )}
          </div>
          <div className={`rounded-xl border p-4 text-center ${netAmount >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
            <p className={`text-[11px] mb-1 ${netAmount >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>К перечислению</p>
            <p className={`text-xl font-bold ${netAmount >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              {(shift.accrual != null || shift.fine != null)
                ? `${netAmount.toLocaleString('ru-RU')} ₽`
                : '—'}
            </p>
          </div>
        </div>
        {shift.fine_comment && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-[11px] text-muted-foreground mb-1">Комментарий администратора</p>
            <p className="text-sm">{shift.fine_comment}</p>
          </div>
        )}
      </SectionCard>

      {/* Fine dialog */}
      <Dialog open={fineOpen} onOpenChange={setFineOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Назначить штраф
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFine} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Сумма штрафа (₽)</Label>
              <Input
                name="fine"
                type="number"
                step="0.01"
                min="0"
                defaultValue={shift.fine ?? ''}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Причина</Label>
              <Input
                name="fine_reason"
                defaultValue={shift.fine_reason ?? ''}
                placeholder="Опоздание, нарушение..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Комментарий администратора</Label>
              <textarea
                name="fine_comment"
                defaultValue={shift.fine_comment ?? ''}
                placeholder="Подробное описание..."
                className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <div className="flex gap-2">
              {shift.fine != null && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={isPending}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set('fine', '');
                    fd.set('fine_reason', '');
                    fd.set('fine_comment', '');
                    startTransition(async () => {
                      await setShiftFine(shift.id, fd);
                      setFineOpen(false);
                    });
                  }}
                >
                  Снять штраф
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Accrual dialog */}
      <Dialog open={accrualOpen} onOpenChange={setAccrualOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-green-600" />
              Начисление за смену
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAccrual} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Сумма (₽)</Label>
              <Input
                name="accrual"
                type="number"
                step="0.01"
                min="0"
                defaultValue={shift.accrual ?? ''}
                placeholder="0"
                required
              />
            </div>
            {shift.production_kg != null && (
              <p className="text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                Выработка: {shift.production_kg} кг
              </p>
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
